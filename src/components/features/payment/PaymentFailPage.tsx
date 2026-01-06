'use client'

/**
 * 결제 실패 페이지
 *
 * 흐름:
 * 1. Toss 리다이렉트 또는 수동으로 진입
 * 2. URL에서 paymentId, reason 추출
 * 3. 백엔드에 실패 상태 기록 (선택사항)
 * 4. 실패 원인 표시
 * 5. 재시도 또는 다른 카드로 결제 옵션 제공
 */

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { usePaymentFlow } from '@/hooks/usePaymentFlow'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, ArrowLeft, CreditCard } from 'lucide-react'

interface FailureReason {
  code: string
  message: string
  description: string
}

const FAILURE_REASONS: Record<string, FailureReason> = {
  INVALID_CARD: {
    code: 'INVALID_CARD',
    message: '유효하지 않은 카드입니다',
    description: '카드 정보를 다시 확인하고 다른 카드를 시도해주세요.',
  },
  DECLINED: {
    code: 'DECLINED',
    message: '결제가 거부되었습니다',
    description: '카드사에서 거부했습니다. 발급사에 문의하세요.',
  },
  INSUFFICIENT_FUNDS: {
    code: 'INSUFFICIENT_FUNDS',
    message: '잔액이 부족합니다',
    description: '계좌에 충분한 잔액이 없습니다. 다른 카드를 시도해주세요.',
  },
  EXPIRED_CARD: {
    code: 'EXPIRED_CARD',
    message: '카드 유효기간이 만료되었습니다',
    description: '유효한 카드로 다시 시도해주세요.',
  },
  UNKNOWN: {
    code: 'UNKNOWN',
    message: '결제 처리 중 오류가 발생했습니다',
    description: '다시 시도하거나 다른 카드를 사용해주세요.',
  },
}

export function PaymentFailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const paymentId = searchParams.get('paymentId')
  const reasonCode = searchParams.get('reason') || 'UNKNOWN'
  const { failPaymentRequest } = usePaymentFlow()
  const [isRetrying, setIsRetrying] = useState(false)
  const [recordingFailure, setRecordingFailure] = useState(false)

  const failureReason =
    FAILURE_REASONS[reasonCode] || FAILURE_REASONS['UNKNOWN']

  // 실패 상태를 백엔드에 기록 (선택사항)
  useEffect(() => {
    if (paymentId && !recordingFailure) {
      setRecordingFailure(true)
      const paymentIdNumber = parseInt(paymentId, 10)
      if (!isNaN(paymentIdNumber)) {
        failPaymentRequest(paymentIdNumber, reasonCode).catch((err) => {
          console.error('Failed to record payment failure:', err)
        })
      }
    }
  }, [paymentId, reasonCode, failPaymentRequest, recordingFailure])

  const handleRetry = () => {
    if (paymentId) {
      // 동일한 paymentId로 재시도하도록 설정
      // 또는 새로운 결제 요청을 시작하도록 리다이렉트
      router.push(`/checkout?paymentId=${paymentId}`)
    } else {
      router.push('/checkout')
    }
  }

  const handleChangeCard = () => {
    router.push('/payment-methods')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <div className="space-y-6 p-8">
          {/* 실패 아이콘 */}
          <div className="flex justify-center">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
          </div>

          {/* 실패 메시지 */}
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">
              결제에 실패했습니다
            </h2>
            <p className="text-gray-600">{failureReason.message}</p>
          </div>

          {/* 상세 설명 */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-1 font-medium">원인:</p>
              <p className="text-sm">{failureReason.description}</p>
            </AlertDescription>
          </Alert>

          {/* 결제 정보 */}
          <div className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">오류 코드:</span>
              <span className="font-mono text-xs text-red-600">
                {failureReason.code}
              </span>
            </div>
            {paymentId && (
              <div className="flex justify-between">
                <span className="text-gray-600">결제 ID:</span>
                <span className="font-mono text-xs">{paymentId}</span>
              </div>
            )}
          </div>

          {/* 다음 단계 가이드 */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
            <p className="mb-2 font-medium text-blue-900">💡</p>
            <ul className="space-y-1 text-xs text-blue-800">
              <li>✓ 카드 정보를 다시 확인하세요</li>
              <li>✓ 다른 카드로 결제를 시도하세요</li>
              <li>✓ 카드사에 결제 가능 여부를 확인하세요</li>
            </ul>
          </div>

          {/* 액션 버튼 */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              홈으로 돌아가기
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
