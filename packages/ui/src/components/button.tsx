import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-medium ring-offset-zinc-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-[0.98] transition-transform duration-100',
  {
    variants: {
      variant: {
        default: 'bg-zinc-100 text-zinc-900 shadow-sm hover:bg-zinc-200',
        primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500',
        destructive: 'bg-red-900/60 text-red-200 border border-red-800/80 hover:bg-red-900/80',
        outline: 'border border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-800/60 hover:text-zinc-100',
        secondary: 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700/80',
        ghost: 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100',
        link: 'text-indigo-400 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-3 py-1.5',
        sm: 'h-7 rounded-md px-2.5 text-xs',
        lg: 'h-9 rounded-lg px-4 text-sm',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
