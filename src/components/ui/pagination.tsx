'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  hasNext?: boolean
  hasPrevious?: boolean
  isLoading?: boolean
  className?: string
  showPageNumbers?: boolean
  maxVisiblePages?: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  hasNext = true,
  hasPrevious = true,
  isLoading = false,
  className,
  showPageNumbers = true,
  maxVisiblePages = 5,
}: PaginationProps) {
  // 표시할 페이지 번호들 계산
  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const half = Math.floor(maxVisiblePages / 2)
    let start = Math.max(1, currentPage - half)
    let end = Math.min(totalPages, start + maxVisiblePages - 1)

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1)
    }

    const pages = []
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    return pages
  }

  const visiblePages = getVisiblePages()

  // totalPages가 1이어도 페이지 정보는 표시 (디버깅용)
  // if (totalPages <= 1) {
  //   return null
  // }

  return (
    <div
      className={cn('flex items-center justify-center space-x-2', className)}
    >
      {/* 이전 버튼 */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevious || isLoading || currentPage <= 1}
        className="flex items-center space-x-1"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>이전</span>
      </Button>

      {/* 페이지 번호들 */}
      {showPageNumbers && (
        <>
          {/* 첫 페이지 */}
          {visiblePages[0] > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={isLoading}
                className="min-w-[40px]"
              >
                1
              </Button>
              {visiblePages[0] > 2 && (
                <div className="flex items-center">
                  <MoreHorizontal className="h-4 w-4 text-neutral-400" />
                </div>
              )}
            </>
          )}

          {/* 중간 페이지들 */}
          {visiblePages.map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page)}
              disabled={isLoading}
              className={cn(
                'min-w-[40px]',
                page === currentPage &&
                  'bg-primary-600 hover:bg-primary-700 text-white',
              )}
            >
              {page}
            </Button>
          ))}

          {/* 마지막 페이지 */}
          {visiblePages[visiblePages.length - 1] < totalPages && (
            <>
              {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                <div className="flex items-center">
                  <MoreHorizontal className="h-4 w-4 text-neutral-400" />
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={isLoading}
                className="min-w-[40px]"
              >
                {totalPages}
              </Button>
            </>
          )}
        </>
      )}

      {/* 다음 버튼 */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNext || isLoading || currentPage >= totalPages}
        className="flex items-center space-x-1"
      >
        <span>다음</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

// 페이지 정보 표시 컴포넌트
interface PaginationInfoProps {
  currentPage: number
  totalPages: number
  totalElements: number
  pageSize: number
  className?: string
}

export function PaginationInfo({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  className,
}: PaginationInfoProps) {
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalElements)

  return (
    <div className={cn('text-sm text-neutral-600', className)}>
      {totalElements > 0 ? (
        <>
          {startItem.toLocaleString()} - {endItem.toLocaleString()} /{' '}
          {totalElements.toLocaleString()}개<span className="mx-2">•</span>
          {currentPage} / {totalPages} 페이지
        </>
      ) : (
        '데이터가 없습니다'
      )}
    </div>
  )
}

// 페이지 크기 선택 컴포넌트
interface PageSizeSelectorProps {
  pageSize: number
  onPageSizeChange: (size: number) => void
  options?: number[]
  className?: string
}

export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  options = [10, 20, 50, 100],
  className,
}: PageSizeSelectorProps) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <span className="text-sm text-neutral-600">페이지당</span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="focus:border-primary-500 focus:ring-primary-500 rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm focus:ring-1 focus:outline-none"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}개
          </option>
        ))}
      </select>
    </div>
  )
}
