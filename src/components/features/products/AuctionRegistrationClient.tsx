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

  // 개발 모드 감지
  const isDev = process.env.NODE_ENV === 'development'

  // datetime-local 입력에 맞는 포맷으로 변환 (YYYY-MM-DDTHH:MM)
  const toLocalDateTimeInput = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1)
    const day = pad(date.getDate())
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // 개발 모드: 기본값 자동 입력
  const fillDevDefaults = () => {
    const now = new Date()
    const start = new Date(now.getTime() + 5 * 60 * 1000) // 지금으로부터 5분 후 시작
    const end = new Date(start.getTime() + 60 * 60 * 1000) // 시작 후 60분 후 종료

    setFormData({
      startPrice: '50000',
      buyNowPrice: '100000',
      minBidStep: '1000',
      startAt: toLocalDateTimeInput(start),
      endAt: toLocalDateTimeInput(end),
    })
    setErrors({})
  }

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
            // 요구사항: 경매 등록 후 상품 상세 페이지로 이동 (productId 기준)
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
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 개발 모드: 기본값 자동 입력 버튼 */}
      {isDev && (
        <div className="mb-6">
          <Button
            type="button"
            variant="outline"
            onClick={fillDevDefaults}
            className="w-full border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 text-amber-700 hover:border-amber-300 hover:bg-linear-to-r hover:from-amber-100 hover:to-orange-100"
          >
            🚀 개발 모드: 경매 기본값 자동 입력
          </Button>
        </div>
      )}
      <Card variant="outlined" className="border-neutral-200 shadow-sm">
        <CardContent className="p-8">
          <h2 className="mb-2 text-2xl font-bold text-neutral-900">
            경매 등록
          </h2>
          <p className="mb-6 text-sm text-neutral-600">
            상품:{' '}
            <span className="font-semibold text-neutral-900">
              {productName}
            </span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 시작가 */}
            <div>
              <label className="mb-2.5 block text-sm font-semibold text-neutral-700">
                시작가
                <span className="ml-1 text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="startPrice"
                value={formData.startPrice}
                onChange={handleInputChange}
                placeholder="예: 50000"
                className={`transition-colors ${
                  errors.startPrice
                    ? 'border-red-300 bg-red-50 focus:border-red-500'
                    : 'border-neutral-300'
                }`}
              />
              {errors.startPrice && (
                <p className="mt-2 text-sm font-medium text-red-500">
                  ⚠️ {errors.startPrice}
                </p>
              )}
              <div className="mt-2 text-xs text-neutral-500">
                경매 시작가를 입력해주세요 (최소 1,000원)
              </div>
            </div>

            {/* 즉시 구매가 */}
            <div>
              <label className="mb-2.5 block text-sm font-semibold text-neutral-700">
                즉시 구매가
                <span className="ml-1 text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="buyNowPrice"
                value={formData.buyNowPrice}
                onChange={handleInputChange}
                placeholder="예: 100000"
                className={`transition-colors ${
                  errors.buyNowPrice
                    ? 'border-red-300 bg-red-50 focus:border-red-500'
                    : 'border-neutral-300'
                }`}
              />
              {errors.buyNowPrice && (
                <p className="mt-2 text-sm font-medium text-red-500">
                  ⚠️ {errors.buyNowPrice}
                </p>
              )}
              <div className="mt-2 text-xs text-neutral-500">
                즉시 구매 가능한 가격을 입력해주세요 (시작가보다 높아야 함)
              </div>
            </div>

            {/* 최소 입찰 단위 */}
            <div>
              <label className="mb-2.5 block text-sm font-semibold text-neutral-700">
                최소 입찰 단위
                <span className="ml-1 text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="minBidStep"
                value={formData.minBidStep}
                onChange={handleInputChange}
                placeholder="예: 1000"
                className={`transition-colors ${
                  errors.minBidStep
                    ? 'border-red-300 bg-red-50 focus:border-red-500'
                    : 'border-neutral-300'
                }`}
              />
              {errors.minBidStep && (
                <p className="mt-2 text-sm font-medium text-red-500">
                  ⚠️ {errors.minBidStep}
                </p>
              )}
              <div className="mt-2 text-xs text-neutral-500">
                입찰 시 최소 증가 금액을 입력해주세요 (최소 100원)
              </div>
            </div>

            {/* 경매 시작 시간 */}
            <div>
              <label className="mb-2.5 block text-sm font-semibold text-neutral-700">
                경매 시작 시간
                <span className="ml-1 text-red-500">*</span>
              </label>
              <Input
                type="datetime-local"
                name="startAt"
                value={formData.startAt}
                onChange={handleInputChange}
                className={`transition-colors ${
                  errors.startAt
                    ? 'border-red-300 bg-red-50 focus:border-red-500'
                    : 'border-neutral-300'
                }`}
              />
              {errors.startAt && (
                <p className="mt-2 text-sm font-medium text-red-500">
                  ⚠️ {errors.startAt}
                </p>
              )}
              <div className="mt-2 text-xs text-neutral-500">
                경매가 시작되는 시간을 선택해주세요
              </div>
            </div>

            {/* 경매 종료 시간 */}
            <div>
              <label className="mb-2.5 block text-sm font-semibold text-neutral-700">
                경매 종료 시간
                <span className="ml-1 text-red-500">*</span>
              </label>
              <Input
                type="datetime-local"
                name="endAt"
                value={formData.endAt}
                onChange={handleInputChange}
                className={`transition-colors ${
                  errors.endAt
                    ? 'border-red-300 bg-red-50 focus:border-red-500'
                    : 'border-neutral-300'
                }`}
              />
              {errors.endAt && (
                <p className="mt-2 text-sm font-medium text-red-500">
                  ⚠️ {errors.endAt}
                </p>
              )}
              <div className="mt-2 text-xs text-neutral-500">
                경매가 종료되는 시간을 선택해주세요
              </div>
            </div>

            {/* 안내 메시지 */}
            <div className="rounded-lg border border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                ⚠️ 경매 등록 후에는 수정하거나 삭제할 수 없습니다. 신중하게
                입력해주세요.
              </p>
            </div>

            {/* 버튼 */}
            <div className="flex items-center justify-between gap-3 pt-4">
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
                className="h-12 flex-1 border-neutral-300 font-semibold text-neutral-700 transition-all hover:border-neutral-400 hover:bg-neutral-50"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary-600 hover:bg-primary-700 h-12 flex-1 font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:bg-neutral-400"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>등록 중...</span>
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
