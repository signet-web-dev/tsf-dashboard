"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nextSequentialId } from "@/lib/utils/next-id";

export async function createCustomer(input: {
  name: string;
  phone: string | null;
  location: string | null;
  address: string | null;
  custom_cycle_days: number | null;
}) {
  const supabase = await createClient();
  const id = await nextSequentialId(supabase, "customers", "CX");

  const { error } = await supabase.from("customers").insert({
    id,
    name: input.name,
    phone: input.phone,
    location: input.location,
    address: input.address,
    custom_cycle_days: input.custom_cycle_days,
    status: "Prospect",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/customers");
  revalidatePath("/prospects");
  return id;
}
