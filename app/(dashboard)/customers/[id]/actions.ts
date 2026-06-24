"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateCustomerNotes(customerId: string, notes: string) {
  const supabase = await createClient();
  await supabase.from("customers").update({ notes }).eq("id", customerId);
  revalidatePath(`/customers/${customerId}`);
}

export async function updateCustomerDetails(
  customerId: string,
  input: {
    name: string;
    phone: string | null;
    location: string | null;
    address: string | null;
    custom_cycle_days: number | null;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(input).eq("id", customerId);
  if (error) throw new Error(error.message);
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
}

export async function markCustomerContacted(customerId: string, existingNotes: string | null) {
  const supabase = await createClient();
  const stamp = `[Contacted ${new Date().toISOString().slice(0, 10)}]`;
  const notes = existingNotes ? `${existingNotes}\n${stamp}` : stamp;
  await supabase.from("customers").update({ notes }).eq("id", customerId);
  revalidatePath("/prospects");
}
