'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocketAuctionTimer } from '@/hooks/useWebSocketAuctionTimer'
import { useWebSocketBid } from '@/hooks/useWebSocketBid'
import { auctionApi, bidApi, productApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from '@/lib/utils/toast'
import { AuctionDetail } from '@/types'
import {
  Clock,
  Edit,
  Heart,
  MessageSquare,
  Send,
  Trash2,
  User,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

interface ProductDetailClientProps {
  product: AuctionDetail
  initialBidStatus?: any
}

export function ProductDetailClient({
  product,
  initialBidStatus,
}: ProductDetailClientProps) {
  const router = useRouter()
  const { isLoggedIn, user } = useAuth()
  const [bidAmount, setBidAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // apiError가 변경되면 토스트로 표시
  useEffect(() => {
    if (apiError) {
      showErrorToast(apiError, '오류')
      setApiError('')
    }
  }, [apiError])

  const [bidStatus, setBidStatus] = useState<any>(initialBidStatus || null)
  const [isPriceUpdated, setIsPriceUpdated] = useState(false)
  const [isBidCountUpdated, setIsBidCountUpdated] = useState(false)
  const [showBidNotification, setShowBidNotification] = useState(false)
  const [lastBidInfo, setLastBidInfo] = useState<{
    price: number
    bidder: string
  } | null>(null)
  const [productData, setProductData] = useState(product)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(
    product.isBookmarked || false,
  )
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false)
  const [qnaList, setQnaList] = useState<any[]>([])
  const [isQnaLoading, setIsQnaLoading] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswers, setNewAnswers] = useState<Record<number, string>>({})
  const [expandedQnaId, setExpandedQnaId] = useState<number | null>(null)

  const safeProductId = product.productId
  const safeAuctionId = product.auctionId

  const {
    bidUpdate,
    auctionStatus,
    isSubscribed,
    error: wsErrorFromHook,
  } = useWebSocketBid(safeAuctionId)

  // wsError가 변경되면 토스트로 표시
  useEffect(() => {
    if (wsErrorFromHook) {
      showErrorToast(wsErrorFromHook, '실시간 연결 오류')
    }
  }, [wsErrorFromHook])

  const { timerData, isSubscribed: isTimerSubscribed } =
    useWebSocketAuctionTimer(safeAuctionId)

  const mapStatusToKorean = (status: string): string => {
    switch (status) {
      case 'SCHEDULED':
        return '경매 시작 전'
      case 'LIVE':
        return '경매 중'
      case 'ENDED':
        return '경매 종료'
      default:
        return status
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '시간 미정'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '시간 미정'
    }
  }

  const formatRemainingTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '경매 종료'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (days > 0) {
      return `${days}일 ${hours}시간`
    } else if (hours > 0) {
      return `${hours}시간 ${minutes}분`
    } else if (minutes > 0) {
      return `${minutes}분 ${secs}초`
    } else {
      return `${secs}초`
    }
  }

  const isOwner = useMemo(() => {
    return user && String(user.id) === String(productData.sellerId)
  }, [user, productData.sellerId])

  // 북마크 토글
  const handleBookmarkToggle = async () => {
    if (!isLoggedIn) {
      showInfoToast('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    setIsBookmarkLoading(true)
    try {
      if (isBookmarked) {
        await productApi.deleteBookmark(safeProductId)
        setIsBookmarked(false)
        showSuccessToast('찜 목록에서 제거되었습니다.')
      } else {
        await productApi.addBookmark(safeProductId)
        setIsBookmarked(true)
        showSuccessToast('찜 목록에 추가되었습니다.')
      }
    } catch (error: any) {
      console.error('북마크 토글 실패:', error)
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
    } finally {
      setIsBookmarkLoading(false)
    }
  }

  // QnA 목록 조회
  const fetchQnaList = async () => {
    try {
      setIsQnaLoading(true)
      const response = await productApi.getQna(safeProductId, {
        page: 0,
        size: 100,
      })
      if (response.success && response.data) {
        setQnaList(response.data.productQnAResponses || [])
      }
    } catch (error) {
      console.error('QnA 목록 조회 실패:', error)
    } finally {
      setIsQnaLoading(false)
    }
  }

  // QnA 질문 등록
  const handleAddQna = async () => {
    if (!isLoggedIn) {
      showInfoToast('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    if (!newQuestion.trim()) {
      showInfoToast('질문을 입력해주세요.')
      return
    }

    try {
      const response = await productApi.addQna(safeProductId, newQuestion)
      if (response.success) {
        setNewQuestion('')
        fetchQnaList()
        showSuccessToast('질문이 등록되었습니다.')
      } else {
        showErrorToast(
          response.message || response.msg || '질문 등록에 실패했습니다.',
        )
      }
    } catch (error: any) {
      console.error('QnA 등록 실패:', error)
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
    }
  }

  // QnA 답변 등록
  const handleAddAnswer = async (qnaId: number) => {
    const answer = newAnswers[qnaId]
    if (!answer?.trim()) {
      showInfoToast('답변을 입력해주세요.')
      return
    }

    try {
      const response = await productApi.addAnswer(safeProductId, qnaId, answer)
      if (response.success) {
        setNewAnswers((prev) => ({ ...prev, [qnaId]: '' }))
        fetchQnaList()
        showSuccessToast('답변이 등록되었습니다.')
      } else {
        showErrorToast(
          response.message || response.msg || '답변 등록에 실패했습니다.',
        )
      }
    } catch (error: any) {
      console.error('답변 등록 실패:', error)
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
    }
  }

  // QnA 답변 삭제
  const handleDeleteAnswer = async (productId: number, qnaId: number) => {
    if (!confirm('답변을 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await productApi.deleteAnswer(productId, qnaId)
      if (response.success) {
        fetchQnaList()
        showSuccessToast('답변이 삭제되었습니다.')
      } else {
        showErrorToast(
          response.message || response.msg || '답변 삭제에 실패했습니다.',
        )
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
    }
  }

  // 실시간 입찰 정보 업데이트
  useEffect(() => {
    if (bidUpdate) {
      setBidStatus((prev: any) => {
        const newStatus = {
          ...prev,
          currentPrice: bidUpdate.currentPrice,
          bidCount: bidUpdate.bidCount,
        }

        // 가격이 업데이트되었는지 확인
        if (prev?.currentPrice !== bidUpdate.currentPrice) {
          setIsPriceUpdated(true)
          setLastBidInfo({
            price: bidUpdate.currentPrice,
            bidder: bidUpdate.lastBidder || '익명',
          })
          setShowBidNotification(true)
          setTimeout(() => {
            setIsPriceUpdated(false)
            setShowBidNotification(false)
          }, 3000)
        }

        // 입찰자 수가 업데이트되었는지 확인
        if (prev?.bidCount !== bidUpdate.bidCount) {
          setIsBidCountUpdated(true)
          setTimeout(() => {
            setIsBidCountUpdated(false)
          }, 3000)
        }

        return newStatus
      })
    }
  }, [bidUpdate])

  // 타이머 데이터 업데이트
  useEffect(() => {
    if (timerData && timerData.timeLeft) {
      // timeLeft를 파싱하여 초 단위로 변환 (예: "1시간 30분" → 5400초)
      // 간단하게 endAt과 현재 시간 차이로 계산
      const endTime = new Date(productData.endAt).getTime()
      const now = Date.now()
      const remainingSeconds = Math.max(0, Math.floor((endTime - now) / 1000))

      setProductData((prev) => ({
        ...prev,
        remainingTimeSeconds: remainingSeconds || prev.remainingTimeSeconds,
      }))
    }
  }, [timerData, productData.endAt])

  // 초기 데이터 로드
  useEffect(() => {
    // QnA 목록 로드
    fetchQnaList()
  }, [safeProductId])

  const handleBid = async () => {
    if (!isLoggedIn) {
      router.push('/login')
      return
    }

    const amount = parseInt(bidAmount.replace(/,/g, ''))

    const currentPrice = productData.currentHighestBid || productData.startPrice
    const minBidAmount = currentPrice + productData.minBidStep

    if (!amount || amount < minBidAmount) {
      setApiError(
        `최소 입찰가 ${formatPrice(minBidAmount)}원 이상 입력해주세요.`,
      )
      return
    }

    setIsLoading(true)
    setApiError('')

    try {
      const response: any = await bidApi.createBid(safeAuctionId, {
        bidAmount: amount,
      })

      if (response.success) {
        showSuccessToast('입찰이 성공적으로 등록되었습니다.')
        setBidAmount('')
        // 상품 데이터 새로고침
        setProductData((prev) => ({
          ...prev,
          currentHighestBid:
            response.data?.currentHighestBid || prev.currentHighestBid,
          totalBidCount: (prev.totalBidCount || 0) + 1,
        }))
      } else {
        setApiError(response.message || response.msg || '입찰에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('입찰 실패:', error)
      const apiError = handleApiError(error)
      setApiError(apiError.message)
    }

    setIsLoading(false)
  }

  const handleBidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    const formatted = value ? parseInt(value).toLocaleString() : ''
    setBidAmount(formatted)
    setApiError('')
  }

  const handleBuyNow = async () => {
    if (!isLoggedIn) {
      router.push('/login')
      return
    }

    if (
      !confirm(
        `즉시 구매가 ${formatPrice(productData.buyNowPrice)}원으로 구매하시겠습니까?`,
      )
    ) {
      return
    }

    setIsLoading(true)
    setApiError('')

    try {
      // TODO: 결제 수단 ID는 실제로는 사용자가 선택한 결제 수단을 사용해야 함
      const response: any = await auctionApi.buyNow(safeAuctionId, {
        amount: productData.buyNowPrice,
        methodId: 1, // 임시로 1 사용
      })

      if (response.success) {
        showSuccessToast('즉시 구매가 완료되었습니다.')
        setProductData((prev) => ({
          ...prev,
          status: 'ENDED' as const,
        }))
      } else {
        setApiError(
          response.message || response.msg || '즉시 구매에 실패했습니다.',
        )
      }
    } catch (error: any) {
      console.error('즉시 구매 실패:', error)
      const apiError = handleApiError(error)
      setApiError(apiError.message)
    }

    setIsLoading(false)
  }

  const currentPrice = productData.currentHighestBid || productData.startPrice

  // remainingTimeSeconds 계산
  const calculateRemainingSeconds = () => {
    if (timerData && timerData.timeLeft) {
      const endTime = new Date(productData.endAt).getTime()
      const now = Date.now()
      return Math.max(0, Math.floor((endTime - now) / 1000))
    }
    return productData.remainingTimeSeconds
  }

  const remainingTime = calculateRemainingSeconds()

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 새 입찰 알림 토스트 */}
      {showBidNotification && lastBidInfo && (
        <div className="animate-slide-in fixed top-4 right-4 z-50">
          <div className="rounded-lg bg-green-500 px-6 py-4 text-white shadow-lg">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 animate-pulse" />
              <div>
                <div className="font-semibold">새 입찰 발생!</div>
                <div className="text-sm">{formatPrice(lastBidInfo.price)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 실시간 연결 상태 표시 */}
      <div className="mb-4 space-y-2">
        {isSubscribed && (
          <div className="flex items-center justify-center space-x-2 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
            <Zap className="h-4 w-4 animate-pulse" />
            <span>실시간 입찰 정보 연결됨</span>
          </div>
        )}
        {isTimerSubscribed && (
          <div className="flex items-center justify-center space-x-2 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
            <Clock className="h-4 w-4 animate-pulse" />
            <span>실시간 경매 타이머 연결됨</span>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 상품 이미지 */}
        <div className="space-y-4">
          <div className="aspect-square rounded-lg bg-neutral-200">
            {productData.imageUrls && productData.imageUrls[0] ? (
              <img
                src={productData.imageUrls[0]}
                alt={productData.name}
                className="h-full w-full rounded-lg object-cover"
                onError={(e) => {
                  console.error('이미지 로드 실패:', e.currentTarget.src)
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center rounded-lg bg-neutral-100">
                <div className="mb-2 rounded-full bg-neutral-300 p-3">
                  <svg
                    className="h-8 w-8 text-neutral-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-neutral-500">이미지 준비중</p>
              </div>
            )}
          </div>

          {/* 추가 이미지들 */}
          {productData.imageUrls && productData.imageUrls.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {productData.imageUrls.slice(1, 5).map((imageUrl, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-lg bg-neutral-200"
                >
                  <img
                    src={imageUrl}
                    alt={`${productData.name} ${index + 2}`}
                    className="h-full w-full rounded-lg object-cover"
                    onError={(e) => {
                      console.error('이미지 로드 실패:', e.currentTarget.src)
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 상품 정보 */}
        <div className="space-y-6">
          {/* 기본 정보 */}
          <div>
            <div className="mb-2 flex items-center space-x-2">
              <Badge variant="primary">{productData.category}</Badge>
              {productData.status === 'LIVE' && (
                <Badge variant="success">경매중</Badge>
              )}
              {productData.status === 'SCHEDULED' && (
                <Badge variant="secondary">시작전</Badge>
              )}
              {productData.status === 'ENDED' && (
                <Badge variant="error">종료</Badge>
              )}
            </div>

            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-neutral-900">
                {productData.name}
              </h1>
              <div className="flex items-center space-x-2">
                {/* 북마크 버튼 */}
                {isLoggedIn && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBookmarkToggle}
                    disabled={isBookmarkLoading}
                    className="flex items-center space-x-1"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        isBookmarked ? 'fill-red-500 text-red-500' : ''
                      }`}
                    />
                  </Button>
                )}
                {isOwner && (
                  <>
                    {productData.status === 'SCHEDULED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          router.push(`/products/${productData.productId}/edit`)
                        }}
                        className="flex items-center space-x-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span>상품 수정</span>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3 text-sm text-neutral-600">
              <div className="flex items-center justify-between">
                <span>현재가:</span>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-lg font-semibold transition-all duration-500 ${
                      isPriceUpdated
                        ? 'animate-pulse rounded bg-yellow-100 px-2 py-1 text-red-600'
                        : 'text-success-600'
                    }`}
                  >
                    {formatPrice(currentPrice)}
                  </span>
                  {bidUpdate && (
                    <div className="flex items-center space-x-1">
                      <span className="animate-pulse text-xs text-green-500">
                        실시간
                      </span>
                      {isPriceUpdated && (
                        <span className="text-xs font-semibold text-red-600">
                          (새 입찰!)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>시작가:</span>
                <span>{formatPrice(productData.startPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>즉시 구매가:</span>
                <span className="text-primary-600 font-semibold">
                  {formatPrice(productData.buyNowPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>최소 입찰 단위:</span>
                <span>{formatPrice(productData.minBidStep)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>경매 시작:</span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDateTime(productData.startAt)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>경매 종료:</span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDateTime(productData.endAt)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>경매 종료까지:</span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span
                    className={
                      remainingTime && remainingTime < 3600
                        ? 'animate-pulse font-semibold text-red-500'
                        : ''
                    }
                  >
                    {formatRemainingTime(remainingTime)}
                  </span>
                  {isTimerSubscribed && (
                    <span className="ml-1 animate-pulse text-xs text-green-500">
                      실시간
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>총 입찰 횟수:</span>
                <div className="flex items-center space-x-2">
                  <span
                    className={`font-semibold transition-all duration-500 ${
                      isBidCountUpdated
                        ? 'animate-pulse rounded bg-blue-100 px-2 py-1 text-blue-600'
                        : ''
                    }`}
                  >
                    {bidUpdate?.bidCount || productData.totalBidCount || 0}회
                  </span>
                  {bidUpdate && (
                    <div className="flex items-center space-x-1">
                      <span className="animate-pulse text-xs text-green-500">
                        실시간
                      </span>
                      {isBidCountUpdated && (
                        <span className="text-xs font-semibold text-blue-600">
                          (새 입찰!)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 판매자 정보 */}
          <Card variant="outlined">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900">
                  판매자 정보
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/seller/${productData.sellerId}`)}
                >
                  상세보기
                </Button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-neutral-400" />
                  <span>{productData.sellerNickname}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 입찰 섹션 */}
          {productData.status === 'LIVE' && !isOwner && (
            <Card variant="outlined">
              <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">
                  입찰하기
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700">
                      입찰 금액
                    </label>
                    <Input
                      type="text"
                      value={bidAmount}
                      onChange={handleBidAmountChange}
                      placeholder={`최소 ${formatPrice(currentPrice + productData.minBidStep)}`}
                      className="text-lg"
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      최소 입찰가:{' '}
                      {formatPrice(currentPrice + productData.minBidStep)}
                    </p>
                    {apiError && (
                      <p className="mt-1 text-sm text-red-600">{apiError}</p>
                    )}
                  </div>
                  <Button
                    onClick={handleBid}
                    disabled={isLoading || !bidAmount}
                    className="w-full"
                  >
                    {isLoading ? '입찰 중...' : '입찰하기'}
                  </Button>
                  <Button
                    onClick={handleBuyNow}
                    disabled={isLoading}
                    variant="outline"
                    className="border-primary-500 text-primary-600 hover:bg-primary-50 w-full"
                  >
                    {isLoading
                      ? '처리 중...'
                      : `즉시 구매 (${formatPrice(productData.buyNowPrice)})`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 상품 설명 */}
          <Card variant="outlined">
            <CardContent className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-neutral-900">
                상품 설명
              </h3>
              <p className="text-sm whitespace-pre-wrap text-neutral-700">
                {productData.description}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QnA 섹션 */}
      <Card variant="outlined" className="mt-6">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">
              상품 문의 (QnA)
            </h3>
            <MessageSquare className="h-5 w-5 text-neutral-400" />
          </div>

          {/* QnA 질문 작성 */}
          {isLoggedIn && (
            <div className="mb-6 space-y-2">
              <Input
                placeholder="상품에 대해 궁금한 점을 질문해주세요"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAddQna()
                  }
                }}
              />
              <Button
                onClick={handleAddQna}
                disabled={!newQuestion.trim()}
                size="sm"
                className="w-full"
              >
                <Send className="mr-2 h-4 w-4" />
                질문 등록
              </Button>
            </div>
          )}

          {/* QnA 목록 */}
          {isQnaLoading ? (
            <div className="py-8 text-center text-neutral-500">
              <div className="border-t-primary-500 mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-neutral-300"></div>
              <p>로딩 중...</p>
            </div>
          ) : qnaList.length === 0 ? (
            <div className="py-8 text-center text-neutral-500">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-neutral-300" />
              <p>등록된 문의가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {qnaList.map((qna: any) => {
                const qnaData = qna.productQnaCreateResponse || qna
                const answers = qna.answers || []
                const isExpanded = expandedQnaId === qnaData.qnaId

                return (
                  <div
                    key={qnaData.qnaId}
                    className="rounded-lg border border-neutral-200 p-4"
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedQnaId(isExpanded ? null : qnaData.qnaId)
                      }
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-primary-600 text-sm font-semibold">
                            Q.
                          </span>
                          <span className="text-sm font-medium text-neutral-900">
                            {qnaData.question}
                          </span>
                        </div>
                        <span className="text-xs text-neutral-400">
                          {qnaData.questionedAt
                            ? new Date(qnaData.questionedAt).toLocaleDateString(
                                'ko-KR',
                              )
                            : ''}
                        </span>
                      </div>
                    </div>

                    {/* 답변 목록 */}
                    {answers.length > 0 && (
                      <div className="ml-4 space-y-2 border-l-2 border-neutral-200 pl-4">
                        {answers.map((answer: any) => (
                          <div key={answer.answerId} className="py-2">
                            <div className="mb-1 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-primary-600 text-sm font-semibold">
                                  A.
                                </span>
                                <span className="text-sm text-neutral-700">
                                  {answer.answer}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  handleDeleteAnswer(
                                    safeProductId,
                                    qnaData.qnaId,
                                  )
                                }}
                                className="h-6 px-2 text-xs text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="text-xs text-neutral-400">
                              {answer.answeredAt
                                ? new Date(
                                    answer.answeredAt,
                                  ).toLocaleDateString('ko-KR')
                                : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 답변 작성 (모든 사용자에게 표시, 권한 없으면 API에서 에러) */}
                    {isLoggedIn && (
                      <div className="mt-3 ml-4 space-y-2 border-l-2 border-neutral-200 pl-4">
                        <Input
                          placeholder="답변을 입력해주세요"
                          value={newAnswers[qnaData.qnaId] || ''}
                          onChange={(e) =>
                            setNewAnswers((prev) => ({
                              ...prev,
                              [qnaData.qnaId]: e.target.value,
                            }))
                          }
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleAddAnswer(qnaData.qnaId)
                            }
                          }}
                          size={2}
                        />
                        <Button
                          onClick={() => handleAddAnswer(qnaData.qnaId)}
                          disabled={!newAnswers[qnaData.qnaId]?.trim()}
                          size="sm"
                          className="w-full"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          답변 등록
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
