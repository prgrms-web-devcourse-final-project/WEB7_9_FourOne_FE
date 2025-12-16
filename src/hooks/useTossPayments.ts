import { useEffect, useState } from 'react'

declare global {
  interface Window {
    TossPayments?: any
  }
}

export function useTossPayments() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkTossPayments = () => {
      if (typeof window !== 'undefined' && window.TossPayments) {
        setIsLoaded(true)
        setError(null)
        return true
      } else {
        return false
      }
    }

    // 즉시 확인
    if (checkTossPayments()) {
      return // 이미 로드되어 있으면 주기적 확인 불필요
    }

    // 주기적으로 확인 (SDK 로드가 늦을 수 있음)
    const interval = setInterval(() => {
      if (checkTossPayments()) {
        clearInterval(interval)
      }
    }, 500) // 1초에서 0.5초로 단축

    // 5초 후에는 포기하고 강제로 로드 시도
    const timeout = setTimeout(() => {
      clearInterval(interval)
      if (!isLoaded) {
        console.warn('토스 SDK 로드 시간 초과, 강제 로드 시도')

        // 강제로 토스 SDK 로드 시도
        if (typeof window !== 'undefined' && !window.TossPayments) {
          const script = document.createElement('script')
          script.src = 'https://js.tosspayments.com/v1'
          script.async = true
          script.onload = () => {
            console.log('토스 SDK 강제 로드 완료')
            setIsLoaded(true)
            setError(null)
          }
          script.onerror = () => {
            console.error('토스 SDK 강제 로드 실패')
            setError('토스 결제 SDK 로드에 실패했습니다.')
          }
          document.head.appendChild(script)
        } else {
          setError('토스 결제 SDK 로드 시간이 초과되었습니다.')
        }
      }
    }, 5000) // 10초에서 5초로 단축

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, []) // 의존성 배열에서 isLoaded 제거

  const createTossPayments = (clientKey: string) => {
    if (!isLoaded || !window.TossPayments) {
      throw new Error('토스 결제 SDK가 로드되지 않았습니다.')
    }
    return new window.TossPayments(clientKey)
  }

  return {
    isLoaded,
    error,
    createTossPayments,
  }
}
