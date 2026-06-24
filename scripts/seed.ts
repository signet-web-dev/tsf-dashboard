import path from "node:path";
import * as XLSX from "xlsx";
import { config } from "dotenv";

// plain `dotenv/config` only loads `.env`, not `.env.local` (that's a
// Next.js-specific convention), so point it at the file explicitly.
config({ path: path.join(__dirname, "..", ".env.local") });

import { createServiceRoleClient } from "../lib/supabase/server";

const DATA_DIR = path.join(__dirname, "..", "data");

const KNOWN_OIL_TYPES = ["Groundnut", "Sesame", "Coconut", "Avocado", "Mustard", "Safflower", "Sunflower", "Deepam"];

function normalizePhone(raw: unknown): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

// xlsx's `cellDates: true` builds Date objects that get timezone-shifted by a
// day depending on the host's offset, so we read raw serials instead and
// convert with the same UTC-anchored formula as lib/utils/dates.ts.
function toISODate(value: unknown): string | null {
  if (typeof value !== "number") return null;
  const utcDays = Math.floor(value - 25569);
  return new Date(utcDays * 86400 * 1000).toISOString().slice(0, 10);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseSizeLitres(name: string): number | null {
  const paren = name.match(/\(([\d.]+)\s*L\)/i);
  if (paren) return parseFloat(paren[1]);
  const multiplier = name.match(/x\s*([\d.]+)\s*L\b/i);
  if (multiplier) return parseFloat(multiplier[1]);
  return null;
}

function parseOilType(name: string): string | null {
  const found = KNOWN_OIL_TYPES.find((oil) => name.toLowerCase().startsWith(oil.toLowerCase()));
  return found ?? null;
}

// Finds an oil type anywhere in the string (not just as a prefix) - needed for
// inventory/litres tables where the oil name isn't always the first word.
function findOilType(text: string): string | null {
  const found = KNOWN_OIL_TYPES.find((oil) => text.toLowerCase().includes(oil.toLowerCase()));
  return found ?? null;
}

// Handles the Indian-format strings ("1,25,923.29"), the "-" placeholder for
// zero/blank, and unit-suffixed quantities ("330 ltr", "1108 kgs") that show
// up throughout both Fin Sheet workbooks.
function parseNum(value: unknown): number | null {
  if (value === null || value === undefined || value === "-") return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    // Anchored to the start: "330 ltr" and "1,25,923.29" should parse, but
    // free-text notes like "Per ltr - 825" or "total COGS - 68062" (where the
    // number is buried mid-string, not the value itself) must come back null.
    const match = value.replace(/,/g, "").trim().match(/^-?[\d.]+/);
    if (!match) return null;
    const n = Number(match[0]);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

// DD/MM/YYYY, as used in the TSF Inventory sheet's snapshot date cell.
function parseDDMMYYYY(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function monthDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

// Reads a sheet as a raw 0-indexed grid (row, col) for the side-by-side,
// multi-block layouts in the Fin Sheet workbooks that don't fit a flat header row.
function getGrid(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
}

// ─────────────────────────────────────────
// CRM Sheet - TSF
// ─────────────────────────────────────────

function parseCustomers(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets["Customers"];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  return rows
    .filter((r) => r["Customer ID"])
    .map((r) => {
      const totalOrders = Number(r["Total number of times Ordered"]) || 0;
      const cycleRaw = r["Cycle Duration"];
      const cycleDuration = typeof cycleRaw === "number" ? cycleRaw : null;
      const status = typeof r["Status"] === "string" ? r["Status"] : totalOrders === 0 ? "Prospect" : "Active";

      return {
        id: String(r["Customer ID"]).trim(),
        name: String(r["Name"] ?? "").trim() || "Unknown",
        phone: normalizePhone(r["Phone"]),
        location: (r["Location"] as string) || null,
        address: (r["Address"] as string) || null,
        status,
        notes: (r["Notes"] as string) || null,
        custom_cycle_days: typeof r["Custom Override Cycle (Days)"] === "number" ? r["Custom Override Cycle (Days)"] : null,
        total_orders: totalOrders,
        total_value: Number(r["Total Value (₹)"]) || 0,
        last_order_date: totalOrders > 0 ? toISODate(r["Last Order Date"]) : null,
        cycle_duration: cycleDuration,
      };
    });
}

function parseOrders(workbook: XLSX.WorkBook, phoneToCustomerId: Map<string, string>) {
  const sheet = workbook.Sheets["Orders"];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  return rows
    .filter((r) => r["Order ID"])
    .map((r) => {
      const phone = normalizePhone(r["Phone"]);
      const deliveryStatusRaw = (r["Delivery Status"] as string) ?? "Pending";
      const deliveryStatus = deliveryStatusRaw.toLowerCase() === "cancelled" ? "Cancelled" : deliveryStatusRaw;

      // "Reference Number / ID" here is payment-reference free text (UTR numbers,
      // "Cash - Preetham", "Razorpay"...) entered by hand, not a structured external
      // order ID - it collides across rows, so it goes in notes, not reference_id.
      // reference_id is reserved for the Shopify/Amazon dedup key set by the webhooks.
      const paymentRef = r["Reference Number / ID"] ? String(r["Reference Number / ID"]).trim() : null;
      const notesParts = [(r["Notes"] as string) || null, paymentRef].filter(Boolean);

      return {
        id: String(r["Order ID"]).trim(),
        customer_id: phone ? phoneToCustomerId.get(phone) ?? null : null,
        customer_name: (r["Customer Name"] as string) || null,
        phone,
        order_date: toISODate(r["Order Date"]),
        products: (r["Product"] as string) || null,
        order_value: Number(r["Order Value (₹)"]) || 0,
        amount_paid: Number(r["Amount Paid (₹)"]) || 0,
        reminder_date: toISODate(r["Reminder Date"]),
        delivery_status: deliveryStatus,
        channel: "WhatsApp", // CRM sheet has no channel column; these are the manual/personal-network sales
        warehouse: (r["Sent From Which Warehouse"] as string)?.trim() || null,
        notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
        reference_id: null,
      };
    });
}

function parseSkus(workbook: XLSX.WorkBook) {
  // Price + cycle days live in a side-table embedded in the Orders sheet (cols Z:AB)
  const ordersSheet = workbook.Sheets["Orders"];
  const priceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ordersSheet, {
    defval: null,
    range: "Z3:AB42",
    header: ["name", "price", "cycle_days"],
  });

  // Current stock-on-hand lives in the SKU Wise sale setup sheet
  const stockSheet = workbook.Sheets["SKU Wise sale setup"];
  const stockRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(stockSheet, { defval: null });
  const stockByName = new Map<string, { multiplier: number | null; totalLitres: number | null }>();
  stockRows.forEach((r) => {
    const name = (r["Name"] as string)?.trim();
    if (!name) return;
    stockByName.set(name.toLowerCase(), {
      multiplier: typeof r["Multiplier"] === "number" ? r["Multiplier"] : null,
      totalLitres: typeof r["Total Quantity in Ltrs"] === "number" ? r["Total Quantity in Ltrs"] : null,
    });
  });

  return priceRows
    .filter((r) => r["name"])
    .map((r) => {
      const name = String(r["name"]).trim();
      const stock = stockByName.get(name.toLowerCase());
      const sizeLitres = parseSizeLitres(name) ?? stock?.multiplier ?? null;

      return {
        id: slugify(name),
        name,
        oil_type: parseOilType(name),
        size_litres: sizeLitres,
        price: Number(r["price"]) || 0,
        standard_cycle_days: typeof r["cycle_days"] === "number" ? r["cycle_days"] : null,
        current_stock_litres: stock?.totalLitres ?? 0,
      };
    });
}

// ─────────────────────────────────────────
// Fin Sheet - SSPL
// ─────────────────────────────────────────

const SSPL_CHANNELS = ["Ecommerce", "Whatsapp", "B2B", "Store", "Website"];

function parseSsplMonthlySales(workbook: XLSX.WorkBook) {
  const grid = getGrid(workbook.Sheets["Sales and Unit Economics (Month"]);
  const rows: Record<string, unknown>[] = [];

  for (let r = 0; r < grid.length; r++) {
    if (grid[r]?.[2] !== "Channel") continue;
    const month = toISODate(grid[r - 1]?.[2]);
    if (!month) continue;

    for (let offset = 1; offset <= SSPL_CHANNELS.length; offset++) {
      const row = grid[r + offset];
      if (!row) continue;
      const channel = row[2];
      const sales = parseNum(row[3]);
      if (!channel || sales === null) continue;

      rows.push({
        entity: "SSPL",
        month,
        channel: channel === "Whatsapp" ? "WhatsApp" : channel,
        sales,
        gst_on_sales: parseNum(row[4]) ?? 0,
        returns_loss: parseNum(row[5]) ?? 0,
        reimbursements: parseNum(row[6]) ?? 0,
        promotions: parseNum(row[7]) ?? 0,
        delivery_fees: parseNum(row[8]) ?? 0,
        fba_selling_fees: parseNum(row[9]) ?? 0,
        fba_transaction_fees: parseNum(row[10]) ?? 0,
        fba_inventory_fees: parseNum(row[11]) ?? 0,
        other_transaction_fees: parseNum(row[12]) ?? 0,
        cost_of_advertising: parseNum(row[13]) ?? 0,
        units_sold: parseNum(row[14]) ?? 0,
        cogs: parseNum(row[15]) ?? 0,
        gross_profit: parseNum(row[16]) ?? 0,
        payments_received: parseNum(row[18]) ?? 0,
      });
    }
  }

  return rows;
}

// "Monthly SKU Wise Offline Sales" side-table (cols U:V) - the closest proxy
// available for litres_produced per oil type; there's no separate production
// volume figure in the sheet, so offline sales volume stands in for it.
function parseSsplLitresByOilType(workbook: XLSX.WorkBook, monthMarkerCol: number): Map<string, number> {
  const grid = getGrid(workbook.Sheets["Sales and Unit Economics (Month"]);
  const litresByOil = new Map<string, number>();

  for (let r = 0; r < grid.length; r++) {
    if (grid[r]?.[monthMarkerCol] !== "Seed type") continue;
    for (let i = r + 1; i < grid.length; i++) {
      const label = grid[i]?.[monthMarkerCol];
      const litres = parseNum(grid[i]?.[monthMarkerCol + 1]);
      if (label === "SUM" || !label) break;
      const oilType = findOilType(String(label));
      if (oilType && litres !== null) litresByOil.set(oilType, litres);
    }
  }

  return litresByOil;
}

const SSPL_UNIT_ECON_OILS = [
  { col: 3, oilType: "Groundnut" },
  { col: 4, oilType: "Sesame" },
  { col: 5, oilType: "Mustard" },
  { col: 6, oilType: "Coconut" },
  { col: 7, oilType: "Safflower" },
  { col: 8, oilType: "Sunflower" },
  { col: 9, oilType: "Avocado" },
];

function parseSsplUnitEconomics(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets["Sales and Unit Economics (Month"];
  const grid = getGrid(sheet);
  const litresByOil = parseSsplLitresByOilType(workbook, 20); // column U

  // The per-oil cost breakdown at the top of the sheet isn't dated itself -
  // it's introduced by the "MAY" label at A2, so it applies to May.
  const month = monthDate(2026, 5);

  return SSPL_UNIT_ECON_OILS.map(({ col, oilType }) => {
    const rawMaterialKg = parseNum(grid[3]?.[col]);
    const packagingCost = parseNum(grid[4]?.[col]);
    const rentAllocated = parseNum(grid[5]?.[col]);
    const electricityAllocated = parseNum(grid[6]?.[col]);
    const salariesAllocated = parseNum(grid[7]?.[col]);
    const packagingAllocated = parseNum(grid[8]?.[col]);
    const logisticsAllocated = parseNum(grid[9]?.[col]);
    const bankInterestAllocated = parseNum(grid[10]?.[col]);
    const marketingAllocated = parseNum(grid[11]?.[col]);
    const othersAllocated = parseNum(grid[12]?.[col]);

    const totalCogs = [
      packagingCost,
      rentAllocated,
      electricityAllocated,
      salariesAllocated,
      packagingAllocated,
      logisticsAllocated,
      bankInterestAllocated,
      marketingAllocated,
      othersAllocated,
    ].reduce((sum: number, v) => sum + (v ?? 0), 0);

    const litresProduced = litresByOil.get(oilType) ?? null;

    return {
      month,
      oil_type: oilType,
      raw_material_kg: rawMaterialKg,
      packaging_cost: packagingCost,
      rent_allocated: rentAllocated,
      electricity_allocated: electricityAllocated,
      salaries_allocated: salariesAllocated,
      packaging_allocated: packagingAllocated,
      logistics_allocated: logisticsAllocated,
      bank_interest_allocated: bankInterestAllocated,
      marketing_allocated: marketingAllocated,
      others_allocated: othersAllocated,
      total_cogs: totalCogs,
      litres_produced: litresProduced,
      cost_per_litre: litresProduced ? totalCogs / litresProduced : null,
    };
  });
}

const SSPL_EXPENSE_CATEGORIES = ["RawMaterial", "Packaging", "Operations", "Logistics", "BankInterest", "Marketing", "Other"];

function categorizeSsplParticulars(particulars: string): string {
  const p = particulars.toLowerCase();
  if (/seed|coconuts?\b|ingredient/.test(p)) return "RawMaterial";
  if (/packing|label|printing|stationary/.test(p)) return "Packaging";
  if (/transportation/.test(p)) return "Logistics";
  if (/term loan|od loan|intrest|interest/.test(p)) return "BankInterest";
  if (/ad solutions|meta ads|promossion|promotion/.test(p)) return "Marketing";
  return "Operations";
}

function parseSsplExpenses(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets["Purchases and Expenses (Weekly)"];
  const grid = getGrid(sheet);

  const monthlyExpenses: Record<string, unknown>[] = [];
  SSPL_EXPENSE_CATEGORIES.forEach((category, i) => {
    const actual = parseNum(grid[1 + i]?.[1]); // col B = May actuals
    if (actual !== null) {
      monthlyExpenses.push({ entity: "SSPL", month: monthDate(2026, 5), category, actual, budgeted: null });
    }
  });

  // Rent/Electricity/Salaries have no row in this sheet's category summary -
  // they only exist as flat monthly totals in the Sales and Unit Economics
  // sheet (col B, rows 6-8), which the CM1/CM2/CM3/Net formulas there depend on.
  const unitEconGrid = getGrid(workbook.Sheets["Sales and Unit Economics (Month"]);
  [
    { category: "Rent", row: 5 },
    { category: "Electricity", row: 6 },
    { category: "Salaries", row: 7 },
  ].forEach(({ category, row }) => {
    const actual = parseNum(unitEconGrid[row]?.[1]);
    if (actual !== null) {
      monthlyExpenses.push({ entity: "SSPL", month: monthDate(2026, 5), category, actual, budgeted: null });
    }
  });

  const transactions: Record<string, unknown>[] = [];
  for (let r = 11; r < grid.length; r++) {
    const date = toISODate(grid[r]?.[0]);
    const particulars = grid[r]?.[1];
    if (!date || typeof particulars !== "string") continue;

    transactions.push({
      entity: "SSPL",
      date,
      particulars,
      vch_type: grid[r]?.[2] ?? null,
      vch_no: grid[r]?.[3] != null ? String(grid[r][3]) : null,
      debit: parseNum(grid[r]?.[4]) ?? 0,
      category: categorizeSsplParticulars(particulars),
      month: `${date.slice(0, 7)}-01`,
    });
  }

  return { monthlyExpenses, transactions };
}

function parseSsplWeeklyPerformance(workbook: XLSX.WorkBook) {
  const grid = getGrid(workbook.Sheets["Performance Reports (Weekly)"]);
  // Row indices are 0-based; sheet rows 5/6/8 etc -> grid[4]/[5]/[7].
  const weeklyEcommerceSales = parseNum(grid[4]?.[1]);
  const weeklyWhatsappSales = parseNum(grid[5]?.[1]);
  const weeklyB2bSales = parseNum(grid[7]?.[1]);
  const weeklyStoreSales = parseNum(grid[6]?.[1]);

  const adSaleAmount = parseNum(grid[12]?.[1]);
  if (adSaleAmount === null) return []; // nothing reported for this week yet

  return [
    {
      entity: "SSPL",
      week_start: monthDate(2026, 6), // sheet's own date marker for this block
      platform: "Amazon",
      weekly_ecommerce_sales: weeklyEcommerceSales,
      weekly_whatsapp_sales: weeklyWhatsappSales,
      weekly_b2b_sales: weeklyB2bSales,
      weekly_store_sales: weeklyStoreSales,
      ad_sale_amount: adSaleAmount,
      ad_spend: parseNum(grid[13]?.[1]),
      impressions: parseNum(grid[14]?.[1]),
      roas: parseNum(grid[15]?.[1]),
      acos: parseNum(grid[16]?.[1]),
      tacos: parseNum(grid[17]?.[1]),
      cpc: parseNum(grid[18]?.[1]),
      ctr: parseNum(grid[19]?.[1]),
      cvr: parseNum(grid[22]?.[1]),
      ntb_orders: parseNum(grid[20]?.[1]),
      brand_share_pct: parseNum(grid[21]?.[1]),
      followers_growth_rate: parseNum(grid[27]?.[1]),
      engagement_rate: parseNum(grid[26]?.[1]),
    },
  ];
}

function parseSsplCashflowSnapshot(workbook: XLSX.WorkBook) {
  const grid = getGrid(workbook.Sheets["Cashflow Statement (Weekly+mont"]);

  return [
    {
      entity: "SSPL",
      week_start: "2026-06-07", // "7th - 13th" per the sheet's own label
      cash_in_bank: parseNum(grid[3]?.[1]),
      finished_goods_value: parseNum(grid[4]?.[1]),
      raw_material_value: parseNum(grid[6]?.[1]),
      receivables: parseNum(grid[7]?.[1]),
      payables: parseNum(grid[8]?.[1]),
      net_working_capital: parseNum(grid[9]?.[1]),
      inventory_turnover: parseNum(grid[5]?.[1]),
      inventory_days: parseNum(grid[14]?.[1]),
      receivable_days: parseNum(grid[15]?.[1]),
      payable_days: parseNum(grid[16]?.[1]),
      cash_conversion_cycle: parseNum(grid[17]?.[1]),
      red_flags: [grid[24]?.[1], grid[25]?.[1]].filter((v): v is string => typeof v === "string"),
    },
  ];
}

function parseSsplMonthlyTargets(workbook: XLSX.WorkBook) {
  const grid = getGrid(workbook.Sheets["Targets & Budget Caps (Monthly)"]);
  const notes = [grid[13]?.[2], grid[14]?.[2], grid[15]?.[2], grid[17]?.[2]]
    .filter((v): v is string => typeof v === "string")
    .join("; ");

  return [
    {
      entity: "SSPL",
      month: monthDate(2026, 6),
      target_ecommerce: parseNum(grid[2]?.[1]),
      target_whatsapp: parseNum(grid[3]?.[1]),
      target_store: parseNum(grid[4]?.[1]),
      target_b2b: parseNum(grid[5]?.[1]),
      target_website: parseNum(grid[6]?.[1]),
      budget_raw_material: parseNum(grid[2]?.[3]),
      budget_packaging: parseNum(grid[3]?.[3]),
      budget_operations: parseNum(grid[4]?.[3]),
      budget_logistics: parseNum(grid[5]?.[3]),
      budget_bank_interest: parseNum(grid[6]?.[3]),
      budget_marketing: parseNum(grid[7]?.[3]),
      budget_other: parseNum(grid[8]?.[3]),
      notable_inventory_notes: notes || null,
    },
  ];
}

// The Targets sheet's June budget caps are the only "budgeted" figures
// available; actuals for May come from parseSsplExpenses above. They're for
// different months because the source data simply hasn't caught up yet.
function parseSsplBudgetedExpenses(workbook: XLSX.WorkBook) {
  const grid = getGrid(workbook.Sheets["Targets & Budget Caps (Monthly)"]);
  const categoryToRow: Record<string, number> = {
    RawMaterial: 2,
    Packaging: 3,
    Operations: 4,
    Logistics: 5,
    BankInterest: 6,
    Marketing: 7,
    Other: 8,
  };

  const rows: Record<string, unknown>[] = [];
  SSPL_EXPENSE_CATEGORIES.forEach((category) => {
    const row = grid[categoryToRow[category]];
    const budgeted = parseNum(row?.[3]);
    if (budgeted !== null) rows.push({ entity: "SSPL", month: monthDate(2026, 6), category, budgeted, actual: null });
  });
  return rows;
}

// ─────────────────────────────────────────
// Fin Sheet - TSF
// ─────────────────────────────────────────
//
// Two tabs in this workbook are skipped entirely: "Unit Economics" is a mostly-empty
// ~76-column template, and "Cashflow Statement (Weekly)" / "Targets & Budget Caps
// (Monthly)" turned out to be byte-identical copies of the SSPL versions (and have
// no TSF-specific table in the schema anyway).

function parseTsfFixedExpenses(workbook: XLSX.WorkBook) {
  const grid = getGrid(workbook.Sheets["Company Finance Structure"]);
  const rows: Record<string, unknown>[] = [];

  for (let r = 2; r <= 8; r++) {
    const item = grid[r]?.[0];
    const amount = parseNum(grid[r]?.[2]);
    if (typeof item === "string" && amount !== null) {
      rows.push({ cost_type: "FixedExpense", department: "Factory", item, amount, funding_source: null, notes: null });
    }
  }

  for (let r = 2; r <= 9; r++) {
    const item = grid[r]?.[4];
    const amount = parseNum(grid[r]?.[5]);
    if (typeof item === "string" && amount !== null) {
      rows.push({ cost_type: "FixedExpense", department: "ExperienceCentre", item, amount, funding_source: null, notes: null });
    }
  }

  return rows;
}

function parseTsfCapitalDeployment(workbook: XLSX.WorkBook) {
  const grid = getGrid(workbook.Sheets["Company Finance Structure"]);
  const rows: Record<string, unknown>[] = [];

  for (let r = 23; r <= 41; r++) {
    const item = grid[r]?.[0];
    const amount = parseNum(grid[r]?.[2]);
    if (typeof item === "string" && amount !== null) {
      rows.push({
        cost_type: "CapitalDeployment",
        department: null,
        item,
        amount,
        funding_source: (grid[r]?.[3] as string) ?? null,
        notes: null,
      });
    }
  }

  return rows;
}

function parseTsfCogsMoM(workbook: XLSX.WorkBook) {
  const grid = getGrid(workbook.Sheets["Company Finance Structure"]);
  const rows: Record<string, unknown>[] = [];

  for (let r = 44; r <= 50; r++) {
    const item = grid[r]?.[0];
    if (typeof item !== "string") continue;
    const rawAmount = grid[r]?.[2];
    const amount = parseNum(rawAmount);
    const notes = amount === null && typeof rawAmount === "string" ? rawAmount : null;
    if (amount === null && notes === null) continue; // nothing to show for this row

    rows.push({ cost_type: "COGSMoM", department: null, item, amount, funding_source: null, notes });
  }

  return rows;
}

const POA_STREAM_ALIASES: Record<string, string> = {
  "B2C": "B2C",
  "B2C + Store Sales": "B2C",
  "Ecommerce": "Ecommerce",
  "Experience Centre - Cafe": "ExperienceCentre",
  "Cafe food": "ExperienceCentre",
};

function parseTsfMonthlyPoa(workbook: XLSX.WorkBook) {
  const grid = getGrid(workbook.Sheets["Company Finance Structure"]);
  const rows: Record<string, unknown>[] = [];

  for (let r = 0; r < grid.length; r++) {
    const marker = grid[r]?.[7]; // col H
    if (typeof marker !== "string" || !/POA$/i.test(marker)) continue;

    const monthName = marker.replace(/POA/i, "").trim().toLowerCase();
    const monthIndex = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].indexOf(monthName);
    if (monthIndex === -1) continue;
    const month = monthDate(2026, monthIndex + 1);

    for (let i = r + 1; i <= r + 10 && i < grid.length; i++) {
      if (typeof grid[i]?.[7] === "string" && /POA$/i.test(grid[i]?.[7] as string) && i !== r) break;
      const streamLabel = grid[i]?.[7] as string | null;
      const revenue = parseNum(grid[i]?.[8]);
      if (!streamLabel || revenue === null) continue;
      const revenueStream = POA_STREAM_ALIASES[streamLabel];
      if (!revenueStream) continue;

      rows.push({
        month,
        revenue_stream: revenueStream,
        revenue_target: revenue,
        cogs: parseNum(grid[i]?.[9]),
        packaging: parseNum(grid[i]?.[10]),
        transportation: parseNum(grid[i]?.[11]),
        commissions: parseNum(grid[i]?.[12]),
        fixed_expenses: parseNum(grid[i]?.[14]),
        net_margin: parseNum(grid[i]?.[15]),
      });
    }
  }

  return rows;
}

function parseTsfStoreExpenses(workbook: XLSX.WorkBook) {
  const grid = getGrid(workbook.Sheets["Store Expenses"]);
  const rows: Record<string, unknown>[] = [];

  for (let r = 1; r < grid.length; r++) {
    const category = grid[r]?.[0];
    const amount = parseNum(grid[r]?.[1]);
    if (typeof category !== "string" || amount === null || category.toUpperCase() === "TOTAL") continue;

    const pending = parseNum(grid[r]?.[5]);
    rows.push({
      month: null,
      category,
      amount,
      notes: pending && pending > 0 ? `Pending: ₹${pending.toLocaleString("en-IN")}` : null,
    });
  }

  return rows;
}

function parseTsfInventory(workbook: XLSX.WorkBook) {
  const grid = getGrid(workbook.Sheets["Inventory management (Weekly)"]);
  const weekStart = parseDDMMYYYY(grid[1]?.[2]) ?? monthDate(2026, 6);
  const rows: Record<string, unknown>[] = [];

  for (let r = 3; r < grid.length; r++) {
    const skuName = grid[r]?.[1];
    if (typeof skuName !== "string") continue;
    const raw = grid[r]?.[2];
    if (raw === null) continue;

    let unit = "pieces";
    if (typeof raw === "string") {
      if (/ltr|lit/i.test(raw)) unit = "litres";
      else if (/kgs?/i.test(raw)) unit = "kg";
    }
    const quantity = parseNum(raw);
    if (quantity === null) continue;

    rows.push({
      week_start: weekStart,
      oil_type: findOilType(skuName),
      sku_name: skuName,
      quantity,
      unit,
      location: "Factory",
      value: null,
    });
  }

  return rows;
}

function parseTsfMarketingCampaigns(workbook: XLSX.WorkBook) {
  const grid = getGrid(workbook.Sheets["Marketing Campaign & Budget Tra"]);
  const weekStart = toISODate(grid[1]?.[12]) ?? monthDate(2026, 6); // M2

  const rows: Record<string, unknown>[] = [];
  for (let r = 1; r <= 5; r++) {
    const platform = grid[r]?.[5]; // col F
    if (typeof platform !== "string") continue;

    rows.push({
      week_start: weekStart,
      campaign_name: null,
      platform,
      budget: parseNum(grid[r]?.[6]),
      spend: parseNum(grid[r]?.[7]) ?? 0,
      impressions: null,
      clicks: null,
      conversions: null,
      revenue_attributed: null,
      roas: null,
      notes: typeof grid[r]?.[15] === "string" ? (grid[r]?.[15] as string) : null,
    });
  }

  return rows;
}

async function chunkedUpsert(
  supabase: ReturnType<typeof createServiceRoleClient>,
  table: string,
  rows: Record<string, unknown>[],
  chunkSize = 200
) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk);
    if (error) throw new Error(`${table} upsert failed at row ${i}: ${error.message}`);
  }
  console.log(`  seeded ${rows.length} rows into ${table}`);
}

