import { InboxIcon } from 'lucide-react'

type EmptyStateProps = {
  message: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export function EmptyState({ message, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
      <div className="mb-3">
        {icon || <InboxIcon className="h-10 w-10" />}
      </div>
      <p className="font-medium text-sm">{message}</p>
      {description && <p className="text-xs mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
