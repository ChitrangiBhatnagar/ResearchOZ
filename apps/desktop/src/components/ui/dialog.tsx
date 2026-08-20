import * as React from 'react'
import { cn } from '@/lib/utils'

export function Dialog({ children, open }: { children: React.ReactNode; open?: boolean }) {
  if (!open) return null
  return <div className={cn('fixed inset-0 z-50 flex items-center justify-center')}>{children}</div>
}

export default Dialog
