import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-zinc-800 text-zinc-100',
        secondary: 'border-zinc-700/60 bg-zinc-800/40 text-zinc-300',
        success: 'border-emerald-800/60 bg-emerald-950/40 text-emerald-300',
        warning: 'border-amber-800/60 bg-amber-950/40 text-amber-300',
        destructive: 'border-rose-800/60 bg-rose-950/40 text-rose-300',
        indigo: 'border-indigo-800/60 bg-indigo-950/40 text-indigo-300',
        outline: 'text-zinc-400 border-zinc-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
