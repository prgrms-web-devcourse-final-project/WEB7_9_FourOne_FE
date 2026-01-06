'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { bidApi } from '@/lib/api'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Bid {
  auctionId: number
  productId: number
  productName: string
  productImageUrl: string
  myBid: number
  finalBid: number
  status: string
  endAt: string
}

export function PaymentSuccessClient() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [winningBid, setWinningBid] = useState<Bid | null>(null)
  const [error, setError] = useState('')
  const [pollCount, setPollCount] = useState(0)
  const maxPollAttempts = 10
  const pollInterval = 2000

  useEffect(() => {
    pollPaymentStatus()
  }, [])

  const pollPaymentStatus = async () => {
    try {
      setIsLoading(true)
      setError('')

      // 입찰 내역 조회
      const response = await bidApi.getMyBids({
        page: 1,
        size: 50,
      })

      if (!response.success || !response.data) {
        throw new Error('입찰 내역 조회 실패')
      }

      // WIN 상태인 경매 찾기 (아직 결제 완료 확인)
      const auctions = response.data.auctions || []
      const winningBidData = auctions.find(
        (a: Bid) => a.status === 'WIN' && a.finalBid,
      )

      if (winningBidData) {
        setWinningBid(winningBidData)
        showSuccessToast('결제가 완료되었습니다!')
        setIsLoading(false)
        return
      }

      // 아직 미확인시 재시도
      if (pollCount < maxPollAttempts) {
        setPollCount((prev) => prev + 1)
        setTimeout(() => {
          pollPaymentStatus()
        }, pollInterval)
      } else {
        setError(
          '결제 확인에 시간이 걸리고 있습니다. 잠시 후 다시 확인해주세요.',
        )
        setIsLoading(false)
      }
    } catch (err: any) {
      console.error('폴링 오류:', err)
      showErrorToast('결제 상태 확인 중 오류가 발생했습니다.')
      setError('오류가 발생했습니다. 다시 시도해주세요.')
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setPollCount(0)
    pollPaymentStatus()
  }

  const handleGoToMyPage = () => {
    router.push('/bid-status')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {isLoading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mb-6 flex justify-center">
              <div className="border-primary-200 border-t-primary-600 h-10 w-10 animate-spin rounded-full border-2"></div>
            </div>
            <h3 className="mb-2 text-base font-semibold text-neutral-900">
              결제 진행 중입니다
            </h3>
            <p className="mb-1 text-sm text-neutral-600">
              결제 상태를 확인하고 있습니다
            </p>
            <p className="text-xs text-neutral-500">
              시도 {pollCount}/{maxPollAttempts}
            </p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-amber-50 p-4">
                <AlertCircle className="h-10 w-10 text-amber-600" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-900">
              결제 상태 확인 중 문제가 발생했습니다
            </h3>
            <p className="mb-8 text-sm text-neutral-600">{error}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button
                onClick={handleRetry}
                className="bg-primary-600 hover:bg-primary-700 flex-1"
              >
                다시 시도
              </Button>
              <Button
                variant="outline"
                onClick={handleGoToMyPage}
                className="flex-1"
              >
                입찰 내역 확인
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : winningBid ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-green-50 p-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-neutral-900">
              낙찰이 확정되었습니다
            </h1>
            <p className="mb-8 text-neutral-600">입찰 결과를 확인해주세요</p>

            {winningBid.productImageUrl && (
              <div className="mb-8 overflow-hidden rounded-lg bg-neutral-100">
                <img
                  src={winningBid.productImageUrl}
                  alt={winningBid.productName}
                  className="h-48 w-full object-cover"
                />
              </div>
            )}

            <div className="mb-8 space-y-3 text-left">
              <div className="flex justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <span className="text-sm text-neutral-600">상품명</span>
                <span className="font-semibold text-neutral-900">
                  {winningBid.productName}
                </span>
              </div>
              <div className="flex justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <span className="text-sm text-neutral-600">낙찰가</span>
                <span className="text-primary-600 text-lg font-semibold">
                  {winningBid.finalBid?.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <span className="text-sm text-neutral-600">경매 종료</span>
                <span className="font-mono text-sm text-neutral-900">
                  {new Date(winningBid.endAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button
                onClick={handleGoToMyPage}
                className="bg-primary-600 hover:bg-primary-700 flex-1"
              >
                입찰 내역 확인
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="flex-1"
              >
                홈으로 가기
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
