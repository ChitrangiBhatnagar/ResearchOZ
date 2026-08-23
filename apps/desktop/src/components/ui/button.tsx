import * as React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'outline' | 'ghost'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
}

export function Button({ className, variant = 'outline', size = 'md', ...props }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50'
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs h-8',
    md: 'px-4 py-2 text-sm h-9',
  }

  const variants: Record<Variant, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
    outline:
      'bg-transparent border border-border text-foreground hover:bg-muted/60 hover:text-foreground',
    ghost: 'bg-transparent text-foreground hover:bg-muted/50',
  }

  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props} />
  )
}

export default Button
