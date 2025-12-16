import {
  handle401Error,
  handleApiError,
  type StandardApiError,
} from '@/lib/api/common'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

export const useApiError = () => {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleError = useCallback((err: any) => {
    const apiError = handleApiError(err)
    setError(apiError.message)

    // 토스트 알림 표시
    if (apiError.status === 401) {
      toast.error('로그인이 필요합니다.')
      handle401Error()
    } else if (apiError.status === 403) {
      toast.error('권한이 없습니다.')
    } else if (apiError.status === 404) {
      toast.error('요청한 리소스를 찾을 수 없습니다.')
    } else if (apiError.status === 409) {
      toast.error('이미 존재하는 데이터입니다.')
    } else if (apiError.status === 422) {
      toast.error('입력 데이터를 확인해주세요.')
    } else if (apiError.status >= 500) {
      toast.error('서버 오류가 발생했습니다.')
    } else if (apiError.code === 'NETWORK_ERROR') {
      toast.error('네트워크 연결을 확인해주세요.')
    } else {
      toast.error(apiError.message)
    }

    return apiError
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const executeAsync = useCallback(
    async <T>(
      apiCall: () => Promise<T>,
      onSuccess?: (data: T) => void,
      onError?: (error: StandardApiError) => void,
      successMessage?: string,
    ): Promise<T | null> => {
      try {
        setIsLoading(true)
        setError(null)

        const result = await apiCall()

        if (onSuccess) {
          onSuccess(result)
        }

        // 성공 메시지 표시
        if (successMessage) {
          toast.success(successMessage)
        }

        return result
      } catch (err) {
        const apiError = handleError(err)

        if (onError) {
          onError(apiError)
        }

        return null
      } finally {
        setIsLoading(false)
      }
    },
    [handleError],
  )

  return {
    error,
    isLoading,
    handleError,
    clearError,
    executeAsync,
    setIsLoading,
  }
}
