"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SsplMonthlyTarget } from "@/lib/supabase/types";

type TargetField = Exclude<keyof SsplMonthlyTarget, "id" | "entity" | "month" | "notable_inventory_notes">;

export async function updateTargetField(id: string, field: TargetField, value: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("sspl_monthly_targets").update({ [field]: value }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/targets");
}
