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

export function TopicTile({ index, title, subtitle, minutes, status = 'not-started' }: TopicProps) {
  const statusColor = status === 'in-progress' ? 'bg-amber-500' : status === 'done' ? 'bg-emerald-500' : 'bg-zinc-700'
  return (
    <div className={cn('flex items-center justify-between rounded-lg p-3 transition-colors bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700')}>
      <div className="flex items-center space-x-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-800 text-zinc-200 font-semibold">{index}</div>
        <div>
          <div className="text-xs font-semibold text-zinc-100">{title}</div>
          {subtitle && <div className="text-[10px] text-zinc-400 mt-0.5">{subtitle}</div>}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {typeof minutes === 'number' && (
          <div className="text-[10px] text-zinc-400">{minutes} mins</div>
        )}
        {badges && (
          <div className="flex items-center space-x-2">
            {badges.map((b) => (
              <Badge key={b.label} variant={(b.variant as any) || 'outline'} className="text-[10px]">
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
