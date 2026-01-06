'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Home } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export function PaymentFailClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const code = searchParams.get('code')
  const message = searchParams.get('message')
  const orderId = searchParams.get('orderId')

  const getErrorMessage = (errorCode: string | null) => {
    const errorMap: Record<string, string> = {
      INVALID_CARD: '유효하지 않은 카드입니다.',
      CARD_DECLINED: '카드사에서 거절했습니다.',
      EXPIRED_CARD: '만료된 카드입니다.',
      INSUFFICIENT_BALANCE: '잔액이 부족합니다.',
      INVALID_MERCHANT: '가맹점 정보가 유효하지 않습니다.',
      INVALID_AMOUNT: '유효하지 않은 금액입니다.',
      USER_CANCEL: '사용자가 결제를 취소했습니다.',
    }
    return errorMap[errorCode || ''] || '결제 처리 중 오류가 발생했습니다.'
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-red-50 p-4">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-neutral-900">
            결제에 실패했습니다
          </h1>
          <p className="mb-6 text-neutral-600">{getErrorMessage(code)}</p>

          <div className="mb-8 space-y-3 text-left">
            {code && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="mb-1 text-xs text-neutral-600">오류 코드</p>
                <p className="font-mono text-sm text-neutral-900">{code}</p>
              </div>
            )}
            {message && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="mb-1 text-xs text-neutral-600">상세 정보</p>
                <p className="text-sm text-neutral-900">{message}</p>
              </div>
            )}
            {orderId && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="mb-1 text-xs text-neutral-600">주문 번호</p>
                <p className="font-mono text-sm text-neutral-900">{orderId}</p>
              </div>
            )}
          </div>

          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Button
              onClick={() => router.back()}
              className="bg-primary-600 hover:bg-primary-700 flex-1"
            >
              이전으로 돌아가기
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/bid-status')}
              className="flex-1"
            >
              입찰 내역
            </Button>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-left">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900">
              결제 실패 시 확인사항
            </h3>
            <ul className="space-y-2 text-xs text-neutral-700">
              <li className="flex gap-2">
                <span className="shrink-0 text-neutral-400">•</span>
                <span>카드사에 연락하여 거절 사유를 확인해주세요</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-neutral-400">•</span>
                <span>다른 결제 수단으로 다시 시도해보세요</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-neutral-400">•</span>
                <span>카드의 유효기간과 한도를 확인해주세요</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-neutral-400">•</span>
                <span>결제 금액이 정확한지 다시 확인해주세요</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
