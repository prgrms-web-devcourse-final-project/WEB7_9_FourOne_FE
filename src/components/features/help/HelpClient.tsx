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
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <div className="border-t-primary-500 h-8 w-8 animate-spin rounded-full border-2 border-neutral-300"></div>
          <span className="ml-3 text-neutral-600">도움말을 불러오는 중...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <Card variant="outlined">
          <CardContent className="p-6">
            <div className="text-center">
              <HelpCircle className="mx-auto mb-4 h-12 w-12 text-neutral-400" />
              <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                도움말을 불러올 수 없습니다
              </h3>
              <p className="text-sm text-neutral-600">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-4">
        {guides.length === 0 ? (
          <Card variant="outlined">
            <CardContent className="p-6">
              <div className="text-center">
                <HelpCircle className="mx-auto mb-4 h-12 w-12 text-neutral-400" />
                <p className="text-neutral-600">등록된 도움말이 없습니다.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          guides.map((guide) => (
            <Card key={guide.id} variant="outlined">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-primary-100 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <span className="text-primary-600 text-sm font-semibold">
                      {guide.id}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap text-neutral-700">
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