// The finance tables use an auto-generated uuid PK with no natural key, so a
// plain upsert would just duplicate rows on every re-run. Truncate first to
// keep this script idempotent.
async function replaceAll(
  supabase: ReturnType<typeof createServiceRoleClient>,
  table: string,
  rows: Record<string, unknown>[]
) {
  const { error: deleteError } = await supabase.from(table).delete().not("id", "is", null);
  if (deleteError) throw new Error(`${table} clear failed: ${deleteError.message}`);
  if (rows.length > 0) await chunkedUpsert(supabase, table, rows);
  else console.log(`  cleared ${table} (nothing to seed)`);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const crmWorkbook = XLSX.readFile(path.join(DATA_DIR, "CRM Sheet - TSF.xlsx"));
  const ssplWorkbook = XLSX.readFile(path.join(DATA_DIR, "Fin Sheet - SSPL.xlsx"));
  const tsfWorkbook = XLSX.readFile(path.join(DATA_DIR, "Fin Sheet - TSF.xlsx"));

  console.log("Parsing CRM Sheet - TSF.xlsx…");
  const customers = parseCustomers(crmWorkbook);
  const skus = parseSkus(crmWorkbook);

  const phoneToCustomerId = new Map<string, string>();
  customers.forEach((c) => {
    if (c.phone && !phoneToCustomerId.has(c.phone)) phoneToCustomerId.set(c.phone, c.id);
  });

  const orders = parseOrders(crmWorkbook, phoneToCustomerId);
  const matchedOrders = orders.filter((o) => o.customer_id).length;

  console.log(`Parsed ${customers.length} customers, ${orders.length} orders (${matchedOrders} matched to a customer), ${skus.length} skus`);

  console.log("Parsing Fin Sheet - SSPL.xlsx…");
  const ssplMonthlySales = parseSsplMonthlySales(ssplWorkbook);
  const ssplUnitEconomics = parseSsplUnitEconomics(ssplWorkbook);
  const { monthlyExpenses: ssplActualExpenses, transactions: ssplExpenseTransactions } = parseSsplExpenses(ssplWorkbook);
  const ssplBudgetedExpenses = parseSsplBudgetedExpenses(ssplWorkbook);
  const ssplMonthlyExpenses = [...ssplActualExpenses, ...ssplBudgetedExpenses];
  const ssplWeeklyPerformance = parseSsplWeeklyPerformance(ssplWorkbook);
  const ssplCashflowSnapshots = parseSsplCashflowSnapshot(ssplWorkbook);
  const ssplMonthlyTargets = parseSsplMonthlyTargets(ssplWorkbook);

  console.log(
    `Parsed ${ssplMonthlySales.length} monthly sales rows, ${ssplUnitEconomics.length} unit economics rows, ` +
      `${ssplMonthlyExpenses.length} monthly expense rows, ${ssplExpenseTransactions.length} expense transactions, ` +
      `${ssplWeeklyPerformance.length} weekly performance rows, ${ssplCashflowSnapshots.length} cashflow snapshots, ${ssplMonthlyTargets.length} monthly targets`
  );

  console.log("Parsing Fin Sheet - TSF.xlsx…");
  const tsfCompanyStructure = [
    ...parseTsfFixedExpenses(tsfWorkbook),
    ...parseTsfCapitalDeployment(tsfWorkbook),
    ...parseTsfCogsMoM(tsfWorkbook),
  ];
  const tsfMonthlyPoa = parseTsfMonthlyPoa(tsfWorkbook);
  const tsfStoreExpenses = parseTsfStoreExpenses(tsfWorkbook);
  const tsfInventory = parseTsfInventory(tsfWorkbook);
  const tsfMarketingCampaigns = parseTsfMarketingCampaigns(tsfWorkbook);

  console.log(
    `Parsed ${tsfCompanyStructure.length} company structure rows, ${tsfMonthlyPoa.length} POA rows, ` +
      `${tsfStoreExpenses.length} store expense rows, ${tsfInventory.length} inventory rows, ${tsfMarketingCampaigns.length} marketing campaign rows`
  );

  if (dryRun) {
    console.log("\n--dry-run: skipping Supabase writes\n");
    console.log("Sample customer:", customers[0]);
    console.log("Sample order:", orders[0]);
    console.log("Sample sku:", skus[0]);
    console.log("All skus:", skus.map((s) => `${s.id} (${s.oil_type ?? "?"}, ${s.size_litres ?? "?"}L, ₹${s.price}, stock=${s.current_stock_litres})`));
    console.log("\nSample sspl monthly sales:", ssplMonthlySales[0]);
    console.log("Sample sspl unit economics:", ssplUnitEconomics[0]);
    console.log("All sspl monthly expenses:", ssplMonthlyExpenses);
    console.log("Sample sspl expense transaction:", ssplExpenseTransactions[0]);
    console.log("Sspl weekly performance:", ssplWeeklyPerformance);
    console.log("Sspl cashflow snapshots:", ssplCashflowSnapshots);
    console.log("Sspl monthly targets:", ssplMonthlyTargets);
    console.log("\nTsf company structure:", tsfCompanyStructure);
    console.log("Tsf monthly POA:", tsfMonthlyPoa);
    console.log("Tsf store expenses:", tsfStoreExpenses);
    console.log("Sample tsf inventory:", tsfInventory[0], "... total", tsfInventory.length);
    console.log("Tsf marketing campaigns:", tsfMarketingCampaigns);
    return;
  }

  console.log("Seeding Supabase…");
  const supabase = createServiceRoleClient();
  await chunkedUpsert(supabase, "skus", skus);
  await chunkedUpsert(supabase, "customers", customers);
  await chunkedUpsert(supabase, "orders", orders);
  await replaceAll(supabase, "sspl_monthly_sales", ssplMonthlySales);
  await replaceAll(supabase, "sspl_unit_economics", ssplUnitEconomics);
  await replaceAll(supabase, "sspl_monthly_expenses", ssplMonthlyExpenses);
  await replaceAll(supabase, "sspl_expense_transactions", ssplExpenseTransactions);
  await replaceAll(supabase, "sspl_weekly_performance", ssplWeeklyPerformance);
  await replaceAll(supabase, "sspl_cashflow_snapshots", ssplCashflowSnapshots);
  await replaceAll(supabase, "sspl_monthly_targets", ssplMonthlyTargets);
  await replaceAll(supabase, "tsf_company_structure", tsfCompanyStructure);
  await replaceAll(supabase, "tsf_monthly_poa", tsfMonthlyPoa);
  await replaceAll(supabase, "tsf_store_expenses", tsfStoreExpenses);
  await replaceAll(supabase, "tsf_inventory", tsfInventory);
  await replaceAll(supabase, "tsf_marketing_campaigns", tsfMarketingCampaigns);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
