import { cn } from '@/lib/utils'
import { HTMLAttributes, forwardRef } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'error'
    | 'neutral'
    | 'gradient'
  size?: 'sm' | 'md' | 'lg'
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant = 'default', size = 'md', children, ...props },
    ref,
  ) => {
    const baseClasses =
      'inline-flex items-center font-semibold rounded-full transition-all duration-200'

    const variants = {
      default: 'bg-neutral-100 text-neutral-800 border border-neutral-200',
      primary: 'bg-primary-500 text-white shadow-lg',
      secondary: 'bg-neutral-200 text-neutral-900 shadow-lg',
      success: 'bg-success-500 text-white shadow-lg',
      warning: 'bg-warning-500 text-white shadow-lg',
      error: 'bg-error-500 text-white shadow-lg',
      neutral: 'bg-neutral-200 text-neutral-700 border border-neutral-300',
      gradient: 'bg-primary-500 text-white shadow-lg',
    }

    const sizes = {
      sm: 'px-3 py-1 text-xs',
      md: 'px-4 py-1.5 text-sm',
      lg: 'px-5 py-2 text-base',
    }

    return (
      <span
        ref={ref}
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </span>
    )
  },
)

Badge.displayName = 'Badge'
