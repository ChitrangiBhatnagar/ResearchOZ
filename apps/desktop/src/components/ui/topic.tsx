import * as React from 'react'
import { Badge } from '@research-os/ui'
import { cn } from '@/lib/utils'

interface TopicProps {
  index: number
  title: string
  subtitle?: string
  minutes?: number
  status?: 'in-progress' | 'not-started' | 'done'
  badges?: { label: string; variant?: string }[]
}

export function TopicTile({
  index,
  title,
  subtitle,
  minutes,
  status = 'not-started',
  badges,
}: TopicProps) {
  const statusColor =
    status === 'in-progress' ? 'bg-primary' : status === 'done' ? 'bg-emerald-500' : 'bg-muted-foreground/40'

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl p-3 transition-colors bg-muted/30 border border-border/70 hover:border-border hover:bg-muted/45'
      )}
    >
      <div className="flex items-center space-x-3 min-w-0">
        <div className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground text-xs font-semibold">
          {index}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground truncate">{title}</div>
          {subtitle && (
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtitle}</div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0 pl-3">
        {typeof minutes === 'number' && (
          <div className="text-[10px] text-muted-foreground">{minutes} mins</div>
        )}
        {badges && (
          <div className="flex items-center space-x-2">
            {badges.map((b) => (
              <Badge
                key={b.label}
                variant={(b.variant as any) || 'outline'}
                className="text-[10px]"
              >
                {b.label}
              </Badge>
            ))}
          </div>
        )}
        <div className={cn('w-2.5 h-2.5 rounded-full', statusColor)} />
      </div>
    </div>
  )
}

export default TopicTile
