/**
 * 결제 수단(카드) 관리 Hook (스웨거 기반)
 *
 * 역할:
 * - 등록된 카드 목록 조회
 * - 새 카드 등록
 * - 카드 삭제
 *
 * 사용 예시:
 * const { methods, loading, error, refreshMethods, addMethod, removeMethod } = usePaymentMethods()
 */

import { useState, useCallback, useEffect } from 'react'
import {
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  CardResponse,
  RegisterCardRequest,
} from '@/lib/api/payment'

interface UsePaymentMethodsReturn {
  methods: CardResponse[]
  loading: boolean
  error: string | null

  // 카드 목록 새로고침
  refreshMethods: () => Promise<void>

  // 카드 추가
  addMethod: (payload: RegisterCardRequest) => Promise<CardResponse>

  // 카드 삭제
  removeMethod: (paymentMethodId: number) => Promise<void>
}

export function usePaymentMethods(): UsePaymentMethodsReturn {
  const [methods, setMethods] = useState<CardResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 카드 목록 조회
   * GET /api/v1/user/me/paymentMethods
   */
  const refreshMethods = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await getPaymentMethods()
      setMethods(result)
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        '카드 목록 조회 중 오류가 발생했습니다.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 카드 추가
   * POST /api/v1/user/me/paymentMethods
   */
  const addMethod = useCallback(
    async (payload: RegisterCardRequest): Promise<CardResponse> => {
      setLoading(true)
      setError(null)

      try {
        const result = await addPaymentMethod(payload)
        // 목록에 추가
        setMethods((prev) => [...prev, result])
        return result
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          '카드 등록 중 오류가 발생했습니다.'
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  /**
   * 카드 삭제
   * DELETE /api/v1/user/me/paymentMethods/{paymentMethodId}
   */
  const removeMethod = useCallback(
    async (paymentMethodId: number): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        await deletePaymentMethod(paymentMethodId)
        // 목록에서 제거
        setMethods((prev) => prev.filter((m) => m.id !== paymentMethodId))
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          '카드 삭제 중 오류가 발생했습니다.'
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  // 초기 로드
  useEffect(() => {
    refreshMethods()
  }, [refreshMethods])

  return {
    methods,
    loading,
    error,
    refreshMethods,
    addMethod,
    removeMethod,
  }
}
