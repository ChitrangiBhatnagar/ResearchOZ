import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-foreground text-background',
        secondary: 'border-border/70 bg-secondary text-secondary-foreground',
        success:
          'border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300',
        warning:
          'border-amber-600/25 bg-amber-500/10 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300',
        destructive:
          'border-rose-600/25 bg-rose-500/10 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300',
        indigo: 'border-primary/25 bg-primary/10 text-primary',
        outline: 'border-border text-muted-foreground',
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
