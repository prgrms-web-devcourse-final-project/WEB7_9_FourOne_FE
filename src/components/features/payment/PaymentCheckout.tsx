'use client'

/**
 * 결제 진행 UI
 *
 * 플로우:
 * 1. 상품 정보 확인
 * 2. 카드 선택 (또는 새로운 카드 추가)
 * 3. 결제 요청 생성 → paymentId 획득
 * 4. Toss PaymentWidget 통합해서 결제 승인
 * 5. 성공/실패 페이지로 리다이렉트
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePaymentFlow } from '@/hooks/usePaymentFlow'
import { usePaymentMethods } from '@/hooks/usePaymentMethods'
import { CardResponse } from '@/lib/api/payment'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, Check, ChevronRight } from 'lucide-react'

export interface PaymentCheckoutProps {
  // 상품 정보
  orderId: string
  amount: number
  orderName: string
  customerEmail?: string
  customerName?: string
  customerPhone?: string
}

type PaymentStep = 'method-selection' | 'confirm' | 'processing'

export function PaymentCheckout({
  orderId,
  amount,
  orderName,
  customerEmail,
  customerName,
  customerPhone,
}: PaymentCheckoutProps) {
  const router = useRouter()
  const { preparePaymentRequest, createPaymentRequest, loading, error } =
    usePaymentFlow()
  const { methods } = usePaymentMethods()
  const [step, setStep] = useState<PaymentStep>('method-selection')
  const [selectedMethod, setSelectedMethod] = useState<CardResponse | null>(
    null,
  )
  const [paymentId, setPaymentId] = useState<number | null>(null)
  const [showMethodDialog, setShowMethodDialog] = useState(false)

  /**
   * Step 1: 카드 선택
   */
  const handleSelectMethod = useCallback((method: CardResponse) => {
    setSelectedMethod(method)
    setShowMethodDialog(false)
    setStep('confirm')
  }, [])

  /**
   * Step 2: 결제 준비
   * - winnerId로 paymentId 획득
   * - Toss PaymentWidget 결제 버튼 활성화
   */
  const handlePreparePayment = useCallback(
    async (winnerId: number) => {
      try {
        setStep('processing')
        const result = await preparePaymentRequest(winnerId)
        setPaymentId(result.paymentId)

        // TODO: Toss PaymentWidget 결제 승인 단계로 진행
        // - 성공 시 /payments/success?paymentId={paymentId}&winnerId={winnerId}&amount={amount}로 리다이렉트
        // - 실패 시 /payments/fail?paymentId={paymentId}&winnerId={winnerId}&amount={amount}로 리다이렉트
        // - 성공 페이지에서 createPaymentRequest(winnerId, amount) 호출
      } catch (err) {
        console.error('Failed to prepare payment:', err)
        setStep('confirm')
      }
    },
    [preparePaymentRequest],
  )

  const handleBackToMethodSelection = () => {
    setSelectedMethod(null)
    setPaymentId(null)
    setStep('method-selection')
  }

  // 결제 수단 없음
  if (methods.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold">결제 수단이 없습니다</h3>
          <p className="mb-6 text-gray-600">
            결제하기 전에 카드를 먼저 등록하세요
          </p>
          <Button onClick={() => router.push('/payment-methods')}>
            카드 등록하러 가기
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 에러 표시 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 상품 정보 */}
      <Card className="p-6">
        <h3 className="mb-4 font-semibold">주문 정보</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">상품명:</span>
            <span className="font-medium">{orderName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">금액:</span>
            <span className="text-lg font-bold">
              {amount.toLocaleString('ko-KR')}원
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">주문번호:</span>
            <span className="text-xs text-gray-500">{orderId}</span>
          </div>
        </div>
      </Card>

      {/* Step 1: 결제 수단 선택 */}
      {step === 'method-selection' && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">결제 수단 선택</h3>
            <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
              1단계
            </span>
          </div>

          <div className="mb-6 space-y-2">
            {methods.map((method: CardResponse) => (
              <div
                key={method.id}
                className={`cursor-pointer rounded-lg border-2 p-4 transition ${
                  selectedMethod?.id === method.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSelectMethod(method)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">
                      {method.cardCompany || '카드'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {method.cardNumberMasked || '카드 번호 없음'}
                    </p>
                  </div>
                  {selectedMethod?.id === method.id && (
                    <Check className="h-5 w-5 text-blue-500" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/payment-methods')}
          >
            다른 카드 추가 또는 관리
          </Button>
        </Card>
      )}

      {/* Step 2: 결제 확인 */}
      {step === 'confirm' && selectedMethod && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">결제 확인</h3>
            <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
              2단계
            </span>
          </div>

          <div className="mb-6 space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">결제 수단:</span>
              <span className="font-medium">
                {selectedMethod.cardCompany || '카드'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">카드 번호:</span>
              <span>{selectedMethod.cardNumberMasked || '카드 번호 없음'}</span>
            </div>
            <div className="mt-2 border-t border-gray-200 pt-2">
              <div className="flex justify-between text-base font-bold">
                <span>총 결제 금액:</span>
                <span className="text-blue-600">
                  {amount.toLocaleString('ko-KR')}원
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBackToMethodSelection}
              disabled={loading}
              className="flex-1"
            >
              이전
            </Button>
            <Button
              onClick={() => handlePreparePayment(1)}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  처리 중...
                </>
              ) : (
                <>
                  결제하기 <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: 처리 중 */}
      {step === 'processing' && paymentId && (
        <Card className="p-8">
          <div className="space-y-4 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <div>
              <h3 className="mb-2 text-lg font-semibold">결제 처리 중</h3>
              <p className="text-sm text-gray-600">잠시만 기다려주세요.</p>
            </div>
          </div>
        </Card>
      )}

      {/* 하단 안내 */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        ⚠️ <span className="font-medium">중요:</span> 결제는 암호화되어 안전하게
        처리됩니다. 절대 새로고침하지 마세요.
      </div>
    </div>
  )
}
