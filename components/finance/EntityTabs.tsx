"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ENTITIES = ["SSPL", "TSF", "Both"];

export function EntityTabs({ selected }: { selected: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(entity: unknown) {
    if (typeof entity !== "string") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("entity", entity);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Tabs value={selected} onValueChange={handleChange}>
      <TabsList>
        {ENTITIES.map((e) => (
          <TabsTrigger key={e} value={e}>{e}</TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
