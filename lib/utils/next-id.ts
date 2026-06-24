import type { SupabaseClient } from "@supabase/supabase-js";

// IDs are zero-padded ("CX-0001", "ORD-0226"); lexicographic order matches
// numeric order as long as the digit count doesn't grow, which won't happen
// at this dataset's scale.
export async function nextSequentialId(
  supabase: SupabaseClient,
  table: string,
  prefix: string
): Promise<string> {
  const { data } = await supabase
    .from(table)
    .select("id")
    .like("id", `${prefix}-%`)
    .order("id", { ascending: false })
    .limit(1);

  const last = data?.[0]?.id as string | undefined;
  const lastNum = last ? Number(last.slice(prefix.length + 1)) || 0 : 0;
  return `${prefix}-${String(lastNum + 1).padStart(4, "0")}`;
}
