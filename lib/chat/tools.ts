import type { ToolDef } from "./groq";

export const TOOL_DEFS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "get_ad_spend",
      description:
        "Get advertising spend, optionally filtered by platform (e.g. Amazon, Meta) and month. Returns both TSF retail marketing spend and SSPL factory ad spend as separate totals.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: ["string", "null"], description: "Platform name to filter by, e.g. Amazon, Meta, Qcomm, Meesho" },
          month: { type: ["string", "null"], description: "Month in YYYY-MM format. Defaults to the current month." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_sales_summary",
      description:
        "Get TSF retail CRM order revenue (from the orders table), optionally filtered by channel (WhatsApp, Shopify, Amazon, B2B, Tally, Store) and month. This is raw order revenue only - it has no profit/COGS data and is a separate ledger from the SSPL factory sales ledger (see get_channel_pnl).",
      parameters: {
        type: "object",
        properties: {
          channel: { type: ["string", "null"], description: "Sales channel to filter by" },
          month: { type: ["string", "null"], description: "Month in YYYY-MM format. Defaults to the current month." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_channel_pnl",
      description:
        "Get SSPL factory P&L (sales, COGS, gross profit) by channel (Ecommerce, WhatsApp, B2B, Store, Website) and month. This is the only tool with profit/margin/COGS data - always use it for any question about profit, gross profit, margin, or P&L. It is a separate ledger from TSF retail CRM orders (see get_sales_summary) - the two track different entities and should not be conflated.",
      parameters: {
        type: "object",
        properties: {
          channel: { type: ["string", "null"], description: "Channel to filter by, e.g. B2B, WhatsApp, Ecommerce, Store, Website" },
          month: { type: ["string", "null"], description: "Month in YYYY-MM format. Defaults to the current month." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_customer",
      description: "Look up an existing customer by name, phone number, or informal reference. Returns matching candidates with id, name, phone, status, total_orders.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Name, phone number, or informal reference to search for" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_history",
      description: "Get recent order history for a customer, by customer_id or phone.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: ["string", "null"] },
          phone: { type: ["string", "null"] },
          limit: { type: ["number", "null"], description: "Max number of orders to return, defaults to 10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_sku",
      description: "Look up product SKUs by name or oil type (e.g. 'groundnut oil', 'avocado'). Returns candidates with sku_id, name, size_litres, price, current_stock_litres.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Product name or oil type to search for" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_create_customer",
      description: "Stage a new customer for creation. Does NOT write to the database - only prepares a confirmation card for the user to approve.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: ["string", "null"] },
          location: { type: ["string", "null"] },
          address: { type: ["string", "null"] },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_create_order",
      description:
        "Stage a new order for creation, for a new or existing customer. Does NOT write to the database - only prepares a confirmation card for the user to approve. Resolve products via find_sku first.",
      parameters: {
        type: "object",
        properties: {
          customer_query: { type: "string", description: "Name, phone, or informal reference identifying the customer" },
          phone: { type: ["string", "null"], description: "Phone number for the customer, if known/given - used to create a new customer record if no existing match is found" },
          location: { type: ["string", "null"], description: "City/area for the customer, if given - used only when creating a new customer record" },
          address: { type: ["string", "null"], description: "Full address for the customer, if given - used only when creating a new customer record" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sku_id: { type: "string" },
                qty: { type: "number" },
              },
              required: ["sku_id", "qty"],
            },
          },
          channel: { type: ["string", "null"], description: "Order channel, defaults to WhatsApp" },
          notes: { type: ["string", "null"] },
        },
        required: ["customer_query", "items"],
      },
    },
  },
];

export const WRITE_TOOL_NAMES = new Set(["propose_create_customer", "propose_create_order"]);
export const READ_TOOL_NAMES = new Set(
  TOOL_DEFS.map((t) => t.function.name).filter((name) => !WRITE_TOOL_NAMES.has(name))
);
