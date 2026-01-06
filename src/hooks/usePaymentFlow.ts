/**
 * 결제 플로우 관리 Hook (스웨거 기반)
 *
 * 역할:
 * 1. 결제 준비 (preparePayment) - winnerId로 paymentId 및 Toss 정보 획득
 * 2. 결제 생성 (createPayment) - 결제 완료 처리
 * 3. 결제 실패 (failPayment) - 실패 사유 기록
 *
 * 사용 예시:
 * const { preparePaymentRequest, createPaymentRequest, failPaymentRequest, payment, status, loading, error } = usePaymentFlow()
 *
 * // 결제 준비
 * const prepared = await preparePaymentRequest(winnerId)
 * // Toss Widget 결제 진행 후
 * await createPaymentRequest(winnerId, amount)
 */

import { useState, useCallback } from 'react'
import {
  preparePayment,
  createPayment,
  failPayment,
  PaymentPrepareResponse,
  PaymentStatus,
} from '@/lib/api/payment'

interface UsePaymentFlowReturn {
  payment: PaymentPrepareResponse | null
  status: PaymentStatus | null
  loading: boolean
  error: string | null

  // 결제 준비 (winnerId → paymentId 획득)
  preparePaymentRequest: (winnerId: number) => Promise<PaymentPrepareResponse>

  // 결제 생성 (prepare 이후 최종 처리)
  createPaymentRequest: (winnerId: number, amount: number) => Promise<void>

  // 결제 실패
  failPaymentRequest: (paymentId: number, reason: string) => Promise<void>

  // 상태 초기화
  reset: () => void
}

export function usePaymentFlow(): UsePaymentFlowReturn {
  const [payment, setPayment] = useState<PaymentPrepareResponse | null>(null)
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 결제 준비 요청
   * POST /payments/prepare
   */
  const preparePaymentRequest = useCallback(
    async (winnerId: number): Promise<PaymentPrepareResponse> => {
      setLoading(true)
      setError(null)

      try {
        const result = await preparePayment({ winnerId })
        setPayment(result)
        setStatus(result.status || null)
        return result
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          '결제 준비 중 오류가 발생했습니다.'
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  /**
   * 결제 생성 요청 (prepare 이후 최종 처리)
   * POST /payments/create?winnerId={winnerId}&amount={amount}
   */
  const createPaymentRequest = useCallback(
    async (winnerId: number, amount: number): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        await createPayment(winnerId, amount)
        setStatus('PAID')
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          '결제 처리 중 오류가 발생했습니다.'
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  /**
   * 결제 실패 처리
   * POST /payments/{paymentId}/fail
   */
  const failPaymentRequest = useCallback(
    async (paymentId: number, reason: string): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        await failPayment(paymentId, reason)
        setStatus('FAILED')
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          '결제 실패 처리 중 오류가 발생했습니다.'
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  /**
   * 상태 초기화
   */
  const reset = useCallback(() => {
    setPayment(null)
    setStatus(null)
    setLoading(false)
    setError(null)
  }, [])

  return {
    payment,
    status,
    loading,
    error,
    preparePaymentRequest,
    createPaymentRequest,
    failPaymentRequest,
    reset,
  }
}
