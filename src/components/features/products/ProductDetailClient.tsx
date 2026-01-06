'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
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
  const [showBuyNowDialog, setShowBuyNowDialog] = useState(false)
  const [auctionEnded, setAuctionEnded] = useState(false)

  const safeProductId = product.productId
  const safeAuctionId = product.auctionId

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

  // Normalize API date strings and treat no-offset values as KST explicitly
  const toKstDate = (dateString: string) => {
    if (!dateString) return null
    const base = dateString.replace(' ', 'T')
    const hasOffset = /([+-]\d{2}:?\d{2}|Z)$/.test(base)
    const normalized = hasOffset ? base : `${base}Z`
    const date = new Date(normalized)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const formatDateTime = (dateString: string) => {
    const date = toKstDate(dateString)
    if (!date) return '시간 미정'
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Seoul',
    }).format(date)
  }

  const formatDateOnly = (dateString: string) => {
    const date = toKstDate(dateString)
    if (!date) return ''
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Seoul',
    }).format(date)
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
  const handleDeleteAnswer = async (
    productId: number,
    qnaId: number,
    answerId: number,
  ) => {
    if (!confirm('답변을 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await productApi.deleteAnswer(productId, qnaId, answerId)
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

    if (productData.status !== 'LIVE') {
      showInfoToast('경매가 아직 시작되지 않았습니다.')
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

    if (productData.status !== 'LIVE') {
      showInfoToast('경매 시작 후에 이용 가능합니다.')
      return
    }

    setShowBuyNowDialog(true)
  }

  const confirmBuyNow = async () => {
    setShowBuyNowDialog(false)
    setIsLoading(true)
    setApiError('')

    try {
      const response: any = await auctionApi.buyNow(safeAuctionId, {
        bidAmount: productData.buyNowPrice,
      })

      if (response.success) {
        showSuccessToast('확정되었습니다! 입찰 현황에서 결제를 진행해주세요.')
        setProductData((prev) => ({
          ...prev,
          status: 'ENDED' as const,
        }))
        setAuctionEnded(true)
        // 상세 재조회
        setIsRefreshing(true)
        setTimeout(() => {
          router.refresh()
          setIsRefreshing(false)
        }, 500)
      } else {
        const message =
          response.message || response.msg || '즉시 구매에 실패했습니다.'
        setApiError(message)
        showErrorToast(message)
        // 실패 시 상태 동기화
        if (message.includes('종료') || message.includes('LIVE')) {
          setIsRefreshing(true)
          setTimeout(() => {
            router.refresh()
            setIsRefreshing(false)
          }, 500)
        }
      }
    } catch (error: any) {
      console.error('즉시 구매 실패:', error)
      const apiError = handleApiError(error)
      setApiError(apiError.message)
      showErrorToast(apiError.message)
      // 에러 발생 시 재인증 또는 재조회
      if (
        apiError.message.includes('401') ||
        apiError.message.includes('403')
      ) {
        showInfoToast('다시 로그인해주세요.')
        router.push('/login')
      } else {
        setIsRefreshing(true)
        setTimeout(() => {
          router.refresh()
          setIsRefreshing(false)
        }, 500)
      }
    }

    setIsLoading(false)
  }

  const currentPrice = productData.currentHighestBid || productData.startPrice

  // remainingTimeSeconds 계산
  const calculateRemainingSeconds = () => {
    const endTime = toKstDate(productData.endAt)?.getTime() || 0
    const now = Date.now()
    return Math.max(0, Math.floor((endTime - now) / 1000))
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
          {/* 헤더 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge variant="primary" className="px-3 py-1.5 text-base">
                  {productData.category}
                </Badge>
                {productData.status === 'LIVE' && (
                  <Badge variant="success" className="animate-pulse">
                    <Zap className="mr-1 h-3 w-3" />
                    경매중
                  </Badge>
                )}
                {productData.status === 'SCHEDULED' && (
                  <Badge variant="secondary">
                    <Clock className="mr-1 h-3 w-3" />
                    시작전
                  </Badge>
                )}
                {productData.status === 'ENDED' && (
                  <Badge variant="error">종료</Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {isLoggedIn && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleBookmarkToggle}
                    disabled={isBookmarkLoading}
                    className="hover:bg-red-50"
                  >
                    <Heart
                      className={`h-5 w-5 transition-all ${
                        isBookmarked
                          ? 'fill-red-500 text-red-500'
                          : 'text-neutral-400'
                      }`}
                    />
                  </Button>
                )}
              </div>
            </div>

            <h1 className="text-3xl leading-tight font-bold text-neutral-900">
              {productData.name}
            </h1>

            {isOwner && productData.status === 'SCHEDULED' && (
              <Button
                variant="outline"
                onClick={() => {
                  router.push(`/products/${productData.productId}/edit`)
                }}
                className="border-primary-300 text-primary-600 hover:bg-primary-50 w-full"
              >
                <Edit className="mr-2 h-4 w-4" />
                상품 수정
              </Button>
            )}
          </div>

          {/* 가격 정보 - 강조된 카드 */}
          <Card
            variant="elevated"
            className="from-primary-50 to-primary-100/50 border-0 bg-linear-to-br"
          >
            <CardContent className="space-y-4 p-6">
              {/* 현재가 */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-neutral-600">
                  현재 입찰가
                </span>
                <div className="flex items-baseline justify-between">
                  <span
                    className={`text-4xl font-bold transition-all duration-500 ${
                      isPriceUpdated
                        ? 'animate-pulse text-red-600'
                        : 'text-primary-600'
                    }`}
                  >
                    {formatPrice(currentPrice)}
                  </span>
                </div>
              </div>

              <div className="border-primary-200 grid grid-cols-3 gap-3 border-t pt-4">
                <div className="text-center">
                  <div className="mb-1 text-xs text-neutral-600">시작가</div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {formatPrice(productData.startPrice)}
                  </div>
                </div>
                <div className="border-primary-200 border-r border-l text-center">
                  <div className="mb-1 text-xs text-neutral-600">
                    즉시 구매가
                  </div>
                  <div className="text-primary-600 text-sm font-semibold">
                    {formatPrice(productData.buyNowPrice)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="mb-1 text-xs text-neutral-600">입찰 단위</div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {formatPrice(productData.minBidStep)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 경매 정보 - 두 개의 카드 */}
          <div className="grid grid-cols-2 gap-3">
            <Card variant="outlined">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center space-x-2 text-neutral-600">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">남은 시간</span>
                </div>
                <div
                  className={`text-xl font-bold ${
                    remainingTime && remainingTime < 3600
                      ? 'text-red-600'
                      : 'text-neutral-900'
                  }`}
                >
                  {formatRemainingTime(remainingTime)}
                </div>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center space-x-2 text-neutral-600">
                  <Zap className="h-4 w-4" />
                  <span className="text-xs font-medium">입찰 횟수</span>
                </div>
                <div
                  className={`text-xl font-bold transition-all duration-500 ${
                    isBidCountUpdated ? 'animate-pulse text-blue-600' : ''
                  }`}
                >
                  {productData.totalBidCount || 0}회
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 상세 정보 */}
          <Card variant="outlined" className="hidden lg:block">
            <CardContent className="p-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <span className="text-neutral-600">경매 시작</span>
                  <span className="font-medium text-neutral-900">
                    {formatDateTime(productData.startAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <span className="text-neutral-600">경매 종료</span>
                  <span className="font-medium text-neutral-900">
                    {formatDateTime(productData.endAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 판매자 정보 */}
          {/* <Card variant="outlined">
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
          </Card> */}

          {/* 입찰 섹션 */}
          {productData.status === 'LIVE' && !isOwner && (
            <Card
              variant="elevated"
              className="from-primary-600 to-primary-700 border-0 bg-linear-to-br text-white"
            >
              <CardContent className="space-y-4 p-6">
                <div>
                  <h3 className="mb-1 text-xl font-bold">입찰에 참여하세요</h3>
                  <p className="text-primary-100 text-sm">
                    최소 입찰가 이상으로 입찰하면 경매에 참여할 수 있습니다
                  </p>
                </div>

                <div className="space-y-3 rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                  <div>
                    <label className="text-primary-50 mb-2 block text-sm font-semibold">
                      입찰 금액
                    </label>
                    <Input
                      type="text"
                      value={bidAmount}
                      onChange={handleBidAmountChange}
                      placeholder={`최소 ${formatPrice(currentPrice + productData.minBidStep)}`}
                      className="border-0 bg-white text-lg font-semibold text-neutral-900"
                    />
                    <p className="text-primary-100 mt-2 text-xs">
                      최소 입찰가:{' '}
                      <span className="font-bold">
                        {formatPrice(currentPrice + productData.minBidStep)}
                      </span>
                    </p>
                    {apiError && (
                      <div className="mt-2 rounded bg-red-500/20 p-2 text-sm font-medium text-red-200">
                        {apiError}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    onClick={handleBid}
                    disabled={isLoading || !bidAmount}
                    className="text-primary-600 hover:bg-primary-50 h-auto w-full bg-white py-3 text-base font-bold"
                  >
                    {isLoading ? (
                      <>
                        <span className="mr-2 animate-spin">⏳</span>
                        입찰 중...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5" />
                        입찰하기
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleBuyNow}
                    disabled={isLoading || auctionEnded}
                    className="h-auto w-full border border-white/30 bg-white/20 py-3 text-base font-bold text-white hover:bg-white/30"
                  >
                    {isLoading
                      ? '처리 중...'
                      : auctionEnded
                        ? '구매 완료'
                        : `즉시 구매 ${formatPrice(productData.buyNowPrice)}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {(productData.status === 'SCHEDULED' || auctionEnded) && !isOwner && (
            <Card
              variant="outlined"
              className={
                auctionEnded
                  ? 'border-green-200 bg-green-50/70'
                  : 'border-primary-200 bg-primary-50/70'
              }
            >
              <CardContent className="space-y-3 p-6">
                {auctionEnded ? (
                  <>
                    <div className="flex items-center space-x-2 text-green-700">
                      <span className="text-2xl">✓</span>
                      <span className="text-sm font-semibold">
                        입찰 현황에서 결제를 진행해주세요.
                      </span>
                    </div>
                    <p className="text-base font-semibold text-neutral-800">
                      즉시 구매가 완료되었습니다.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-primary-700 flex items-center space-x-2">
                      <Clock className="h-5 w-5" />
                      <span className="text-sm font-semibold">
                        경매 시작 전
                      </span>
                    </div>
                    <p className="text-base font-semibold text-neutral-800">
                      {formatDateTime(productData.startAt)}에 시작 예정입니다.
                    </p>
                    <p className="text-sm text-neutral-600">
                      시작 전에는 입찰 및 즉시 구매를 할 수 없습니다. 시작 시간
                      이후 다시 시도해주세요.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {productData.status === 'ENDED' && !isOwner && (
            <Card
              variant="outlined"
              className="border-neutral-300 bg-neutral-50"
            >
              <CardContent className="p-6 text-center">
                <Clock className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
                <h3 className="mb-1 text-lg font-semibold text-neutral-900">
                  경매가 종료되었습니다
                </h3>
                <p className="text-sm text-neutral-600">
                  다른 상품을 확인해보세요
                </p>
              </CardContent>
            </Card>
          )}

          {/* 상품 설명 */}
          <Card variant="outlined">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center space-x-2">
                <div className="bg-primary-600 h-1 w-8 rounded-full"></div>
                <h3 className="text-lg font-bold text-neutral-900">
                  상품 설명
                </h3>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
                <p className="text-base leading-relaxed whitespace-pre-wrap text-neutral-700">
                  {productData.description || '상품 설명이 없습니다.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QnA 섹션 */}
      <Card variant="outlined" className="mt-6">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-100 flex h-10 w-10 items-center justify-center rounded-lg">
                <MessageSquare className="text-primary-600 h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900">
                상품 문의 (Q&A)
              </h3>
            </div>
            {qnaList.length > 0 && (
              <Badge variant="primary" className="px-3 py-1.5 text-base">
                {qnaList.length}개
              </Badge>
            )}
          </div>

          {/* QnA 질문 작성 */}
          {isLoggedIn ? (
            <div className="border-primary-300 bg-primary-50 mb-6 rounded-lg border-2 border-dashed p-4">
              <div className="mb-3 flex items-center space-x-2">
                <Send className="text-primary-600 h-4 w-4" />
                <span className="text-primary-900 text-sm font-semibold">
                  새로운 질문 작성
                </span>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="상품에 대해 궁금한 점을 질문해주세요..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAddQna()
                    }
                  }}
                  className="border-primary-300 focus:border-primary-500 focus:ring-primary-500"
                />
                <Button
                  onClick={handleAddQna}
                  disabled={!newQuestion.trim()}
                  className="bg-primary-600 hover:bg-primary-700 w-full"
                >
                  <Send className="mr-2 h-4 w-4" />
                  질문 등록
                </Button>
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-center">
              <p className="mb-3 text-sm text-neutral-600">
                로그인 후 질문을 등록할 수 있습니다
              </p>
              <Button
                onClick={() => router.push('/login')}
                size="sm"
                className="bg-primary-600 hover:bg-primary-700"
              >
                로그인
              </Button>
            </div>
          )}

          {/* QnA 목록 */}
          {isQnaLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="space-y-3 text-center">
                <div className="flex justify-center">
                  <div className="border-t-primary-500 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200"></div>
                </div>
                <p className="text-sm text-neutral-600">
                  Q&A 목록을 불러오는 중...
                </p>
              </div>
            </div>
          ) : qnaList.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                  <MessageSquare className="h-8 w-8 text-neutral-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-neutral-900">
                    등록된 문의가 없습니다
                  </p>
                  <p className="text-sm text-neutral-600">
                    첫 번째 질문을 작성해보세요
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {qnaList.map((qna: any, index: number) => {
                const qnaData = qna.productQnaCreateResponse || qna
                const answers = qna.answers || []
                const isExpanded = expandedQnaId === qnaData.qnaId

                return (
                  <div
                    key={qnaData.qnaId}
                    className="group hover:border-primary-300 animate-fade-in overflow-hidden rounded-lg border border-neutral-200 transition-all duration-300 hover:shadow-md"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* 질문 영역 */}
                    <div
                      className="from-primary-50 via-primary-50/70 hover:bg-primary-50 cursor-pointer bg-linear-to-r to-transparent p-4 transition-colors"
                      onClick={() =>
                        setExpandedQnaId(isExpanded ? null : qnaData.qnaId)
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-1 items-start gap-3">
                          <div className="bg-primary-600 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-md">
                            Q
                          </div>
                          <div className="flex-1 pt-0.5">
                            <p className="text-base font-semibold text-neutral-900">
                              {qnaData.question}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">
                              {formatDateOnly(qnaData.questionedAt)}
                            </p>
                          </div>
                        </div>
                        {answers.length > 0 && (
                          <div className="shrink-0 rounded-full bg-green-100 px-2 py-1 text-xs font-medium whitespace-nowrap text-green-700">
                            ✓ 답변 {answers.length}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 답변 목록 및 작성 */}
                    {isExpanded && (
                      <div className="space-y-3 border-t border-neutral-200 bg-neutral-50 p-4">
                        {/* 답변 목록 */}
                        {answers.length > 0 && (
                          <div className="space-y-2">
                            {answers.map((answer: any) => (
                              <div
                                key={answer.answerId}
                                className="group/answer hover:border-primary-300 rounded-lg border border-neutral-200 bg-white p-3 transition-all"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex flex-1 items-start gap-2">
                                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                                      A
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm text-neutral-800">
                                        {answer.answer}
                                      </p>
                                      <p className="mt-1 text-xs text-neutral-500">
                                        {formatDateOnly(answer.answeredAt)}
                                      </p>
                                    </div>
                                  </div>
                                  {isOwner && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        handleDeleteAnswer(
                                          safeProductId,
                                          qnaData.qnaId,
                                          answer.answerId,
                                        )
                                      }}
                                      className="h-6 p-0 px-2 opacity-0 transition-opacity group-hover/answer:opacity-100 hover:bg-red-100 hover:text-red-600"
                                      title="답변 삭제"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 답변 작성 */}
                        {isLoggedIn && (
                          <div className="space-y-2 rounded-lg border-2 border-dashed border-neutral-300 bg-white p-3">
                            <p className="text-xs font-medium text-neutral-600">
                              답변 작성
                            </p>
                            <Input
                              placeholder="답변을 입력해주세요..."
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
                              className="border-neutral-300 text-sm"
                            />
                            <Button
                              onClick={() => handleAddAnswer(qnaData.qnaId)}
                              disabled={!newAnswers[qnaData.qnaId]?.trim()}
                              size="sm"
                              className="bg-primary-600 hover:bg-primary-700 w-full"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              답변 등록
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 즉시 구매 확인 다이얼로그 */}
      <Dialog open={showBuyNowDialog} onOpenChange={setShowBuyNowDialog}>
        <DialogContent
          className="bg-white sm:max-w-md"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-neutral-900">
              즉시 구매 확인
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block text-base font-semibold text-orange-600">
                {formatPrice(productData.buyNowPrice)}
              </span>
              <span className="mt-2 block text-sm text-neutral-700">
                즉시 구매 시 경매가 종료되고 낙찰이 확정됩니다.
                <br />
                구매하시겠습니까?
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBuyNowDialog(false)}
              className="bg-white hover:bg-neutral-100"
            >
              취소
            </Button>
            <Button
              onClick={confirmBuyNow}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              구매 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
