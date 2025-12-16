import React from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  align?: 'center' | 'left'
  left?: React.ReactNode
  right?: React.ReactNode
  className?: string
}

/**
 * 페이지 상단 헤더 컴포넌트
 * - align: center(기본) | left
 * - left/right: 버튼, 뒤로가기 등 slot
 */
export default function PageHeader({
  title,
  subtitle,
  align = 'center',
  left,
  right,
  className = '',
}: PageHeaderProps) {
  const isCenter = align === 'center'
  return (
    <div
      className={
        (isCenter
          ? 'mb-8 flex flex-col items-center justify-center text-center'
          : 'mb-8 flex items-center justify-between') +
        ' ' +
        className
      }
    >
      {!isCenter && left && <div className="mr-4 flex-shrink-0">{left}</div>}
      <div className={isCenter ? '' : 'flex-1'}>
        <h1
          className={
            'mb-2 font-bold ' +
            (isCenter
              ? 'text-primary-500 text-4xl'
              : 'text-primary-500 text-3xl')
          }
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={
              isCenter
                ? 'text-lg text-neutral-600'
                : 'text-base text-neutral-600'
            }
          >
            {subtitle}
          </p>
        )}
        <div
          className={
            isCenter
              ? 'bg-primary-500 mx-auto mt-4 h-1 w-24 rounded-full'
              : 'bg-primary-500 mt-4 h-1 w-24 rounded-full'
          }
        />
      </div>
      {!isCenter && right && <div className="ml-4 flex-shrink-0">{right}</div>}
    </div>
  )
}
