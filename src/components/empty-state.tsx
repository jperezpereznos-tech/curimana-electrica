import {
InboxIcon, Users, Receipt, Wallet, BookOpen, Zap, MapPin, Shield, Calendar, Tag, ClipboardList, Search,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  message: string
  description?: string
  icon?: React.ReactNode
  illustration?: EmptyIllustration
  action?: React.ReactNode
}

type EmptyIllustration =
  | 'customers' | 'receipts' | 'payments' | 'readings' | 'tariffs'
  | 'sectors' | 'users' | 'periods' | 'concepts' | 'audit' | 'search' | 'default'

const illustrationMap: Record<EmptyIllustration, { Icon: LucideIcon; accent: string }> = {
  customers: { Icon: Users, accent: 'text-muni-blue' },
  receipts: { Icon: Receipt, accent: 'text-muni-gold' },
  payments: { Icon: Wallet, accent: 'text-muni-green' },
  readings: { Icon: BookOpen, accent: 'text-muni-blue' },
  tariffs: { Icon: Zap, accent: 'text-muni-gold' },
  sectors: { Icon: MapPin, accent: 'text-muni-green' },
  users: { Icon: Shield, accent: 'text-muni-blue' },
  periods: { Icon: Calendar, accent: 'text-muni-gold' },
  concepts: { Icon: Tag, accent: 'text-muni-green' },
  audit: { Icon: ClipboardList, accent: 'text-muni-silver-dark' },
  search: { Icon: Search, accent: 'text-muni-blue' },
  default: { Icon: InboxIcon, accent: 'text-muted-foreground' },
}

export function EmptyState({ message, description, icon, illustration, action }: EmptyStateProps) {
const config = illustrationMap[illustration || 'default'] || illustrationMap.default
const IllustrationIcon = config.Icon

return (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="relative mb-6">
      <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center">
        {icon || <IllustrationIcon className={`h-9 w-9 ${config.accent}`} strokeWidth={1.25} />}
      </div>
      <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-background border-2 border-muted flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
      </div>
    </div>
    <p className="font-medium text-sm text-foreground">{message}</p>
    {description && <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
)
}

export function EmptyIllustration({ type }: { type: EmptyIllustration }) {
const { Icon, accent } = illustrationMap[type] || illustrationMap.default

return (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="relative mb-4">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="opacity-20 dark:opacity-10">
        <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="1" className="text-muted-foreground" />
        <circle cx="60" cy="60" r="40" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" className="text-muted-foreground" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className={`h-12 w-12 ${accent}`} strokeWidth={1.25} />
      </div>
    </div>
  </div>
)
}
