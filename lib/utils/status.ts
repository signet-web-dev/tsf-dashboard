export type CustomerStatus = 'Active' | 'Churned' | 'Prospect'

export function statusBadgeVariant(status: CustomerStatus | string) {
  switch (status) {
    case 'Active':
      return 'default'
    case 'Churned':
      return 'destructive'
    case 'Prospect':
      return 'secondary'
    default:
      return 'outline'
  }
}
