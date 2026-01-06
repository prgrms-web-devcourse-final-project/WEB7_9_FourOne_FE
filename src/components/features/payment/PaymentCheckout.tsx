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
import { Card, CardContent } from '@/components/ui/card'
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
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-neutral-100 p-4">
                <AlertCircle className="h-8 w-8 text-neutral-400" />
              </div>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">
              등록된 결제 수단이 없습니다
            </h2>
            <p className="mb-8 text-sm text-neutral-600">
              결제를 진행하려면 카드를 먼저 등록해주세요.
            </p>
            <Button
              onClick={() => router.push('/payment-methods')}
              className="bg-primary-600 hover:bg-primary-700"
            >
              결제 수단 등록
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 에러 표시 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 상품 정보 */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-6 text-base font-semibold text-neutral-900">
            주문 정보
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-neutral-100 pb-3">
              <span className="text-neutral-600">상품명</span>
              <span className="font-medium text-neutral-900">{orderName}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-3">
              <span className="text-neutral-600">주문번호</span>
              <span className="font-mono text-xs text-neutral-500">
                {orderId}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-neutral-600">결제 금액</span>
              <span className="text-primary-600 text-lg font-semibold">
                {amount.toLocaleString('ko-KR')}원
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: 결제 수단 선택 */}
      {step === 'method-selection' && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-900">
                결제 수단 선택
              </h3>
              <span className="bg-primary-50 text-primary-700 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium">
                단계 1
              </span>
            </div>

            <div className="mb-6 space-y-3">
              {methods.map((method: CardResponse) => (
                <div
                  key={method.id}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition ${
                    selectedMethod?.id === method.id
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                  onClick={() => handleSelectMethod(method)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">
                        {method.cardCompany || '카드'}
                      </p>
                      <p className="font-mono text-sm text-neutral-600">
                        {method.cardNumberMasked || '카드 번호 없음'}
                      </p>
                    </div>
                    {selectedMethod?.id === method.id && (
                      <Check className="text-primary-600 h-5 w-5" />
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
              다른 결제 수단 추가
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: 결제 확인 */}
      {step === 'confirm' && selectedMethod && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-900">
                결제 확인
              </h3>
              <span className="bg-primary-50 text-primary-700 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium">
                단계 2
              </span>
            </div>

            <div className="mb-6 space-y-3 rounded-lg bg-neutral-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">결제 수단</span>
                <span className="font-medium text-neutral-900">
                  {selectedMethod.cardCompany || '카드'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">카드 번호</span>
                <span className="font-mono text-neutral-900">
                  {selectedMethod.cardNumberMasked || '카드 번호 없음'}
                </span>
              </div>
              <div className="mt-3 border-t border-neutral-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-neutral-600">결제 금액</span>
                  <span className="text-primary-600 text-base font-semibold">
                    {amount.toLocaleString('ko-KR')}원
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
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
                className="bg-primary-600 hover:bg-primary-700 flex-1"
              >
                {loading ? (
                  <>
                    <div className="border-primary-200 mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-white"></div>
                    처리 중
                  </>
                ) : (
                  <>
                    결제 진행 <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: 처리 중 */}
      {step === 'processing' && paymentId && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mb-4 flex justify-center">
              <div className="border-primary-200 border-t-primary-600 h-10 w-10 animate-spin rounded-full border-2"></div>
            </div>
            <h3 className="mb-2 text-base font-semibold text-neutral-900">
              결제 진행 중
            </h3>
            <p className="text-sm text-neutral-600">
              결제를 처리하고 있습니다. 잠시만 기다려주세요.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 하단 보안 안내 */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
        <p className="text-neutral-700">
          <span className="font-semibold">보안 안내:</span> 결제 진행 중에는
          페이지를 새로고침하거나 뒤로 가기를 하지 마세요. 결제 정보는
          암호화되어 안전하게 처리됩니다.
        </p>
      </div>
    </div>
  )
}
