"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatMonthLabel(month: string) {
  return new Date(`${month}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function MonthSelector({ months, selected }: { months: string[]; selected: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(month: string | null) {
    if (!month) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", month);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={selected} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
