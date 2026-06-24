import { createClient } from "@/lib/supabase/server";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .order("id");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <CustomerFormDialog />
      </div>
      <CustomerTable customers={customers ?? []} />
    </div>
  );
}
