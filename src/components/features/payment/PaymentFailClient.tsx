'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <Card variant="outlined">
        <CardContent className="py-12 text-center">
          <div className="mb-6 text-6xl">❌</div>
          <h1 className="mb-4 text-3xl font-bold text-red-600">결제 실패</h1>

          <div className="mb-6 space-y-2 text-left">
            {code && (
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-600">
                  <strong>오류 코드:</strong> {code}
                </p>
              </div>
            )}
            {message && (
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-neutral-700">
                  <strong>오류 메시지:</strong> {message}
                </p>
              </div>
            )}
            <div className="rounded-lg bg-yellow-50 p-4">
              <p className="text-yellow-800">{getErrorMessage(code)}</p>
            </div>
          </div>

          {orderId && (
            <div className="mb-6 rounded-lg bg-gray-100 p-4 font-mono text-sm">
              <p className="text-gray-600">
                <strong>주문번호:</strong> {orderId}
              </p>
            </div>
          )}

          <div className="space-x-3">
            <Button
              onClick={() => router.back()}
              size="lg"
              className="bg-red-600 hover:bg-red-700"
            >
              이전으로 돌아가기
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push('/bid-status')}
            >
              입찰 내역 보기
            </Button>
          </div>

          <div className="mt-8 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 text-left">
            <h3 className="mb-2 text-sm font-semibold text-blue-900">
              💡 결제 실패 시 조치사항
            </h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• 카드사에 문의하여 거절 사유를 확인해주세요</li>
              <li>• 다른 결제수단으로 다시 시도해보세요</li>
              <li>• 결제 금액이 정확한지 확인해주세요</li>
              <li>• 카드 보안 설정을 확인해주세요</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
