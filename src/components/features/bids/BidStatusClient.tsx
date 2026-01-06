'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  PageSizeSelector,
  Pagination,
  PaginationInfo,
} from '@/components/ui/pagination'
import { bidApi, paymentApi } from '@/lib/api'
import {
  createPayment,
  preparePayment,
  confirmPayment,
} from '@/lib/api/payment'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
import { Bid } from '@/types'
import { ExternalLink, StarIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface BidStatusClientProps {
  initialBids?: Bid[]
  initialPagination?: {
    currentPage: number
    totalPages: number
    totalElements: number
    pageSize: number
  }
}

export function BidStatusClient({
  initialBids,
  initialPagination,
}: BidStatusClientProps) {
  const router = useRouter()
  const [apiError, setApiError] = useState('')
  const [payingBidId, setPayingBidId] = useState<number | null>(null)

  // 입찰 내역 상태
  const [bids, setBids] = useState<any[]>(initialBids || [])
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  // 입찰 데이터 로드
  const loadBids = useCallback(async (page: number = 1, size: number = 10) => {
    setIsLoading(true)
    setApiError('')

    try {
      const response = await bidApi.getMyBids({
        page: page, // API도 1-based 페이지 사용
        size,
      })

      if (response.success && response.data) {
        const data = response.data as any
        const auctions = data.auctions || []

        setBids(auctions)
        setCurrentPage(data.currentPage || 1)
        setTotalPages(data.totalPages || 0)
        setTotalElements(data.totalElements || 0)
        setPageSize(size)
      } else {
        setApiError(response.msg || '입찰 내역을 불러오는데 실패했습니다.')
      }
    } catch (error: any) {
      console.error('입찰 내역 로드 실패:', error)
      setApiError('입찰 내역을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 초기 로드
  useEffect(() => {
    if (!initialBids || initialBids.length === 0) {
      loadBids(1, pageSize)
    } else {
      // initialBids가 있을 때도 페이지네이션 정보 설정
      // initialBids도 Seller 필드 변환
      const transformedInitialBids = initialBids.map((bid: any) => ({
        ...bid,
        seller: bid.Seller || bid.seller, // 대문자 Seller를 소문자 seller로 변환
      }))

      setBids(transformedInitialBids)

      // initialPagination이 있으면 사용, 없으면 기본값 설정
      if (initialPagination) {
        setCurrentPage(initialPagination.currentPage)
        setTotalPages(initialPagination.totalPages)
        setTotalElements(initialPagination.totalElements)
        setPageSize(initialPagination.pageSize)
      } else {
        // fallback: 데이터 길이로 기본값 설정
        setTotalElements(transformedInitialBids.length)
        setTotalPages(1)
        setCurrentPage(1)
        setPageSize(transformedInitialBids.length)
      }
    }
  }, [loadBids, initialBids, initialPagination, pageSize])

  // 입찰 내역 페이지네이션
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      loadBids(page, pageSize)
    }
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    loadBids(1, newSize)
  }

  const refresh = () => {
    loadBids(currentPage, pageSize)
  }

  const hasNext = currentPage < totalPages
  const hasPrevious = currentPage > 1

  // 변환된 입찰 데이터
  const transformedBids = bids

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '미정'
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return '미정'
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getStatusInfo = (bid: any) => {
    const status = bid.status || ''

    switch (status) {
      case 'WIN':
        return {
          label: '낙찰 성공',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          icon: '✓',
        }
      case 'LOSE':
        return {
          label: '낙찰 실패',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          icon: '✕',
        }
      case 'ONGOING':
        return {
          label: '진행중',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          icon: '∙',
        }
      default:
        return {
          label: '알 수 없음',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          icon: '❓',
        }
    }
  }

  // 결제 가능 여부 확인
  const canPayBid = (bid: any) => {
    return bid.status === 'WIN' && !bid.paidAt
  }

  // 완전한 결제 플로우 (올바른 순서로 수정)
  const completePaymentFlow = async (
    auctionId: number,
    winnerId: number,
    bidAmount: number,
    productName?: string,
  ) => {
    setPayingBidId(auctionId)

    try {
      // 1단계: 결제 준비 (paymentId 및 결제 정보 획득)
      // 먼저 prepare를 호출하여 결제 가능 여부 확인
      const prepareResult = await preparePayment({ winnerId })

      const { paymentId, autoPaid, status, toss } = prepareResult

      // 2-1. 자동결제 성공한 경우
      if (autoPaid && status === 'PAID') {
        showSuccessToast('결제가 완료되었습니다!')
        refresh()
        return
      }

      // 2-2. 수동 결제 필요한 경우 (Toss 결제창 호출)
      if (!autoPaid && toss) {
        const { orderId, amount } = toss

        // Toss SDK 로드 확인
        if (typeof window === 'undefined' || !(window as any).TossPayments) {
          showErrorToast(
            '결제 시스템 로딩 중입니다. 잠시 후 다시 시도해주세요.',
          )
          return
        }

        try {
          const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
          if (!clientKey) {
            showErrorToast('결제 설정이 올바르지 않습니다.')
            return
          }

          // Toss Payments 인스턴스 생성
          const tossPayments = (window as any).TossPayments(clientKey)

          // 결제 요청 (Toss 결제창으로 이동)
          await tossPayments.requestPayment('카드', {
            amount: amount,
            orderId: orderId,
            // 상품명이 존재하면 주문명으로 사용하고, 없으면 기본 문구
            orderName: productName || '경매 결제',
            customerEmail: localStorage.getItem('userEmail') || '',
            customerName: localStorage.getItem('userName') || '',
            successUrl: `${window.location.origin}/payments/success?paymentId=${paymentId}&winnerId=${winnerId}&amount=${amount}`,
            failUrl: `${window.location.origin}/payments/fail?paymentId=${paymentId}&winnerId=${winnerId}&amount=${amount}`,
          })
        } catch (tossError: any) {
          // 사용자 취소 제외 에러 처리
          if (tossError.code !== 'USER_CANCEL') {
            showErrorToast(tossError.message || '결제 중 오류가 발생했습니다.')
          }
        }
      }
    } catch (error: any) {
      console.error('[결제] 결제 오류:', error)
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        '결제 중 오류가 발생했습니다.'
      showErrorToast(errorMessage)
    } finally {
      setPayingBidId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">입찰 내역</h1>
        <p className="mt-2 text-neutral-600">
          총 {totalElements || transformedBids.length}개의 입찰 내역이 있습니다
        </p>
      </div>

      {/* 입찰 내역 */}
      <div className="space-y-6">
        {isLoading ? (
          <Card variant="outlined" className="w-full">
            <CardContent className="py-16 text-center">
              <div className="mb-6">
                <div className="border-t-primary-600 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-neutral-200"></div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  입찰 내역을 불러오는 중...
                </h3>
              </div>
            </CardContent>
          </Card>
        ) : transformedBids.length === 0 ? (
          <Card variant="outlined" className="w-full">
            <CardContent className="py-16 text-center">
              <div className="mb-6">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100">
                  <svg
                    className="h-10 w-10 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-neutral-900">
                  입찰 내역이 없습니다
                </h3>
                <p className="mb-6 text-neutral-600">
                  첫 번째 경매에 참여해보세요!
                </p>
                <div className="space-x-3">
                  <Button onClick={() => router.push('/')} size="lg">
                    경매 둘러보기
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {transformedBids.map((bid: any) => {
              const statusInfo = getStatusInfo(bid)

              return (
                <Card
                  key={bid.bidId}
                  variant="outlined"
                  className="transition-shadow hover:shadow-lg"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-6">
                      {/* 상품 이미지 */}
                      <div className="shrink-0">
                        <div
                          className="h-24 w-24 cursor-pointer rounded-lg bg-neutral-200 transition-transform hover:scale-105"
                          onClick={() =>
                            router.push(`/products/${bid.productId}`)
                          }
                          title="상품 상세보기"
                        >
                          {bid.productImageUrl ? (
                            <img
                              src={bid.productImageUrl}
                              alt={bid.productName}
                              className="h-24 w-24 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-neutral-100">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200">
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
                                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                  />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 입찰 정보 */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center space-x-2">
                          <div
                            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
                          >
                            <span className="mr-1">{statusInfo.icon}</span>
                            {statusInfo.label}
                          </div>
                        </div>

                        <h3
                          className="mb-2 flex cursor-pointer items-center gap-2 text-lg font-semibold text-neutral-900 transition-colors hover:text-blue-600"
                          onClick={() =>
                            router.push(`/products/${bid.productId}`)
                          }
                          title="상품 상세보기"
                        >
                          {bid.productName}
                          <ExternalLink className="h-4 w-4" />
                        </h3>

                        <div className="mb-3 grid grid-cols-1 gap-2 text-sm text-neutral-600 sm:grid-cols-2">
                          <div className="flex items-center space-x-2">
                            <span className="w-20 text-neutral-500">
                              내 입찰가:
                            </span>
                            <span className="text-primary-600 font-semibold">
                              {formatPrice(bid.myBid)}
                            </span>
                          </div>
                          {bid.finalBid && (
                            <div className="flex items-center space-x-2">
                              <span className="w-20 text-neutral-500">
                                최종 가격:
                              </span>
                              <span className="font-semibold">
                                {formatPrice(bid.finalBid)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2">
                            <span className="w-20 text-neutral-500">
                              종료 시간:
                            </span>
                            <span>{formatDate(bid.endAt)}</span>
                          </div>
                        </div>

                        {bid.status === 'ONGOING' && (
                          <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-3">
                            <div className="mb-2 text-sm font-medium text-neutral-900">
                              경매 진행 중
                            </div>
                            <p className="text-sm text-neutral-700">
                              경매가 진행 중입니다. 결과를 기다려주세요.
                            </p>
                          </div>
                        )}

                        {bid.status === 'WIN' && !bid.paidAt && (
                          <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
                            <div className="mb-2 text-sm font-bold text-purple-900">
                              낙찰 성공! 결제를 진행해주세요
                            </div>
                            <p className="text-sm text-purple-800">
                              {formatPrice(bid.myBid)}을 결제하여 거래를
                              완료하세요.
                            </p>
                          </div>
                        )}

                        {bid.status === 'WIN' && bid.paidAt && (
                          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
                            <div className="mb-2 text-sm font-bold text-green-900">
                              결제 완료!
                            </div>
                            <p className="text-sm text-green-800">
                              결제가 완료되었습니다. 판매자와 연락하여 상품을
                              받아보세요.
                            </p>
                          </div>
                        )}

                        {/* 액션 버튼들 */}
                        <div className="flex flex-wrap gap-2">
                          {bid.status === 'WIN' && (
                            <>
                              {canPayBid(bid) ? (
                                <Button
                                  size="md"
                                  onClick={() => {
                                    // winnerId 찾기 (여러 필드 확인)
                                    const winnerId =
                                      bid.winnerId ||
                                      bid.userId ||
                                      bid.bidderId ||
                                      bid.winningBidderId ||
                                      bid.auctionId // fallback으로 auctionId 사용

                                    if (!winnerId) {
                                      showErrorToast(
                                        '낙찰자 정보를 찾을 수 없습니다. Bid 객체: ' +
                                          JSON.stringify({
                                            winnerId: bid.winnerId,
                                            userId: bid.userId,
                                            bidderId: bid.bidderId,
                                            auctionId: bid.auctionId,
                                          }),
                                      )
                                      return
                                    }

                                    if (!bid.myBid || bid.myBid <= 0) {
                                      showErrorToast(
                                        '결제 금액이 올바르지 않습니다.',
                                      )
                                      return
                                    }

                                    completePaymentFlow(
                                      bid.auctionId,
                                      winnerId,
                                      bid.myBid,
                                      bid.productName,
                                    )
                                  }}
                                  disabled={payingBidId === bid.auctionId}
                                  className="bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                                >
                                  {payingBidId === bid.auctionId
                                    ? '결제 중...'
                                    : '결제하기'}
                                </Button>
                              ) : bid.paidAt ? (
                                <>
                                  <Button
                                    size="md"
                                    variant="outline"
                                    disabled
                                    className="font-bold"
                                  >
                                    결제 완료
                                  </Button>
                                  <Button
                                    size="md"
                                    onClick={() =>
                                      router.push(
                                        `/products/${bid.productId}?tab=reviews&action=write`,
                                      )
                                    }
                                    className="bg-yellow-500 font-bold text-white hover:bg-yellow-600"
                                  >
                                    <StarIcon className="mr-1 h-4 w-4" />
                                    리뷰 작성
                                  </Button>
                                </>
                              ) : null}
                            </>
                          )}
                          {(bid.status === 'ONGOING' ||
                            bid.status === 'LOSE') && (
                            <Button
                              size="md"
                              onClick={() =>
                                router.push(`/products/${bid.productId}`)
                              }
                            >
                              상품 보기
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* 페이지네이션 UI */}
            <div className="mt-8 space-y-4">
              {/* 페이지 정보 및 페이지 크기 선택 */}
              <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
                <PaginationInfo
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalElements={totalElements}
                  pageSize={pageSize}
                />
                <PageSizeSelector
                  pageSize={pageSize}
                  onPageSizeChange={handlePageSizeChange}
                  options={[5, 10, 20]}
                />
              </div>

              {/* 페이지네이션 컨트롤 */}
              {totalPages > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  hasNext={hasNext}
                  hasPrevious={hasPrevious}
                  isLoading={isLoading}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
