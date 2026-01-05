'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { bidApi, productApi, auctionApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from '@/lib/utils/toast'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { components } from '@/types/swagger-generated'

type AuctionDetailResponse = components['schemas']['AuctionDetailResponse']
type ProductQnAResponse = components['schemas']['ProductQnAResponse']
type ProductQnAListResponse = components['schemas']['ProductQnAListResponse']
type ProductQnaCreateResponse =
  components['schemas']['ProductQnaCreateResponse']
type ProductQnAAnswerResponse =
  components['schemas']['ProductQnAAnswerResponse']
type AuctionBidUpdate = components['schemas']['AuctionBidUpdate']
type BidHistoryResponse = components['schemas']['BidHistoryResponse']
type BidViewMode = 'latest' | 'all'

interface AuctionDetailClientProps {
  auctionData: AuctionDetailResponse
}

export function AuctionDetailClient({ auctionData }: AuctionDetailClientProps) {
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const [isBookmarked, setIsBookmarked] = useState(
    auctionData.isBookmarked || false,
  )
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false)
  const [bidAmount, setBidAmount] = useState('')
  const [isBidLoading, setIsBidLoading] = useState(false)
  const [qnaList, setQnaList] = useState<ProductQnAResponse[]>([])
  const [isQnaLoading, setIsQnaLoading] = useState(false)
  const [qnaQuestion, setQnaQuestion] = useState('')
  const [isQnaSubmitting, setIsQnaSubmitting] = useState(false)

  // 최고 입찰가 상태
  const [currentHighestBid, setCurrentHighestBid] = useState<number>(
    auctionData.currentHighestBid || 0,
  )
  const [highestBidder, setHighestBidder] = useState<string | undefined>(
    auctionData.bidHistory?.[0]?.bidder,
  )
  const [isHighestBidLoading, setIsHighestBidLoading] = useState(false)
  const [lastHighestBidSync, setLastHighestBidSync] = useState<string | null>(
    null,
  )

  // 입찰 이력 상태
  const [bidHistory, setBidHistory] = useState<BidHistoryResponse[]>(
    auctionData.bidHistory || [],
  )
  const [isBidHistoryLoading, setIsBidHistoryLoading] = useState(false)
  const [bidViewMode, setBidViewMode] = useState<BidViewMode>('latest')
  const [bidHistoryPage, setBidHistoryPage] = useState(0)
  const [bidHistoryTotalPages, setBidHistoryTotalPages] = useState(0)
  const [bidHistoryTotalElements, setBidHistoryTotalElements] = useState(0)
  const [bidHistoryIsLast, setBidHistoryIsLast] = useState(false)
  const [bidHistoryIsFirst, setBidHistoryIsFirst] = useState(true)

  const bidStreamRef = useRef<EventSource | null>(null)

  // QnA 데이터 로드
  useEffect(() => {
    if (auctionData.productId) {
      loadQna()
    }
  }, [auctionData.productId])

  // 입찰 이력 로드
  useEffect(() => {
    if (auctionData.auctionId) {
      loadBidList()
    }
  }, [auctionData.auctionId])

  // 최고 입찰가 초기 동기화
  useEffect(() => {
    if (auctionData.auctionId) {
      refreshHighestBid(false)
    }
  }, [auctionData.auctionId])

  const loadBidList = async (size = 10) => {
    if (!auctionData.auctionId) return
    setIsBidHistoryLoading(true)
    try {
      const response = await auctionApi.getBidList(auctionData.auctionId, {
        size,
      })
      if (Array.isArray(response.data)) {
        setBidHistory(response.data)
      } else if (
        response.data?.content &&
        Array.isArray(response.data.content)
      ) {
        // 호환성: 기존 페이지 응답 형태도 수용
        setBidHistory(response.data.content)
      }
      setBidHistoryTotalElements(
        Array.isArray(response.data)
          ? response.data.length
          : response.data?.totalElements || 0,
      )
    } catch (error: any) {
      const apiError = handleApiError(error)
      console.error('입찰 이력 로드 실패:', apiError.message)
    } finally {
      setIsBidHistoryLoading(false)
    }
  }

  const loadBidHistory = async (page: number, size = 10) => {
    if (!auctionData.auctionId) return
    setIsBidHistoryLoading(true)
    try {
      const response = await auctionApi.getBidHistory(auctionData.auctionId, {
        page,
        size,
        sort: 'createdAt,desc',
      } as any)
      if (response.data?.content) {
        setBidHistory(response.data.content)
        setBidHistoryPage(response.data.number || 0)
        setBidHistoryTotalPages(response.data.totalPages || 0)
        setBidHistoryTotalElements(response.data.totalElements || 0)
        setBidHistoryIsLast(response.data.last ?? false)
        setBidHistoryIsFirst(response.data.first ?? false)
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      console.error('입찰 이력 로드 실패:', apiError.message)
    } finally {
      setIsBidHistoryLoading(false)
    }
  }

  // SSE 실시간 최고가 스트림 구독
  useEffect(() => {
    if (!auctionData.auctionId) return

    const es = new EventSource(
      `/api/v1/auctions/${auctionData.auctionId}/bid-stream`,
    )
    bidStreamRef.current = es

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as AuctionBidUpdate
        if (payload.currentHighestBid !== undefined) {
          setCurrentHighestBid(payload.currentHighestBid)
        }
        if (payload.bidderNickname) {
          setHighestBidder(payload.bidderNickname)
        }
        setLastHighestBidSync(new Date().toISOString())
      } catch {
        // 기본 connect 이벤트 등 문자열 페이로드는 무시
      }
    }

    es.onerror = () => {
      es.close()
      bidStreamRef.current = null
    }

    return () => {
      es.close()
      bidStreamRef.current = null
    }
  }, [auctionData.auctionId])

  const refreshHighestBid = async (showErrorToastOnFail = true) => {
    if (!auctionData.auctionId) return
    setIsHighestBidLoading(true)
    try {
      const response = await auctionApi.getHighestBid(auctionData.auctionId)
      if (response.data) {
        const payload = response.data as AuctionBidUpdate
        setCurrentHighestBid(payload.currentHighestBid || 0)
        setHighestBidder(payload.bidderNickname || undefined)
        setLastHighestBidSync(new Date().toISOString())
      } else if (showErrorToastOnFail) {
        showErrorToast('최고 입찰가 정보를 불러오지 못했습니다.')
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      if (showErrorToastOnFail) {
        showErrorToast(apiError.message)
      }
      console.error('최고 입찰가 조회 실패:', apiError.message)
    } finally {
      setIsHighestBidLoading(false)
    }
  }

  const loadQna = async () => {
    if (!auctionData.productId) return
    setIsQnaLoading(true)
    try {
      const response = await productApi.getQna(auctionData.productId, {
        page: 0,
        size: 50,
      })
      if (response.data?.productQnAResponses) {
        setQnaList(response.data.productQnAResponses)
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      console.error('QnA 로드 실패:', apiError.message)
    } finally {
      setIsQnaLoading(false)
    }
  }

  const handleAddQuestion = async () => {
    if (!isLoggedIn) {
      showInfoToast('로그인이 필요합니다.')
      router.push('/login')
      return
    }
    if (!qnaQuestion.trim()) {
      showInfoToast('질문을 입력해주세요.')
      return
    }
    if (!auctionData.productId) {
      showErrorToast('상품 정보를 찾을 수 없습니다.')
      return
    }

    setIsQnaSubmitting(true)
    try {
      const response = await productApi.addQna(
        auctionData.productId,
        qnaQuestion,
      )
      if (response.success) {
        showSuccessToast('질문이 등록되었습니다.')
        setQnaQuestion('')
        await loadQna()
      } else {
        showErrorToast(response.message || '질문 등록에 실패했습니다.')
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
    } finally {
      setIsQnaSubmitting(false)
    }
  }

  const handleBookmarkToggle = async () => {
    if (!isLoggedIn) {
      showInfoToast('로그인이 필요합니다.')
      router.push('/login')
      return
    }
    if (!auctionData.productId) {
      showErrorToast('상품 정보를 찾을 수 없습니다.')
      return
    }

    setIsBookmarkLoading(true)
    try {
      if (isBookmarked) {
        // 북마크 제거
        const response = await productApi.deleteBookmark(auctionData.productId)
        if (response.success) {
          setIsBookmarked(false)
          showSuccessToast('찜 목록에서 제거되었습니다.')
        } else {
          showErrorToast(response.message || '찜 제거에 실패했습니다.')
        }
      } else {
        // 북마크 추가
        const response = await productApi.addBookmark(auctionData.productId)
        if (response.success) {
          setIsBookmarked(true)
          showSuccessToast('찜 목록에 추가되었습니다.')
        } else {
          showErrorToast(response.message || '찜 추가에 실패했습니다.')
        }
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
      // 에러 발생 시 상태 되돌리지 않음 (요청 자체가 실패했으므로)
    } finally {
      setIsBookmarkLoading(false)
    }
  }

  const handlePlaceBid = async () => {
    if (!isLoggedIn) {
      showInfoToast('로그인이 필요합니다.')
      router.push('/login')
      return
    }
    if (!bidAmount.trim()) {
      showInfoToast('입찰 금액을 입력해주세요.')
      return
    }
    const amount = parseInt(bidAmount)
    if (isNaN(amount) || amount <= 0) {
      showErrorToast('유효한 금액을 입력해주세요.')
      return
    }
    const requiredMinBid = currentHighestBid + (auctionData.minBidStep ?? 0)
    if (amount < requiredMinBid) {
      showErrorToast(
        `${requiredMinBid.toLocaleString()}원 이상으로 입찰해주세요.`,
      )
      return
    }

    setIsBidLoading(true)
    try {
      const response = await bidApi.createBid(auctionData.auctionId!, {
        bidAmount: amount,
      })
      if (response.success) {
        showSuccessToast('입찰이 완료되었습니다.')
        setBidAmount('')
        // 입찰 성공 시 최신 데이터 새로고침
        if (bidViewMode === 'all') {
          await Promise.all([
            refreshHighestBid(false),
            loadBidHistory(bidHistoryPage),
            loadBidList(),
          ])
        } else {
          await Promise.all([refreshHighestBid(false), loadBidList()])
        }
      } else {
        showErrorToast(response.message || '입찰에 실패했습니다.')
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
    } finally {
      setIsBidLoading(false)
    }
  }

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return '-'
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
  }

  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR')
  }

  const formatRemainingTime = (remainingSeconds: number | undefined) => {
    if (remainingSeconds === undefined || remainingSeconds <= 0)
      return '경매 종료'
    const hours = Math.floor(remainingSeconds / 3600)
    const minutes = Math.floor((remainingSeconds % 3600) / 60)
    const seconds = remainingSeconds % 60
    return `${hours}시간 ${minutes}분 ${seconds}초`
  }

  const requiredMinBidAmount = currentHighestBid + (auctionData.minBidStep ?? 0)

  const isHighestBid = (bid: BidHistoryResponse) => {
    if (bid.bidAmount === undefined) return false
    return bid.bidAmount === currentHighestBid
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* 이미지 섹션 */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="relative p-0">
              <div className="relative bg-neutral-100">
                {auctionData.imageUrls && auctionData.imageUrls.length > 0 ? (
                  <img
                    src={auctionData.imageUrls[0]}
                    alt={auctionData.name}
                    className="h-96 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-96 w-full items-center justify-center">
                    <div className="text-center">
                      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 shadow-lg">
                        <svg
                          className="text-primary-600 h-8 w-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-neutral-500">
                        이미지 준비중
                      </span>
                    </div>
                  </div>
                )}

                {/* 북마크 버튼 - 이미지 우상단 */}
                <button
                  onClick={handleBookmarkToggle}
                  disabled={isBookmarkLoading}
                  className="absolute top-4 right-4 rounded-full bg-white p-2 shadow-lg hover:shadow-xl disabled:opacity-50"
                  aria-label={isBookmarked ? '찜 제거' : '찜 추가'}
                >
                  <Heart
                    className={`h-6 w-6 transition-colors ${
                      isBookmarked
                        ? 'fill-red-500 text-red-500'
                        : 'text-neutral-400'
                    }`}
                  />
                </button>
              </div>

              {/* 추가 이미지들 */}
              {auctionData.imageUrls && auctionData.imageUrls.length > 1 && (
                <div className="grid grid-cols-4 gap-2 border-t border-neutral-200 p-4">
                  {auctionData.imageUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`${auctionData.name} ${idx + 1}`}
                      className="aspect-square rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 정보 섹션 */}
        <div className="space-y-4 lg:col-span-1">
          {/* 카테고리 배지 */}
          <div className="flex gap-2">
            <Badge className="bg-primary-500 text-white">
              {auctionData.category}
            </Badge>
            <Badge>{auctionData.subCategory}</Badge>
          </div>

          {/* 제목 */}
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              {auctionData.name}
            </h1>
          </div>

          {/* 설명 */}
          {auctionData.description && (
            <p className="text-sm leading-relaxed text-neutral-600">
              {auctionData.description}
            </p>
          )}

          {/* 가격 정보 */}
          <Card className="bg-primary-50">
            <CardContent className="space-y-3 p-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-neutral-500">
                      현재 최고 입찰가
                    </p>
                    <p className="text-primary-600 text-2xl font-bold">
                      {formatPrice(currentHighestBid)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshHighestBid(true)}
                    disabled={isHighestBidLoading}
                  >
                    {isHighestBidLoading ? '갱신 중...' : '새로고침'}
                  </Button>
                </div>
                {highestBidder && (
                  <p className="mt-1 text-xs text-neutral-500">
                    최고 입찰자: {highestBidder}
                  </p>
                )}
                {lastHighestBidSync && (
                  <p className="text-[11px] text-neutral-400">
                    {new Date(lastHighestBidSync).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}{' '}
                    기준
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">시작가</p>
                <p className="text-lg font-semibold text-neutral-700">
                  {formatPrice(auctionData.startPrice)}
                </p>
              </div>
              <div className="border-primary-100 border-t pt-2">
                <p className="text-xs font-medium text-neutral-500">
                  입찰 단위
                </p>
                <p className="text-sm text-neutral-700">
                  {formatPrice(auctionData.minBidStep)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 경매 상태 */}
          <Card className="bg-neutral-50">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">남은 시간</span>
                <span className="text-sm font-semibold text-neutral-700">
                  {formatRemainingTime(auctionData.remainingTimeSeconds)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">입찰 건수</span>
                <span className="text-sm font-semibold text-neutral-700">
                  {auctionData.totalBidCount || 0}건
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 판매자 정보 */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-500">
                  판매자
                </p>
                <p className="text-sm font-semibold text-neutral-900">
                  {auctionData.sellerNickname || '판매자'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 경매 기간 */}
          <Card className="bg-blue-50">
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-500">
                  경매 시작
                </p>
                <p className="text-sm text-neutral-700">
                  {formatTime(auctionData.startAt)}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-500">
                  경매 종료
                </p>
                <p className="text-sm text-neutral-700">
                  {formatTime(auctionData.endAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 즉시 구매가 */}
          {auctionData.buyNowPrice && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <p className="mb-1 text-xs font-medium text-neutral-500">
                  즉시 구매가
                </p>
                <p className="text-xl font-bold text-orange-600">
                  {formatPrice(auctionData.buyNowPrice)}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full border-orange-300 text-orange-600 hover:bg-orange-100"
                  disabled={auctionData.status !== '진행 중'}
                >
                  즉시 구매
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 액션 버튼들 - 제거됨 (하트 버튼은 이미지 우상단으로 이동) */}
        </div>
      </div>

      {/* 입찰 섹션 */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <h2 className="mb-4 text-xl font-bold">입찰하기</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                입찰 금액
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`${requiredMinBidAmount.toLocaleString()}원 이상`}
                  className="focus:ring-primary-500 flex-1 rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:outline-none"
                  disabled={!isLoggedIn || isBidLoading}
                />
                <Button
                  onClick={handlePlaceBid}
                  disabled={
                    !isLoggedIn ||
                    isBidLoading ||
                    auctionData.status !== '진행 중'
                  }
                  size="sm"
                >
                  {isBidLoading ? '입찰 중...' : '입찰'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 입찰 내역 */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">입찰 내역</h2>
              {bidHistory.length > 0 && bidViewMode === 'latest' && (
                <Badge variant="secondary">최근 {bidHistory.length}건</Badge>
              )}
              {bidHistory.length > 0 && bidViewMode === 'all' && (
                <Badge variant="secondary">
                  총 {bidHistoryTotalElements.toLocaleString()}건
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={bidViewMode === 'latest' ? 'secondary' : 'outline'}
                onClick={() => {
                  setBidViewMode('latest')
                  loadBidList()
                }}
                disabled={isBidHistoryLoading}
              >
                최근 10건
              </Button>
              <Button
                size="sm"
                variant={bidViewMode === 'all' ? 'secondary' : 'outline'}
                onClick={() => {
                  setBidViewMode('all')
                  setBidHistoryPage(0)
                  setBidHistoryIsLast(false)
                  setBidHistoryIsFirst(true)
                  loadBidHistory(0)
                }}
                disabled={isBidHistoryLoading}
              >
                전체 보기
              </Button>
            </div>
          </div>

          {isBidHistoryLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="border-t-primary-500 mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-neutral-200"></div>
                <p className="text-sm text-neutral-500">로딩 중...</p>
              </div>
            </div>
          ) : bidHistory.length === 0 ? (
            <div className="rounded-lg bg-neutral-50 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200">
                <svg
                  className="h-6 w-6 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-neutral-600">
                아직 입찰 내역이 없습니다
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                첫 번째 입찰자가 되어보세요!
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {bidHistory.map((bid, idx) => (
                  <div
                    key={bid.bidId || idx}
                    className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
                      idx === 0
                        ? 'bg-primary-50 border-primary-200 border'
                        : 'bg-neutral-50 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isHighestBid(bid) && (
                        <Badge variant="primary" size="sm" className="shrink-0">
                          최고가
                        </Badge>
                      )}
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {bid.bidder || '입찰자'}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {new Date(bid.bidTime || '').toLocaleString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        idx === 0 ? 'text-primary-600' : 'text-neutral-700'
                      }`}
                    >
                      {new Intl.NumberFormat('ko-KR').format(
                        bid.bidAmount || 0,
                      )}
                      원
                    </p>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 (전체 보기 전용) */}
              {bidViewMode === 'all' && bidHistoryTotalPages > 0 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadBidHistory(bidHistoryPage - 1)}
                    disabled={
                      bidHistoryIsFirst ||
                      bidHistoryPage === 0 ||
                      isBidHistoryLoading
                    }
                  >
                    이전
                  </Button>
                  <span className="text-sm text-neutral-600">
                    {bidHistoryPage + 1} / {bidHistoryTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadBidHistory(bidHistoryPage + 1)}
                    disabled={
                      bidHistoryIsLast ||
                      bidHistoryPage >= bidHistoryTotalPages - 1 ||
                      isBidHistoryLoading
                    }
                  >
                    다음
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* QnA 섹션 */}
      {auctionData.productId && (
        <Card className="mt-8">
          <CardContent className="p-6">
            <h2 className="mb-4 text-xl font-bold">질문과 답변</h2>

            {/* 질문 작성 폼 */}
            <div className="mb-6 space-y-3 rounded-lg bg-neutral-50 p-4">
              <label className="block text-sm font-medium text-neutral-700">
                상품에 대해 궁금한 점이 있으신가요?
              </label>
              <textarea
                value={qnaQuestion}
                onChange={(e) => setQnaQuestion(e.target.value)}
                placeholder="질문 내용을 입력해주세요."
                rows={3}
                className="focus:ring-primary-500 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:outline-none"
                disabled={!isLoggedIn || isQnaSubmitting}
              />
              <div className="flex justify-end gap-2">
                {!isLoggedIn && (
                  <p className="text-sm text-neutral-500">
                    로그인 후 질문할 수 있습니다.
                  </p>
                )}
                <Button
                  onClick={handleAddQuestion}
                  disabled={
                    !isLoggedIn || isQnaSubmitting || !qnaQuestion.trim()
                  }
                  size="sm"
                >
                  {isQnaSubmitting ? '등록 중...' : '질문하기'}
                </Button>
              </div>
            </div>

            {/* 질문 목록 */}
            <div className="space-y-4">
              {isQnaLoading ? (
                <p className="text-center text-sm text-neutral-500">
                  로딩 중...
                </p>
              ) : qnaList.length === 0 ? (
                <p className="rounded-lg bg-neutral-50 p-4 text-center text-sm text-neutral-500">
                  아직 등록된 질문이 없습니다.
                </p>
              ) : (
                qnaList.map((qna) => {
                  const question = qna.productQnaCreateResponse
                  return (
                    <div
                      key={question?.qnaId}
                      className="space-y-2 rounded-lg border border-neutral-200 p-4"
                    >
                      {/* 질문 */}
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-primary-600 text-xs font-semibold">
                            Q
                          </span>
                          <span className="text-xs text-neutral-500">
                            {question?.questionedAt
                              ? new Date(
                                  question.questionedAt,
                                ).toLocaleDateString('ko-KR')
                              : ''}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-neutral-900">
                          {question?.question}
                        </p>
                      </div>

                      {/* 답변 목록 */}
                      {qna.answers && qna.answers.length > 0 ? (
                        <div className="space-y-2">
                          {qna.answers.map((answer) => (
                            <div
                              key={answer.answerId}
                              className="border-primary-300 bg-primary-50 border-l-2 py-2 pl-3"
                            >
                              <div className="mb-1 flex items-center">
                                <span className="text-primary-600 text-xs font-semibold">
                                  A
                                </span>
                              </div>
                              <p className="text-sm text-neutral-800">
                                {answer.answer}
                              </p>
                              <p className="mt-1 text-xs text-neutral-500">
                                {answer.answeredAt
                                  ? new Date(
                                      answer.answeredAt,
                                    ).toLocaleDateString('ko-KR')
                                  : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border-l-2 border-neutral-200 bg-neutral-50 py-2 pl-3">
                          <p className="text-sm text-neutral-500 italic">
                            아직 답변이 없습니다.
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
