import * as React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'outline' | 'ghost'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
}

export function Button({ className, variant = 'outline', size = 'md', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition'
  const sizes: Record<string, string> = {
    sm: 'px-2.5 py-1.5 text-xs h-7',
    md: 'px-3 py-2 text-sm h-9',
  }

  const variants: Record<Variant, string> = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
    outline: 'bg-transparent border border-zinc-800 text-zinc-100 hover:bg-zinc-900/60',
    ghost: 'bg-transparent text-zinc-100 hover:bg-zinc-900/40',
  }

  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props} />
  )
}

export default Button
