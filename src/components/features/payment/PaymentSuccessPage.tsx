'use client'

/**
 * 결제 성공 페이지
 *
 * 흐름:
 * 1. URL에서 paymentId 추출
 * 2. 결제 상태 조회 API 호출
 * 3. 상태가 SUCCESS인지 확인
 * 4. 성공/실패 UI 표시
 * 5. 웹훅이 완전히 처리될 때까지 폴링
 */

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createPayment } from '@/lib/api/payment'
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
import { CheckCircle, Clock, AlertCircle, ArrowRight } from 'lucide-react'

export function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const paymentId = searchParams.get('paymentId')
  const winnerId = searchParams.get('winnerId')
  const amount = searchParams.get('amount')
  const [status, setStatus] = useState<'pending' | 'created'>('pending')
  const [confirmStatus, setConfirmStatus] = useState<
    'pending' | 'confirmed' | 'timeout'
  >('pending')

  useEffect(() => {
    if (!paymentId || !winnerId || !amount) {
      router.push('/payments/fail?reason=invalid')
      return
    }

    const paymentIdNumber = parseInt(paymentId, 10)
    const winnerIdNumber = parseInt(winnerId, 10)
    const amountNumber = parseInt(amount, 10)
    if (
      isNaN(paymentIdNumber) ||
      isNaN(winnerIdNumber) ||
      isNaN(amountNumber)
    ) {
      router.push('/payments/fail?reason=invalid')
      return
    }

    // 결제 생성 호출 (prepare 후 create로 종료)
    createPayment(winnerIdNumber, amountNumber)
      .then(() => {
        setStatus('created')
        setConfirmStatus('confirmed')
      })
      .catch((err: any) => {
        console.error('Failed to create payment:', err)
        router.push(
          `/payments/fail?paymentId=${paymentId}&reason=${encodeURIComponent(err?.message || 'unknown')}`,
        )
      })
  }, [paymentId, winnerId, amount, router])

  if (!paymentId) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        {/* 로딩 상태 */}
        {confirmStatus === 'pending' && (
          <div className="space-y-4 p-8 text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
            </div>
            <div>
              <h2 className="mb-2 text-xl font-bold">결제 확인 중</h2>
              <p className="text-sm text-gray-600">
                결제 상태를 최종 확인하고 있습니다.
              </p>
              <p className="mt-2 text-xs text-gray-500">
                이 과정은 몇 초 정도 소요됩니다.
              </p>
            </div>
          </div>
        )}

        {/* 성공 상태 */}
        {confirmStatus === 'confirmed' && status === 'created' && (
          <div className="space-y-6 p-8">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>

            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold text-gray-900">
                결제가 완료되었습니다
              </h2>
              <p className="text-gray-600">
                안전하게 결제되었으며, 이용에 감사합니다.
              </p>
            </div>

            {/* 결제 정보 */}
            <div className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">결제 ID:</span>
                <span className="font-mono text-xs">{paymentId}</span>
              </div>
              {amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">금액:</span>
                  <span className="font-bold">
                    {Number(amount).toLocaleString('ko-KR')}원
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">상태:</span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  완료
                </span>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="space-y-2">
              <Button className="w-full" size="lg">
                주문 상세 보기 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full" size="lg">
                홈으로 돌아가기
              </Button>
            </div>
          </div>
        )}

        {/* 타임아웃 상태 */}
        {confirmStatus === 'timeout' && (
          <div className="space-y-6 p-8">
            <div className="flex justify-center">
              <div className="rounded-full bg-yellow-100 p-3">
                <Clock className="h-12 w-12 text-yellow-600" />
              </div>
            </div>

            <div className="text-center">
              <h2 className="mb-2 text-xl font-bold text-gray-900">
                결제 처리 중입니다
              </h2>
              <p className="text-sm text-gray-600">
                결제 상태를 최종 확인할 수 없습니다.
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="mb-2 text-sm">
                  <strong>해결 방법:</strong>
                </p>
                <ul className="ml-2 space-y-1 text-xs">
                  <li>• 잠시 후 다시 확인해주세요</li>
                  <li>• 이메일로 결제 결과를 안내드립니다</li>
                  <li>• 문제 지속 시 고객센터에 문의하세요</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => router.push('/my-products')}
              >
                내 상품 보기
              </Button>
              <Button variant="outline" className="w-full">
                고객센터 문의
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
