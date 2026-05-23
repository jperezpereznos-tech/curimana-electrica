import { Badge } from '@/components/ui/badge'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

const receiptStatusMap: Record<string, { text: string; variant: BadgeVariant }> = {
  pending: { text: 'Pendiente', variant: 'outline' },
  partial: { text: 'Parcial', variant: 'secondary' },
  overdue: { text: 'Vencido', variant: 'destructive' },
  paid: { text: 'Pagado', variant: 'default' },
  cancelled: { text: 'Anulado', variant: 'outline' },
}

const paymentStatusMap: Record<string, { text: string; variant: BadgeVariant }> = {
  completed: { text: 'Completado', variant: 'default' },
  voided: { text: 'Anulado', variant: 'destructive' },
}

const activeStatusMap: Record<string, { text: string; variant: BadgeVariant }> = {
  active: { text: 'Activo', variant: 'default' },
  inactive: { text: 'Inactivo', variant: 'secondary' },
}

const periodStatusMap: Record<string, { text: string; variant: BadgeVariant }> = {
  open: { text: 'Abierto', variant: 'default' },
  closed: { text: 'Cerrado', variant: 'secondary' },
}

type StatusType = 'receipt' | 'payment' | 'active' | 'period'

const statusMaps: Record<StatusType, Record<string, { text: string; variant: BadgeVariant }>> = {
  receipt: receiptStatusMap,
  payment: paymentStatusMap,
  active: activeStatusMap,
  period: periodStatusMap,
}

type StatusBadgeProps = {
  status: string
  type: StatusType
  className?: string
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const map = statusMaps[type]
  const config = map[status] || { text: status, variant: 'outline' as BadgeVariant }
  return <Badge variant={config.variant} className={className}>{config.text}</Badge>
}

export { receiptStatusMap, paymentStatusMap, activeStatusMap, periodStatusMap }
