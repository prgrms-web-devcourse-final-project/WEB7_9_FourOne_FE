'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { bidApi } from '@/lib/api'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {isLoading ? (
        <Card variant="outlined">
          <CardContent className="py-16 text-center">
            <div className="mb-6">
              <div className="border-primary-200 border-t-primary-600 mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4"></div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                결제를 처리하는 중...
              </h3>
              <p className="text-neutral-600">최대 몇 초 소요될 수 있습니다</p>
              <p className="mt-2 text-sm text-neutral-500">
                ({pollCount}/{maxPollAttempts})
              </p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card variant="outlined">
          <CardContent className="py-12 text-center">
            <div className="mb-4 text-4xl">⚠️</div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-900">
              결제 확인 실패
            </h3>
            <p className="mb-6 text-neutral-600">{error}</p>
            <div className="space-x-3">
              <Button onClick={handleRetry}>다시 시도</Button>
              <Button variant="outline" onClick={handleGoToMyPage}>
                입찰 내역 보기
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : winningBid ? (
        <Card variant="outlined">
          <CardContent className="py-12 text-center">
            <div className="mb-6 text-6xl">🎉</div>
            <h1 className="mb-4 text-3xl font-bold text-neutral-900">
              낙찰 완료!
            </h1>

            {winningBid.productImageUrl && (
              <img
                src={winningBid.productImageUrl}
                alt={winningBid.productName}
                className="mb-6 h-48 w-full rounded-lg object-cover"
              />
            )}

            <div className="mb-6 space-y-2 text-left">
              <div className="flex justify-between rounded-lg bg-neutral-50 p-4">
                <span className="text-neutral-600">상품명</span>
                <span className="font-semibold text-neutral-900">
                  {winningBid.productName}
                </span>
              </div>
              <div className="flex justify-between rounded-lg bg-neutral-50 p-4">
                <span className="text-neutral-600">낙찰가</span>
                <span className="font-semibold text-neutral-900">
                  {winningBid.finalBid?.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between rounded-lg bg-neutral-50 p-4">
                <span className="text-neutral-600">경매 종료</span>
                <span className="font-semibold text-neutral-900">
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

            <div className="space-x-3">
              <Button onClick={handleGoToMyPage} size="lg">
                입찰 내역 확인
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push('/bid-status')}
              >
                돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
