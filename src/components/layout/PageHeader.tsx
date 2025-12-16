'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageHeaderProps {
  title: string
  description?: string
  showBackButton?: boolean
  backHref?: string
  rightAction?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  showBackButton = false,
  backHref = '/',
  rightAction,
}: PageHeaderProps) {
  return (
    <div className="border-b border-neutral-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <Link
                href={backHref}
                className="hover:text-primary-500 flex items-center space-x-2 rounded-lg px-3 py-2 text-neutral-600 transition-colors hover:bg-neutral-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}

            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-neutral-900">{title}</h1>
              {description && (
                <p className="mt-1 text-sm text-neutral-600">{description}</p>
              )}
            </div>
          </div>

          {rightAction && (
            <div className="flex items-center space-x-2">{rightAction}</div>
          )}
        </div>
      </div>
    </div>
  )
}
