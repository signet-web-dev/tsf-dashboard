"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/utils/format";
import { updateTargetField } from "@/app/(dashboard)/targets/actions";
import type { SsplMonthlyTarget } from "@/lib/supabase/types";

type TargetField = Exclude<keyof SsplMonthlyTarget, "id" | "entity" | "month" | "notable_inventory_notes">;

function progressColorClass(pct: number, inverted: boolean) {
  const good = inverted ? pct <= 100 : pct >= 100;
  const warn = inverted ? pct <= 120 : pct >= 80;
  if (good) return "[&>div]:bg-green-600";
  if (warn) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-destructive";
}

export function TargetRow({
  targetId,
  field,
  label,
  actual,
  target,
  inverted = false,
}: {
  targetId: string;
  field: TargetField;
  label: string;
  actual: number | null;
  target: number | null;
  inverted?: boolean;
}) {
  const [value, setValue] = useState(target?.toString() ?? "");
  const [isPending, startTransition] = useTransition();

  const targetNum = Number(value) || 0;
  const pct = actual !== null && targetNum ? (actual / targetNum) * 100 : 0;

  function handleBlur() {
    const next = value ? Number(value) : 0;
    if (next === (target ?? 0)) return;
    startTransition(async () => {
      try {
        await updateTargetField(targetId, field, next);
        toast.success(`${label} target updated`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update target");
      }
    });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>{actual !== null ? formatINR(actual) : "No actuals yet"} /</span>
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            disabled={isPending}
            className="h-6 w-24 text-right text-sm"
          />
          <span>({pct.toFixed(0)}%)</span>
        </div>
      </div>
      <Progress value={Math.min(pct, 100)} className={progressColorClass(pct, inverted)} />
    </div>
  );
}
