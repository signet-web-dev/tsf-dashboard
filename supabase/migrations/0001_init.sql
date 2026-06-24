-- ─────────────────────────────────────────
-- CRM (from CRM Sheet - TSF)
-- ─────────────────────────────────────────

create table customers (
  id text primary key,                     -- CX-0001 … CX-0265
  name text not null,
  phone text,
  location text,
  address text,
  status text default 'Prospect',          -- Active | Churned | Prospect
  notes text,
  custom_cycle_days integer,
  total_orders integer default 0,
  total_value numeric default 0,
  last_order_date date,
  cycle_duration integer,                  -- avg days between orders
  created_at timestamptz default now()
);

create table orders (
  id text primary key,                     -- ORD-0001 … or SHP-xxx / AMZ-xxx
  customer_id text references customers(id),
  customer_name text,
  phone text,
  order_date date,
  products text,                           -- comma-separated SKU string
  order_value numeric,
  amount_paid numeric,
  outstanding numeric generated always as (order_value - amount_paid) stored,
  reminder_date date,
  delivery_status text default 'Pending',  -- Pending | Delivered | Returned
  channel text,                            -- WhatsApp | Shopify | Amazon | B2B | Tally | Store
  warehouse text,
  notes text,
  reference_id text unique,               -- Shopify / Amazon order ID for dedup
  created_at timestamptz default now()
);

create table skus (
  id text primary key,                     -- groundnut-5l etc.
  name text not null,                      -- Groundnut Oil (5L)
  oil_type text,                           -- Groundnut | Sesame | Coconut | Avocado | Mustard | Safflower | Sunflower
  size_litres numeric,
  price numeric,
  standard_cycle_days integer,
  current_stock_litres numeric default 0
);

-- ─────────────────────────────────────────
-- SSPL Factory Financials (Fin Sheet - SSPL)
-- ─────────────────────────────────────────

create table sspl_monthly_sales (
  id uuid default gen_random_uuid() primary key,
  entity text default 'SSPL',
  month date,
  channel text,                            -- Ecommerce | WhatsApp | B2B | Store | Website
  sales numeric default 0,
  gst_on_sales numeric default 0,
  returns_loss numeric default 0,
  reimbursements numeric default 0,
  promotions numeric default 0,
  delivery_fees numeric default 0,
  fba_selling_fees numeric default 0,
  fba_transaction_fees numeric default 0,
  fba_inventory_fees numeric default 0,
  other_transaction_fees numeric default 0,
  cost_of_advertising numeric default 0,
  units_sold integer default 0,
  cogs numeric default 0,
  gross_profit numeric default 0,
  payments_received numeric default 0
);

create table sspl_unit_economics (
  id uuid default gen_random_uuid() primary key,
  month date,
  oil_type text,                           -- Groundnut | Sesame | Coconut | Avocado | Mustard | Safflower | Sunflower
  raw_material_kg numeric,
  packaging_cost numeric,
  rent_allocated numeric,
  electricity_allocated numeric,
  salaries_allocated numeric,
  packaging_allocated numeric,
  logistics_allocated numeric,
  bank_interest_allocated numeric,
  marketing_allocated numeric,
  others_allocated numeric,
  total_cogs numeric,
  litres_produced numeric,
  cost_per_litre numeric
);

create table sspl_monthly_expenses (
  id uuid default gen_random_uuid() primary key,
  entity text default 'SSPL',
  month date,
  category text,  -- RawMaterial | Packaging | Operations | Logistics | BankInterest | Marketing | Other
  budgeted numeric,
  actual numeric
);

create table sspl_expense_transactions (
  id uuid default gen_random_uuid() primary key,
  entity text default 'SSPL',
  date date,
  particulars text,
  vch_type text,
  vch_no text,
  debit numeric,
  category text,   -- derived by mapping particulars to category
  month date       -- derived
);

create table sspl_weekly_performance (
  id uuid default gen_random_uuid() primary key,
  entity text default 'SSPL',
  week_start date,
  platform text,   -- Amazon | Meta | Qcomm | Meesho
  -- sales
  weekly_ecommerce_sales numeric,
  weekly_whatsapp_sales numeric,
  weekly_b2b_sales numeric,
  weekly_store_sales numeric,
  -- ad metrics
  ad_sale_amount numeric,
  ad_spend numeric,
  impressions bigint,
  roas numeric,
  acos numeric,
  tacos numeric,
  cpc numeric,
  ctr numeric,
  cvr numeric,
  ntb_orders integer,
  brand_share_pct numeric,
  -- social
  followers_growth_rate numeric,
  engagement_rate numeric
);

