'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { auctionApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface AuctionRegistrationClientProps {
  productId: number
  productName: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function AuctionRegistrationClient({
  productId,
  productName,
  onSuccess,
  onCancel,
}: AuctionRegistrationClientProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    startPrice: '',
    buyNowPrice: '',
    minBidStep: '',
    startAt: '',
    endAt: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // 에러 메시지 초기화
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    // 유효성 검사
    const newErrors: Record<string, string> = {}

    const startPrice = Number(formData.startPrice.replace(/[^0-9]/g, ''))
    if (!formData.startPrice || startPrice < 1000) {
      newErrors.startPrice = '시작가는 1,000원 이상이어야 합니다'
    }

    const buyNowPrice = Number(formData.buyNowPrice.replace(/[^0-9]/g, ''))
    if (!formData.buyNowPrice || buyNowPrice < startPrice) {
      newErrors.buyNowPrice = '즉시 구매가는 시작가보다 높아야 합니다'
    }

    const minBidStep = Number(formData.minBidStep.replace(/[^0-9]/g, ''))
    if (!formData.minBidStep || minBidStep < 100) {
      newErrors.minBidStep = '최소 입찰 단위는 100원 이상이어야 합니다'
    }

    if (!formData.startAt) {
      newErrors.startAt = '경매 시작 시간을 선택해주세요'
    } else {
      const startDate = new Date(formData.startAt)
      const now = new Date()
      if (startDate <= now) {
        newErrors.startAt = '경매 시작 시간은 현재 시간 이후여야 합니다'
      }
    }

    if (!formData.endAt) {
      newErrors.endAt = '경매 종료 시간을 선택해주세요'
    } else if (formData.startAt) {
      const startDate = new Date(formData.startAt)
      const endDate = new Date(formData.endAt)
      if (endDate <= startDate) {
        newErrors.endAt = '경매 종료 시간은 시작 시간보다 늦어야 합니다'
      }
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      try {
        // ISO 8601 형식으로 변환
        const startAtISO = new Date(formData.startAt).toISOString()
        const endAtISO = new Date(formData.endAt).toISOString()

        const response = await auctionApi.createAuction({
          product_id: productId,
          startPrice: startPrice,
          buyNowPrice: buyNowPrice,
          midBidStep: minBidStep, // Swagger에서는 midBidStep
          startAt: startAtISO,
          endAt: endAtISO,
        })

        if (response.success) {
          showSuccessToast('경매가 성공적으로 등록되었습니다.')
          if (onSuccess) {
            onSuccess()
          } else {
            router.push(`/products/${productId}`)
          }
        } else {
          showErrorToast(
            response.message ||
              response.msg ||
              '경매 등록에 실패했습니다. 다시 시도해주세요.',
          )
        }
      } catch (error: any) {
        console.error('경매 등록 에러:', error)
        const apiError = handleApiError(error)
        showErrorToast(apiError.message)
      }
    }

    setIsLoading(false)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <Card variant="outlined">
        <CardContent className="p-6">
          <h2 className="mb-2 text-xl font-bold text-neutral-900">
            경매 등록
          </h2>
          <p className="mb-6 text-sm text-neutral-600">
            상품: <span className="font-medium">{productName}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 시작가 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                시작가 *
              </label>
              <Input
                type="text"
                name="startPrice"
                value={formData.startPrice}
                onChange={handleInputChange}
                placeholder="예: 50000"
                error={errors.startPrice}
              />
              <div className="mt-1 text-sm text-neutral-500">
                경매 시작가를 입력해주세요 (최소 1,000원)
              </div>
            </div>

            {/* 즉시 구매가 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                즉시 구매가 *
              </label>
              <Input
                type="text"
                name="buyNowPrice"
                value={formData.buyNowPrice}
                onChange={handleInputChange}
                placeholder="예: 100000"
                error={errors.buyNowPrice}
              />
              <div className="mt-1 text-sm text-neutral-500">
                즉시 구매 가능한 가격을 입력해주세요 (시작가보다 높아야 함)
              </div>
            </div>

            {/* 최소 입찰 단위 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                최소 입찰 단위 *
              </label>
              <Input
                type="text"
                name="minBidStep"
                value={formData.minBidStep}
                onChange={handleInputChange}
                placeholder="예: 1000"
                error={errors.minBidStep}
              />
              <div className="mt-1 text-sm text-neutral-500">
                입찰 시 최소 증가 금액을 입력해주세요 (최소 100원)
              </div>
            </div>

            {/* 경매 시작 시간 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                경매 시작 시간 *
              </label>
              <Input
                type="datetime-local"
                name="startAt"
                value={formData.startAt}
                onChange={handleInputChange}
                error={errors.startAt}
              />
              <div className="mt-1 text-sm text-neutral-500">
                경매가 시작되는 시간을 선택해주세요
              </div>
            </div>

            {/* 경매 종료 시간 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                경매 종료 시간 *
              </label>
              <Input
                type="datetime-local"
                name="endAt"
                value={formData.endAt}
                onChange={handleInputChange}
                error={errors.endAt}
              />
              <div className="mt-1 text-sm text-neutral-500">
                경매가 종료되는 시간을 선택해주세요
              </div>
            </div>

            {/* 안내 메시지 */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                ⚠️ 경매 등록 후에는 수정하거나 삭제할 수 없습니다. 신중하게
                입력해주세요.
              </p>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (onCancel) {
                    onCancel()
                  } else {
                    router.back()
                  }
                }}
                disabled={isLoading}
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
                  '경매 등록'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

