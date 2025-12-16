'use client'

import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = 768

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // 클라이언트 환경임을 확인
    setIsClient(true)

    // 클라이언트 환경에서만 실행
    if (typeof window !== 'undefined') {
      const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

      const onChange = () => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
      }

      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }
  }, [])

  // 서버 렌더링 시에는 false 반환
  return isClient ? isMobile : false
}
