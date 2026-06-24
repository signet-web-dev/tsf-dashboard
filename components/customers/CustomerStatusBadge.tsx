import { Badge } from "@/components/ui/badge";
import { statusBadgeVariant } from "@/lib/utils/status";

export function CustomerStatusBadge({ status }: { status: string }) {
  return <Badge variant={statusBadgeVariant(status) as "default" | "secondary" | "destructive" | "outline"}>{status}</Badge>;
}