create table sspl_cashflow_snapshots (
  id uuid default gen_random_uuid() primary key,
  entity text default 'SSPL',
  week_start date,
  cash_in_bank numeric,
  finished_goods_value numeric,
  raw_material_value numeric,
  receivables numeric,
  payables numeric,
  net_working_capital numeric,
  inventory_turnover numeric,
  inventory_days numeric,
  receivable_days numeric,
  payable_days numeric,
  cash_conversion_cycle numeric,
  red_flags text[]
);

create table sspl_monthly_targets (
  id uuid default gen_random_uuid() primary key,
  entity text default 'SSPL',
  month date unique,
  target_ecommerce numeric,
  target_whatsapp numeric,
  target_store numeric,
  target_b2b numeric,
  target_website numeric,
  budget_raw_material numeric,
  budget_packaging numeric,
  budget_operations numeric,
  budget_logistics numeric,
  budget_bank_interest numeric,
  budget_marketing numeric,
  budget_other numeric,
  notable_inventory_notes text
);

-- ─────────────────────────────────────────
-- TSF Retail Financials (Fin Sheet - TSF)
-- ─────────────────────────────────────────

create table tsf_company_structure (
  id uuid default gen_random_uuid() primary key,
  cost_type text,                          -- FixedExpense | CapitalDeployment | COGSMoM
  department text,                         -- Factory | ExperienceCentre
  item text,
  amount numeric,
  funding_source text,                     -- bank | personal | null
  notes text
);

create table tsf_store_expenses (
  id uuid default gen_random_uuid() primary key,
  month date,
  category text,
  amount numeric,
  notes text
);

create table tsf_monthly_poa (
  -- Plan of Action per month per revenue stream
  id uuid default gen_random_uuid() primary key,
  month date,
  revenue_stream text,                     -- B2C | Ecommerce | ExperienceCentre
  revenue_target numeric,
  cogs numeric,
  packaging numeric,
  transportation numeric,
  commissions numeric,
  fixed_expenses numeric,
  net_margin numeric
);

create table tsf_inventory (
  id uuid default gen_random_uuid() primary key,
  week_start date,
  oil_type text,
  sku_name text,
  quantity numeric,
  unit text,                               -- litres | kg | bottles
  location text,                           -- Factory | Store | Warehouse
  value numeric
);

create table tsf_marketing_campaigns (
  id uuid default gen_random_uuid() primary key,
  week_start date,
  campaign_name text,
  platform text,                           -- Amazon | Meta | WhatsApp | Offline
  budget numeric,
  spend numeric,
  impressions bigint,
  clicks integer,
  conversions integer,
  revenue_attributed numeric,
  roas numeric,
  notes text
);

-- ─────────────────────────────────────────
-- Customer status + totals derivation
-- ─────────────────────────────────────────

create or replace function update_customer_totals(p_phone text, p_date date, p_value numeric)
returns void as $$
declare
  v_customer_id text;
begin
  select id into v_customer_id from customers where phone = p_phone limit 1;
  if v_customer_id is null then
    return;
  end if;

  update customers
  set
    total_orders = total_orders + 1,
    total_value = total_value + p_value,
    last_order_date = greatest(coalesce(last_order_date, p_date), p_date),
    status = 'Active'
  where id = v_customer_id;
end;
$$ language plpgsql;

create or replace function refresh_customer_status(p_customer_id text)
returns void as $$
declare
  v_last_order_date date;
  v_cycle_duration integer;
  v_total_orders integer;
begin
  select last_order_date, cycle_duration, total_orders
  into v_last_order_date, v_cycle_duration, v_total_orders
  from customers where id = p_customer_id;

  if v_total_orders = 0 then
    update customers set status = 'Prospect' where id = p_customer_id and status != 'Prospect';
  elsif v_last_order_date is not null
        and current_date - v_last_order_date > coalesce(v_cycle_duration, 30) * 1.5 then
    update customers set status = 'Churned' where id = p_customer_id;
  else
    update customers set status = 'Active' where id = p_customer_id;
  end if;
end;
$$ language plpgsql;

create or replace function handle_new_order()
returns trigger as $$
begin
  if new.customer_id is not null then
    update customers
    set
      total_orders = total_orders + 1,
      total_value = total_value + coalesce(new.order_value, 0),
      last_order_date = greatest(coalesce(last_order_date, new.order_date), new.order_date),
      status = 'Active'
    where id = new.customer_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_order_insert
  after insert on orders
  for each row execute function handle_new_order();

-- ─────────────────────────────────────────
-- Realtime + indexes
-- ─────────────────────────────────────────

alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table customers;

create index on orders(channel);
create index on orders(order_date);
create index on orders(customer_id);
create index on customers(status);
create index on sspl_monthly_sales(month);
create index on sspl_expense_transactions(date);
create index on sspl_weekly_performance(week_start);
create index on tsf_inventory(week_start);
create index on tsf_marketing_campaigns(week_start);
