-- Internal-only dashboard: any authenticated (team) user gets full access,
-- anonymous/public access is denied entirely.

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'customers', 'orders', 'skus',
      'sspl_monthly_sales', 'sspl_unit_economics', 'sspl_monthly_expenses',
      'sspl_expense_transactions', 'sspl_weekly_performance',
      'sspl_cashflow_snapshots', 'sspl_monthly_targets',
      'tsf_company_structure', 'tsf_store_expenses', 'tsf_monthly_poa',
      'tsf_inventory', 'tsf_marketing_campaigns'
    ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "authenticated_full_access" on %I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
