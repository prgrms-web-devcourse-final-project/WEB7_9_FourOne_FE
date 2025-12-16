'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorAlert } from '@/components/ui/error-alert'
import { reviewApi } from '@/lib/api'
import { Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ReviewClientProps {
  productId: number
  productName: string
}

export function ReviewClient({ productId, productName }: ReviewClientProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    comment: '',
    isSatisfied: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))

    // 에러 메시지 초기화
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }

    // API 에러 초기화
    if (apiError) {
      setApiError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setApiError('')

    // 유효성 검사
    const newErrors: Record<string, string> = {}

    if (!formData.comment.trim()) {
      newErrors.comment = '리뷰 내용을 입력해주세요'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      try {
        // 리뷰 작성 API 호출
        const response = await reviewApi.createReview({
          productId,
          comment: formData.comment,
          isSatisfied: formData.isSatisfied,
        })

        console.log('🔍 리뷰 작성 API 응답 전체:', response)

        if (response.success) {
          console.log('✅ 리뷰 작성 성공:', response.data)
          alert('리뷰가 성공적으로 등록되었습니다.')
          router.back()
        } else {
          console.log('❌ 리뷰 작성 실패:', response)
          setApiError('리뷰 등록에 실패했습니다. 다시 시도해주세요.')
        }
      } catch (error: any) {
        console.error('API 에러:', error)
        if (error.response?.status === 400) {
          const errorMessage =
            error.response.data?.errorMessage || '입력 정보를 확인해주세요.'
          setApiError(`요청 실패: ${errorMessage}`)
        } else {
          setApiError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        }
      }
    }

    setIsLoading(false)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <Card variant="outlined">
        <CardContent className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900">리뷰 작성</h1>
            <p className="mt-2 text-neutral-600">
              <span className="font-medium">{productName}</span>에 대한 리뷰를
              작성해주세요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* API 에러 메시지 */}
            {apiError && (
              <ErrorAlert
                title="요청 실패"
                message={apiError}
                onClose={() => setApiError('')}
              />
            )}

            {/* 만족도 평가 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                거래 만족도 *
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isSatisfied"
                    checked={formData.isSatisfied === true}
                    onChange={() =>
                      setFormData((prev) => ({ ...prev, isSatisfied: true }))
                    }
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 flex items-center text-green-600">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="ml-1">만족</span>
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isSatisfied"
                    checked={formData.isSatisfied === false}
                    onChange={() =>
                      setFormData((prev) => ({ ...prev, isSatisfied: false }))
                    }
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 flex items-center text-red-600">
                    <Star className="h-4 w-4" />
                    <span className="ml-1">불만족</span>
                  </span>
                </label>
              </div>
            </div>

            {/* 리뷰 내용 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                리뷰 내용 *
              </label>
              <textarea
                name="comment"
                value={formData.comment}
                onChange={handleInputChange}
                placeholder="거래 경험에 대해 자세히 작성해주세요"
                rows={6}
                className="focus:ring-primary-500 focus:border-primary-500 block w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:outline-none"
              />
              <div className="mt-2 text-sm text-neutral-500">
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    상품 상태, 배송, 판매자와의 소통 등에 대해 작성해주세요
                  </li>
                  <li>개인정보나 욕설은 포함하지 마세요</li>
                  <li>최소 10자 이상 작성해주세요</li>
                </ul>
              </div>
              {errors.comment && (
                <p className="text-error-500 mt-1 text-sm">{errors.comment}</p>
              )}
            </div>

            {/* 제출 버튼 */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                취소
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    등록 중...
                  </div>
                ) : (
                  '리뷰 등록'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
