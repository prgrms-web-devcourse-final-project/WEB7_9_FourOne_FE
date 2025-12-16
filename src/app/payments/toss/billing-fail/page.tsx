'use client'

import { useEffect } from 'react'

export default function BillingFailPage() {
  useEffect(() => {
    // 백엔드에서 제공하는 HTML 페이지로 리다이렉트
    window.location.href = '/api/proxy/billing-fail.html' + window.location.search
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">
          결제수단 등록 처리 중...
        </h2>
        <p className="text-neutral-600">잠시만 기다려주세요.</p>
      </div>
    </div>
  )
}
