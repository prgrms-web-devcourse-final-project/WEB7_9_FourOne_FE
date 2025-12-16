import { AlertCircle, X } from 'lucide-react'
import { Button } from './button'

interface ErrorAlertProps {
  title?: string
  message: string
  onClose?: () => void
  variant?: 'error' | 'warning' | 'info'
}

export function ErrorAlert({
  title = '오류 발생',
  message,
  onClose,
  variant = 'error',
}: ErrorAlertProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'error':
        return 'bg-error-50 border-error-200 text-error-800'
      case 'warning':
        return 'bg-warning-50 border-warning-200 text-warning-800'
      case 'info':
        return 'bg-info-50 border-info-200 text-info-800'
      default:
        return 'bg-error-50 border-error-200 text-error-800'
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${getVariantStyles()}`}>
      <div className="flex items-start">
        <AlertCircle className="text-error-500 mt-0.5 mr-3 h-5 w-5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="mt-1 text-sm">{message}</p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-error-400 hover:text-error-600 ml-3 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
