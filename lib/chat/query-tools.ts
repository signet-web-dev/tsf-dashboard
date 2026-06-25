import type { createClient } from "@/lib/supabase/server";
import { bestMatches } from "./fuzzy";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function resolveMonthRange(month?: string): { start: string; end: string } {
  const base = month ? new Date(`${month}-01T00:00:00Z`) : new Date();
  const year = base.getUTCFullYear();
  const monthIndex = base.getUTCMonth();
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export async function getAdSpend(
  supabase: SupabaseClient,
  args: { platform?: string; month?: string }
) {
  const { start, end } = resolveMonthRange(args.month);

  let campaignsQuery = supabase
    .from("tsf_marketing_campaigns")
    .select("spend, platform, week_start")
    .gte("week_start", start)
    .lte("week_start", end);
  let ssplQuery = supabase
    .from("sspl_weekly_performance")
    .select("ad_spend, platform, week_start")
    .gte("week_start", start)
    .lte("week_start", end);

  if (args.platform) {
    campaignsQuery = campaignsQuery.ilike("platform", `%${args.platform}%`);
    ssplQuery = ssplQuery.ilike("platform", `%${args.platform}%`);
  }

  const [{ data: campaigns }, { data: sspl }] = await Promise.all([campaignsQuery, ssplQuery]);

  const tsfMarketingSpend = (campaigns ?? []).reduce((sum, r) => sum + (r.spend ?? 0), 0);
  const ssplAdSpend = (sspl ?? []).reduce((sum, r) => sum + (r.ad_spend ?? 0), 0);

  return {
    period: { start, end },
    platform: args.platform ?? "all",
    tsf_marketing_spend: tsfMarketingSpend,
    sspl_ad_spend: ssplAdSpend,
    total: tsfMarketingSpend + ssplAdSpend,
  };
}

export async function getSalesSummary(
  supabase: SupabaseClient,
  args: { channel?: string; month?: string }
) {
  const { start, end } = resolveMonthRange(args.month);

  let ordersQuery = supabase
    .from("orders")
    .select("order_value, channel, order_date")
    .gte("order_date", start)
    .lte("order_date", end);

  if (args.channel) {
    ordersQuery = ordersQuery.ilike("channel", `%${args.channel}%`);
  }

  const { data: orders } = await ordersQuery;
  const totalSales = (orders ?? []).reduce((sum, r) => sum + (r.order_value ?? 0), 0);

  return {
    period: { start, end },
    channel: args.channel ?? "all",
    order_count: (orders ?? []).length,
    total_sales: totalSales,
  };
}

// sspl_monthly_sales.month is stored as the first day of the month (e.g. "2026-05-01").
function resolveMonthKey(month?: string): string {
  const base = month ? new Date(`${month}-01T00:00:00Z`) : new Date();
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

// Profit/COGS only exists in the SSPL factory sales ledger - this is the source the
// "Consolidated P&L" and "SSPL · Sales & Unit Economics" pages use. It is a separate
// ledger from the TSF CRM `orders` table (see get_sales_summary) - the two don't overlap.
export async function getChannelPnl(supabase: SupabaseClient, args: { channel?: string; month?: string }) {
  const month = resolveMonthKey(args.month);

  let query = supabase
    .from("sspl_monthly_sales")
    .select("channel, sales, cogs, gross_profit")
    .eq("month", month);

  if (args.channel) {
    query = query.ilike("channel", `%${args.channel}%`);
  }

  const { data } = await query;
  const rows = data ?? [];

  return {
    entity: "SSPL",
    month,
    channel: args.channel ?? "all",
    sales: rows.reduce((sum, r) => sum + (r.sales ?? 0), 0),
    cogs: rows.reduce((sum, r) => sum + (r.cogs ?? 0), 0),
    gross_profit: rows.reduce((sum, r) => sum + (r.gross_profit ?? 0), 0),
    by_channel: rows,
  };
}

// Below this, a name match is too weak to trust (e.g. two customers sharing only a
// generic word like "customer") and would otherwise attach an order to the wrong person.
const MIN_NAME_MATCH_SCORE = 0.5;

export async function findCustomer(supabase: SupabaseClient, args: { query: string; phone?: string }) {
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, phone, location, address, status, total_orders, total_value, last_order_date");

  const digitsOnlyQuery = (args.phone ?? args.query).replace(/\D/g, "");
  const phoneMatches =
    digitsOnlyQuery.length >= 4
      ? (customers ?? []).filter((c) => c.phone && c.phone.replace(/\D/g, "").includes(digitsOnlyQuery))
      : [];

  const nameMatches = bestMatches(args.query, customers ?? [], (c) => c.name ?? "", 5)
    .filter((m) => m.score >= MIN_NAME_MATCH_SCORE)
    .map((m) => m.item);

  const seen = new Set<string>();
  const results = [...phoneMatches, ...nameMatches].filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  return { candidates: results.slice(0, 5) };
}

export async function getOrderHistory(
  supabase: SupabaseClient,
  args: { customer_id?: string; phone?: string; limit?: number }
) {
  let query = supabase
    .from("orders")
    .select("id, order_date, products, order_value, channel, delivery_status")
    .order("order_date", { ascending: false })
    .limit(args.limit ?? 10);

  if (args.customer_id) query = query.eq("customer_id", args.customer_id);
  else if (args.phone) query = query.eq("phone", args.phone);
  else return { orders: [] };

  const { data: orders } = await query;
  return { orders: orders ?? [] };
}

export async function findSku(supabase: SupabaseClient, args: { query: string }) {
  const { data: skus } = await supabase
    .from("skus")
    .select("id, name, oil_type, size_litres, price, current_stock_litres");

  const byName = bestMatches(args.query, skus ?? [], (s) => s.name ?? "", 10);
  const byOilType = bestMatches(args.query, skus ?? [], (s) => s.oil_type ?? "", 10);

  const seen = new Set<string>();
  const combined = [...byName, ...byOilType]
    .sort((a, b) => b.score - a.score)
    .map((m) => m.item)
    .filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

  return { candidates: combined.slice(0, 8) };
}
