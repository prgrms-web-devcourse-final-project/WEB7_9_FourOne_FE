'use client'

import { Card, CardContent } from '@/components/ui/card'
import { adminApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import { showErrorToast } from '@/lib/utils/toast'
import { HelpCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Guide {
  id: number
  content: string
}

export function HelpClient() {
  const [guides, setGuides] = useState<Guide[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHelp = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await adminApi.getHelp()

        if (response.success && response.data) {
          setGuides(response.data.guides || [])
        } else {
          setError(
            response.message ||
              response.msg ||
              '판매 가이드를 불러올 수 없습니다.',
          )
        }
      } catch (error: any) {
        console.error('도움말 조회 실패:', error)
        const apiError = handleApiError(error)
        setError(apiError.message)
        showErrorToast(apiError.message, '판매 가이드 조회 실패')
      } finally {
        setIsLoading(false)
      }
    }

    fetchHelp()
  }, [])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="border-primary-200 border-t-primary-600 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2"></div>
            <span className="text-sm text-neutral-600">로드 중...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-neutral-100 p-4">
                <HelpCircle className="h-8 w-8 text-neutral-400" />
              </div>
            </div>
            <h3 className="mb-2 text-base font-semibold text-neutral-900">
              가이드를 불러올 수 없습니다
            </h3>
            <p className="text-sm text-neutral-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-3">
        {guides.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-neutral-100 p-4">
                  <HelpCircle className="h-8 w-8 text-neutral-400" />
                </div>
              </div>
              <p className="text-sm text-neutral-600">
                등록된 가이드가 없습니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          guides.map((guide, index) => (
            <Card key={guide.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary-50 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                    <span className="text-primary-600 text-sm font-semibold">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-700">
                      {guide.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
