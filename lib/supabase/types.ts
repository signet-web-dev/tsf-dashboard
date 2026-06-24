export type Customer = {
  id: string
  name: string
  phone: string | null
  location: string | null
  address: string | null
  status: 'Active' | 'Churned' | 'Prospect'
  notes: string | null
  custom_cycle_days: number | null
  total_orders: number
  total_value: number
  last_order_date: string | null
  cycle_duration: number | null
  created_at: string
}

export type Order = {
  id: string
  customer_id: string | null
  customer_name: string | null
  phone: string | null
  order_date: string | null
  products: string | null
  order_value: number | null
  amount_paid: number | null
  outstanding: number | null
  reminder_date: string | null
  delivery_status: 'Pending' | 'Delivered' | 'Returned' | string
  channel: 'WhatsApp' | 'Shopify' | 'Amazon' | 'B2B' | 'Tally' | 'Store' | string | null
  warehouse: string | null
  notes: string | null
  reference_id: string | null
  created_at: string
}

export type Sku = {
  id: string
  name: string
  oil_type: string | null
  size_litres: number | null
  price: number | null
  standard_cycle_days: number | null
  current_stock_litres: number
}

export type SsplMonthlySales = {
  id: string
  entity: string
  month: string
  channel: string
  sales: number
  gst_on_sales: number
  returns_loss: number
  reimbursements: number
  promotions: number
  delivery_fees: number
  fba_selling_fees: number
  fba_transaction_fees: number
  fba_inventory_fees: number
  other_transaction_fees: number
  cost_of_advertising: number
  units_sold: number
  cogs: number
  gross_profit: number
  payments_received: number
}

export type SsplUnitEconomics = {
  id: string
  month: string
  oil_type: string
  raw_material_kg: number | null
  packaging_cost: number | null
  rent_allocated: number | null
  electricity_allocated: number | null
  salaries_allocated: number | null
  packaging_allocated: number | null
  logistics_allocated: number | null
  bank_interest_allocated: number | null
  marketing_allocated: number | null
  others_allocated: number | null
  total_cogs: number | null
  litres_produced: number | null
  cost_per_litre: number | null
}

export type SsplMonthlyExpense = {
  id: string
  entity: string
  month: string
  category: string
  budgeted: number | null
  actual: number | null
}

export type SsplExpenseTransaction = {
  id: string
  entity: string
  date: string
  particulars: string | null
  vch_type: string | null
  vch_no: string | null
  debit: number | null
  category: string | null
  month: string | null
}

export type SsplWeeklyPerformance = {
  id: string
  entity: string
  week_start: string
  platform: 'Amazon' | 'Meta' | 'Qcomm' | 'Meesho' | string
  weekly_ecommerce_sales: number | null
  weekly_whatsapp_sales: number | null
  weekly_b2b_sales: number | null
  weekly_store_sales: number | null
  ad_sale_amount: number | null
  ad_spend: number | null
  impressions: number | null
  roas: number | null
  acos: number | null
  tacos: number | null
  cpc: number | null
  ctr: number | null
  cvr: number | null
  ntb_orders: number | null
  brand_share_pct: number | null
  followers_growth_rate: number | null
  engagement_rate: number | null
}

export type SsplCashflowSnapshot = {
  id: string
  entity: string
  week_start: string
  cash_in_bank: number | null
  finished_goods_value: number | null
  raw_material_value: number | null
  receivables: number | null
  payables: number | null
  net_working_capital: number | null
  inventory_turnover: number | null
  inventory_days: number | null
  receivable_days: number | null
  payable_days: number | null
  cash_conversion_cycle: number | null
  red_flags: string[] | null
}

export type SsplMonthlyTarget = {
  id: string
  entity: string
  month: string
  target_ecommerce: number | null
  target_whatsapp: number | null
  target_store: number | null
  target_b2b: number | null
  target_website: number | null
  budget_raw_material: number | null
  budget_packaging: number | null
  budget_operations: number | null
  budget_logistics: number | null
  budget_bank_interest: number | null
  budget_marketing: number | null
  budget_other: number | null
  notable_inventory_notes: string | null
}

export type TsfCompanyStructure = {
  id: string
  cost_type: 'FixedExpense' | 'CapitalDeployment' | 'COGSMoM' | string
  department: 'Factory' | 'ExperienceCentre' | null
  item: string | null
  amount: number | null
  funding_source: 'bank' | 'personal' | null
  notes: string | null
}

export type TsfStoreExpense = {
  id: string
  month: string
  category: string | null
  amount: number | null
  notes: string | null
}

export type TsfMonthlyPoa = {
  id: string
  month: string
  revenue_stream: 'B2C' | 'Ecommerce' | 'ExperienceCentre' | string
  revenue_target: number | null
  cogs: number | null
  packaging: number | null
  transportation: number | null
  commissions: number | null
  fixed_expenses: number | null
  net_margin: number | null
}

export type TsfInventory = {
  id: string
  week_start: string
  oil_type: string | null
  sku_name: string | null
  quantity: number | null
  unit: 'litres' | 'kg' | 'bottles' | string | null
  location: 'Factory' | 'Store' | 'Warehouse' | string | null
  value: number | null
}

export type TsfMarketingCampaign = {
  id: string
  week_start: string
  campaign_name: string | null
  platform: 'Amazon' | 'Meta' | 'WhatsApp' | 'Offline' | string | null
  budget: number | null
  spend: number | null
  impressions: number | null
  clicks: number | null
  conversions: number | null
  revenue_attributed: number | null
  roas: number | null
  notes: string | null
}
