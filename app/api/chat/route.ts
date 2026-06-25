import { createClient } from "@/lib/supabase/server";
import { groqChat, GroqError, type ChatMessage, type ToolCall } from "@/lib/chat/groq";
import { SYSTEM_PROMPT } from "@/lib/chat/system-prompt";
import { TOOL_DEFS, WRITE_TOOL_NAMES } from "@/lib/chat/tools";
import {
  getAdSpend,
  getSalesSummary,
  getChannelPnl,
  findCustomer,
  getOrderHistory,
  findSku,
} from "@/lib/chat/query-tools";
import { resolveOrderItems, sumOrderValue } from "@/lib/chat/parse-items";
import type { PendingAction } from "@/lib/chat/pending-actions";

const MAX_TOOL_ROUNDS = 5;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// The model sometimes fills an unset optional field with a placeholder like "unknown" or
// "n/a" instead of omitting it - treat those the same as not having a value at all.
const PLACEHOLDER_VALUES = new Set(["unknown", "n/a", "na", "none", "null", "not provided", "not given"]);
function sanitizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

async function executeReadTool(supabase: SupabaseClient, toolCall: ToolCall): Promise<unknown> {
  const args = JSON.parse(toolCall.function.arguments || "{}");
  switch (toolCall.function.name) {
    case "get_ad_spend":
      return getAdSpend(supabase, args);
    case "get_sales_summary":
      return getSalesSummary(supabase, args);
    case "get_channel_pnl":
      return getChannelPnl(supabase, args);
    case "find_customer":
      return findCustomer(supabase, args);
    case "get_order_history":
      return getOrderHistory(supabase, args);
    case "find_sku":
      return findSku(supabase, args);
    default:
      return { error: `Unknown tool: ${toolCall.function.name}` };
  }
}

async function buildPendingAction(supabase: SupabaseClient, toolCall: ToolCall): Promise<PendingAction | { error: string }> {
  const args = JSON.parse(toolCall.function.arguments || "{}");

  if (toolCall.function.name === "propose_create_customer") {
    return {
      type: "create_customer",
      name: args.name,
      phone: sanitizeOptionalText(args.phone),
      location: sanitizeOptionalText(args.location),
      address: sanitizeOptionalText(args.address),
    };
  }

  if (toolCall.function.name === "propose_create_order") {
    // The model sometimes leaves a phone number inside customer_query instead of the
    // separate phone argument - fall back to extracting it so it isn't silently dropped.
    const extractedPhone = args.customer_query.match(/\d{7,}/)?.[0];
    const phone = sanitizeOptionalText(args.phone) ?? extractedPhone ?? null;
    const nameInput = extractedPhone
      ? args.customer_query.replace(extractedPhone, "").replace(/[,-]\s*$/, "").trim() || args.customer_query
      : args.customer_query;

    const { candidates } = await findCustomer(supabase, { query: args.customer_query, phone: phone ?? undefined });
    const match = candidates[0] ?? null;

    const { resolved, unresolved } = await resolveOrderItems(supabase, args.items ?? []);
    if (unresolved.length > 0) {
      return { error: `Could not resolve SKU(s): ${unresolved.join(", ")}. Use find_sku to get a valid sku_id first.` };
    }

    return {
      type: "create_order",
      customer: {
        matched_id: match?.id ?? null,
        matched_name: match?.name ?? null,
        name_input: nameInput,
        phone_input: match?.phone ?? phone,
        location_input: match?.location ?? sanitizeOptionalText(args.location),
        address_input: match?.address ?? sanitizeOptionalText(args.address),
        is_new: !match,
      },
      items: resolved,
      order_value: sumOrderValue(resolved),
      channel: sanitizeOptionalText(args.channel) ?? "WhatsApp",
      notes: sanitizeOptionalText(args.notes),
    };
  }

  return { error: `Unknown write tool: ${toolCall.function.name}` };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: ChatMessage[] } = await req.json();

  const conversation: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT(new Date()) },
    ...messages,
  ];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const res = await groqChat(conversation, TOOL_DEFS);
      const choice = res.choices[0].message;
      conversation.push(choice);

      if (!choice.tool_calls?.length) {
        return Response.json({ message: choice.content, pendingAction: null });
      }

      const writeCall = choice.tool_calls.find((tc) => WRITE_TOOL_NAMES.has(tc.function.name));
      if (writeCall) {
        const result = await buildPendingAction(supabase, writeCall);
        if ("error" in result) {
          conversation.push({
            role: "tool",
            tool_call_id: writeCall.id,
            name: writeCall.function.name,
            content: JSON.stringify(result),
          });
          continue;
        }
        const missingPhoneNote =
          (result.type === "create_order" && result.customer.is_new && !result.customer.phone_input) ||
          (result.type === "create_customer" && !result.phone)
            ? " I don't have a phone number for this customer — let me know if you have one, or I'll proceed without it."
            : "";

        return Response.json({
          message: (choice.content || "Please review and confirm:") + missingPhoneNote,
          pendingAction: result,
        });
      }

      for (const toolCall of choice.tool_calls) {
        const result = await executeReadTool(supabase, toolCall);
        conversation.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(result),
        });
      }
    }
  } catch (err) {
    if (err instanceof GroqError && err.status === 429) {
      return Response.json({
        message: "I'm rate-limited by Groq's free tier right now (daily token limit reached). Please try again in a few minutes.",
        pendingAction: null,
      });
    }
    return Response.json({
      message: `Something went wrong talking to the assistant: ${(err as Error).message}`,
      pendingAction: null,
    });
  }

  return Response.json({
    message: "Sorry, I couldn't complete that — try rephrasing your request.",
    pendingAction: null,
  });
}
