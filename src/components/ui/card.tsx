import { cn } from '@/lib/utils'
import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'glass' | 'gradient'
  hover?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant = 'default', hover = false, children, ...props },
    ref,
  ) => {
    const variants = {
      default: 'bg-white/90 backdrop-blur-sm',
      outlined: 'bg-white/90 backdrop-blur-sm border border-neutral-200/50',
      elevated: 'bg-white/95 backdrop-blur-sm shadow-lg shadow-neutral-200/50',
      glass: 'bg-white/10 backdrop-blur-md border border-white/20 shadow-xl',
      gradient: 'bg-white/90 backdrop-blur-sm border border-neutral-200',
    }

    const hoverClasses = hover
      ? 'transition-all duration-300 hover:shadow-xl hover:shadow-neutral-200/60 hover:-translate-y-1 hover:scale-[1.02]'
      : ''

    return (
      <div
        ref={ref}
        className={cn(
          'animate-fade-in rounded-2xl transition-all duration-200',
          variants[variant],
          hoverClasses,
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)

Card.displayName = 'Card'

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  gradient?: boolean
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, gradient = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-5',
          gradient
            ? 'border-b border-neutral-200 bg-neutral-50'
            : 'border-b border-neutral-200/50',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)

CardHeader.displayName = 'CardHeader'

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  gradient?: boolean
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, gradient = false, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          'text-xl font-bold tracking-tight',
          gradient ? 'text-primary-500' : 'text-neutral-900',
          className,
        )}
        {...props}
      >
        {children}
      </h3>
    )
  },
)

CardTitle.displayName = 'CardTitle'

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('px-6 py-5', className)} {...props}>
        {children}
      </div>
    )
  },
)

CardContent.displayName = 'CardContent'

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  gradient?: boolean
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, gradient = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-4',
          gradient
            ? 'border-t border-neutral-200 bg-neutral-50'
            : 'border-t border-neutral-200/50',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)

CardFooter.displayName = 'CardFooter'
