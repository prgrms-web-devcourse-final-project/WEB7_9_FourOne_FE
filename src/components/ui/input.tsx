import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  variant?: 'default' | 'filled' | 'outlined'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      variant = 'default',
      ...props
    },
    ref,
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

    const variants = {
      default:
        'bg-white/80 backdrop-blur-sm border-neutral-200/50 focus:border-primary-300 focus:ring-primary-200',
      filled:
        'bg-neutral-50 border-neutral-200 focus:border-primary-300 focus:ring-primary-200 focus:bg-white',
      outlined:
        'bg-transparent border-2 border-neutral-300 focus:border-primary-500 focus:ring-primary-200',
    }

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-neutral-700"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <div className="text-neutral-600">{leftIcon}</div>
            </div>
          )}

          <input
            id={inputId}
            className={cn(
              'block w-full rounded-xl px-4 py-3 text-sm font-medium placeholder-neutral-400 shadow-sm transition-all duration-200 focus:ring-2 focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-500',
              leftIcon && 'pl-12',
              rightIcon && 'pr-12',
              error
                ? 'border-error-500 focus:ring-error-200 focus:border-error-500 border-2'
                : variants[variant],
              className,
            )}
            ref={ref}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
              <div className="text-neutral-600">{rightIcon}</div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-error-600 animate-fade-in text-sm font-medium">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="text-sm text-neutral-500">{helperText}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
