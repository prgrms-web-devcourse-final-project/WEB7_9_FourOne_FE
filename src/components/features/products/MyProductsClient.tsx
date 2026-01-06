'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { productApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import { getFullImageUrl } from '@/lib/utils/image-url'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
import { Product } from '@/types'
import {
  Clock,
  Edit,
  Heart,
  MessageSquare,
  Send,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface MyProductsClientProps {
  initialProducts?: Product[]
}

export function MyProductsClient({ initialProducts }: MyProductsClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [sortBy, setSortBy] = useState<'LATEST' | 'POPULAR'>('LATEST')
  const [products, setProducts] = useState(initialProducts || [])
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // QnA 모달 관련 상태
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  )
  const [isQnaModalOpen, setIsQnaModalOpen] = useState(false)
  const [qnaList, setQnaList] = useState<any[]>([])
  const [isQnaLoading, setIsQnaLoading] = useState(false)
  const [newAnswers, setNewAnswers] = useState<Record<number, string>>({})

  // apiError가 변경되면 토스트로 표시
  useEffect(() => {
    if (apiError) {
      showErrorToast(apiError)
      setApiError('') // 토스트 표시 후 초기화
    }
  }, [apiError])

  // 내 상품 목록 조회
  const fetchMyProducts = async () => {
    setIsLoading(true)
    setApiError('')
    try {
      const response: any = await productApi.getMyProducts()

      if (response.success && response.data) {
        // API 응답 데이터 구조에 맞게 변환
        let productsData = []
        if (Array.isArray(response.data)) {
          productsData = response.data
        } else if (
          response.data.products &&
          Array.isArray(response.data.products)
        ) {
          productsData = response.data.products
        } else if (
          response.data.content &&
          Array.isArray(response.data.content)
        ) {
          productsData = response.data.content
        }
        // API 응답의 status를 새로운 상태로 변환
        // 경매가 없으면 PENDING, 여러 경매가 있으면 가장 최근 경매의 상태 사용
        const processedProducts = productsData.map((product: any) => {
          // 가장 최근 경매 정보 가져오기 (auctions 배열이 있다면)
          const latestAuction = product.auctions?.[0] || product.auction
          // 경매가 있으면 경매의 상태를, 없으면 상품의 상태를 사용
          const statusToUse = latestAuction
            ? latestAuction.status
            : product.status
          const displayStatus = mapApiStatusToDisplay(
            statusToUse,
            latestAuction,
          )
          return {
            ...product,
            status: displayStatus,
            latestAuction, // 최근 경매 정보도 함께 저장
            // 응답 필드명 매핑
            thumbnailUrl: product.imageUrl || product.thumbnailUrl,
            currentPrice:
              product.currentHighestBid || product.currentPrice || 0,
            initialPrice: product.startPrice || product.initialPrice || 0,
            bidderCount: product.bidCount || product.bidderCount || 0,
            auctionEndTime: product.endAt || product.auctionEndTime,
          }
        })

        setProducts(processedProducts)
      } else {
        console.error('❌ API 응답 실패:', response)
        setApiError(
          response.message ||
            response.msg ||
            '상품 목록을 불러오는데 실패했습니다.',
        )
      }
    } catch (error: any) {
      console.error('❌ 내 상품 목록 조회 실패:', error)
      // 백엔드 에러 메시지 그대로 표시
      const apiError = handleApiError(error)
      setApiError(apiError.message)
    }
    setIsLoading(false)
  }

  // 상품 삭제
  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('정말로 이 상품을 삭제하시겠습니까?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await productApi.deleteProduct(productId)
      if (response.success) {
        showSuccessToast('상품이 성공적으로 삭제되었습니다.')
        // 정렬 상태를 유지하면서 목록 새로고침 (상태 필터링 제거)
        fetchMyProducts()
      } else {
        setApiError(
          response.message || response.msg || '상품 삭제에 실패했습니다.',
        )
      }
    } catch (error: any) {
      console.error('상품 삭제 실패:', error)
      // 백엔드 에러 메시지 그대로 표시
      const apiError = handleApiError(error)
      setApiError(apiError.message)
    }
    setIsLoading(false)
  }

  // API 응답의 영어 status를 새로운 상태로 변환
  // 경매가 없으면 PENDING, 여러 경매가 있으면 가장 최근 경매의 상태 사용
  const mapApiStatusToDisplay = (apiStatus: string, auction?: any): string => {
    // 경매가 없으면 PENDING
    if (!auction) {
      return 'PENDING'
    }

    // API 상태를 새로운 상태로 매핑
    switch (apiStatus) {
      case 'BEFORE_START':
        return 'SCHEDULED' // 경매 등록 완료, 시작 대기 중
      case 'SELLING':
        return 'LIVE' // 경매 진행 중
      case 'SOLD':
      case 'FAILED':
        return 'ENDED' // 경매 마감 (낙찰/유찰)
      case 'PENDING':
        return 'PENDING' // 경매 등록 전
      case 'SCHEDULED':
        return 'SCHEDULED' // 경매 등록 완료, 시작 대기 중
      case 'LIVE':
        return 'LIVE' // 경매 진행 중
      case 'ENDED':
        return 'ENDED' // 경매 마감
      default:
        return apiStatus || 'PENDING' // 알 수 없는 상태는 PENDING으로 기본값
    }
  }

  // 표시용 상태를 한국어로 변환
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return '경매 등록 전'
      case 'SCHEDULED':
        return '경매 시작 대기'
      case 'LIVE':
        return '경매 진행 중'
      case 'ENDED':
        return '경매 마감'
      default:
        return status || '알 수 없음'
    }
  }

  // 정렬 변경 핸들러
  const handleSortChange = (sort: 'LATEST' | 'POPULAR') => {
    setSortBy(sort)
    // API 재호출하지 않고 클라이언트에서 정렬만 수행
  }

  // 컴포넌트 마운트 시 상품 목록 조회
  useEffect(() => {
    if (!initialProducts || initialProducts.length === 0) {
      fetchMyProducts()
    } else {
      setProducts(initialProducts)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 정렬된 상품 목록 (클라이언트 정렬)
  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'LATEST') {
      // 최신순: createdAt 기준 내림차순
      const dateA = new Date((a as any).createdAt || 0).getTime()
      const dateB = new Date((b as any).createdAt || 0).getTime()
      return dateB - dateA
    } else {
      // 인기순: bookmarkCount 기준 내림차순
      return ((b as any).bookmarkCount || 0) - ((a as any).bookmarkCount || 0)
    }
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: '경매 등록 전', variant: 'neutral' as const }
      case 'SCHEDULED':
        return { label: '경매 시작 대기', variant: 'secondary' as const }
      case 'LIVE':
        return { label: '경매 진행 중', variant: 'primary' as const }
      case 'ENDED':
        return { label: '경매 마감', variant: 'success' as const }
      default:
        return {
          label: getStatusLabel(status) || '알 수 없음',
          variant: 'neutral' as const,
        }
    }
  }

  // QnA 목록 조회
  const fetchQnaList = async (productId: number) => {
    setIsQnaLoading(true)
    try {
      const response = await productApi.getQna(productId, {
        page: 0,
        size: 100,
      })
      if (response.success && response.data) {
        setQnaList(response.data.productQnAResponses || [])
      }
    } catch (error) {
      console.error('QnA 목록 조회 실패:', error)
      showErrorToast('QnA 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsQnaLoading(false)
    }
  }

  // QnA 모달 열기
  const handleOpenQnaModal = (productId: number) => {
    setSelectedProductId(productId)
    setIsQnaModalOpen(true)
    setNewAnswers({})
    fetchQnaList(productId)
  }

  // QnA 답변 등록
  const handleAddAnswer = async (qnaId: number) => {
    if (!selectedProductId) return

    const answer = newAnswers[qnaId]
    if (!answer?.trim()) {
      showErrorToast('답변을 입력해주세요.')
      return
    }

    try {
      const response = await productApi.addAnswer(
        selectedProductId,
        qnaId,
        answer,
      )
      if (response.success) {
        setNewAnswers((prev) => ({ ...prev, [qnaId]: '' }))
        fetchQnaList(selectedProductId)
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
  const handleDeleteAnswer = async (qnaId: number, answerId: number) => {
    if (!selectedProductId) return

    if (!confirm('답변을 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await productApi.deleteAnswer(
        selectedProductId,
        qnaId,
        answerId,
      )
      if (response.success) {
        fetchQnaList(selectedProductId)
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

  // 전체 상품 목록을 상태별로 표시 (필터링 없음)
  const filteredProducts = sortedProducts

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* API 에러 메시지 */}
      {apiError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                오류가 발생했습니다
              </h3>
              <div className="mt-1 text-sm text-red-700">{apiError}</div>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setApiError('')}
                className="inline-flex shrink-0 rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 상품 목록 */}
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full">
            <Card variant="outlined">
              <CardContent className="py-12 text-center">
                <div className="mb-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                    <svg
                      className="h-8 w-8 text-neutral-400"
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
                  <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                    등록한 상품이 없습니다
                  </h3>
                  <p className="mb-4 text-neutral-600">
                    새로운 상품을 등록해보세요
                  </p>
                  <Button onClick={() => router.push('/register-product')}>
                    + 첫 상품 등록하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredProducts.map((product, index) => {
            const statusBadge = getStatusBadge(product.status)
            const imageUrl = getFullImageUrl(
              (product as any).thumbnailUrl || (product as any).imageUrl,
            )

            return (
              <Card
                key={product.productId}
                variant="elevated"
                hover
                className="animate-fade-in group flex flex-col overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="flex flex-1 flex-col p-0">
                  {/* 상품 이미지 */}
                  <div className="relative aspect-square overflow-hidden bg-neutral-100">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200">
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
                    {/* 상태 배지 (이미지 위) */}
                    <div className="absolute top-3 left-3">
                      <Badge
                        variant={statusBadge.variant}
                        className="shadow-lg backdrop-blur-sm"
                      >
                        {statusBadge.label}
                      </Badge>
                    </div>
                  </div>

                  {/* 상품 정보 */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="group-hover:text-primary-600 mb-3 line-clamp-2 text-lg font-bold text-neutral-900 transition-colors">
                      {product.name}
                    </h3>

                    {/* 가격 및 통계 */}
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-neutral-200 bg-white p-3">
                        <div className="mb-1 flex items-center space-x-1 text-xs text-neutral-600">
                          {(product as any).status === 'PENDING' ||
                          (product as any).status === 'SCHEDULED' ? (
                            <>
                              <Zap className="h-3 w-3" />
                              <span>시작가</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="h-3 w-3" />
                              <span>현재가</span>
                            </>
                          )}
                        </div>
                        <div className="text-primary-600 text-lg font-bold">
                          {(product as any).status === 'PENDING' ||
                          (product as any).status === 'SCHEDULED'
                            ? formatPrice((product as any).initialPrice || 0)
                            : formatPrice((product as any).currentPrice || 0)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-neutral-50 p-3">
                        <div className="mb-1 text-xs text-neutral-600">
                          {(product as any).status === 'PENDING' ||
                          (product as any).status === 'SCHEDULED'
                            ? '찜'
                            : '입찰 수'}
                        </div>
                        <div className="text-lg font-semibold text-neutral-900">
                          {(product as any).status === 'PENDING' ||
                          (product as any).status === 'SCHEDULED'
                            ? `${(product as any).bookmarkCount || 0}개`
                            : `${(product as any).bidCount || 0}건`}
                        </div>
                      </div>
                    </div>

                    {/* 경매 종료 시간 */}
                    {(product as any).auctionEndTime && (
                      <div className="mb-4 flex items-center space-x-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                        <Clock className="h-4 w-4 text-neutral-400" />
                        <span>
                          종료: {formatDate((product as any).auctionEndTime)}
                        </span>
                      </div>
                    )}

                    {/* 액션 버튼들 */}
                    <div className="mt-auto flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
                      {/* QnA 관리 버튼 (모든 상태에서 표시) */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenQnaModal(product.productId)}
                        className="text-primary-600 hover:bg-primary-50 w-full"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        QnA 관리
                      </Button>

                      {(product as any).status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/products/${product.productId}/register-auction`,
                              )
                            }
                            className="bg-primary-500 hover:bg-primary-600 flex-1 text-white"
                          >
                            <TrendingUp className="mr-2 h-4 w-4" />
                            경매 등록
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              router.push(`/products/${product.productId}/edit`)
                            }
                            className="flex-1 text-neutral-600 hover:bg-neutral-100"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            수정
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleDeleteProduct(product.productId)
                            }
                            disabled={isLoading}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {(product as any).status === 'SCHEDULED' && (
                        <div className="w-full rounded-lg bg-blue-50 px-4 py-3 text-center text-sm text-blue-700">
                          <Clock className="mx-auto mb-1 h-5 w-5" />
                          경매 시작을 기다리는 중입니다
                        </div>
                      )}
                      {(product as any).status === 'LIVE' && (
                        <div className="w-full rounded-lg bg-green-50 px-4 py-3 text-center text-sm text-green-700">
                          <Zap className="mx-auto mb-1 h-5 w-5 animate-pulse" />
                          경매가 진행 중입니다
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
      {/* QnA 관리 모달 */}
      <Dialog open={isQnaModalOpen} onOpenChange={setIsQnaModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden bg-white p-0">
          <div className="flex h-full flex-col">
            {/* 헤더 - 개선된 스타일 */}
            <div className="shrink-0 border-b border-neutral-200 bg-white px-6 py-5">
              <DialogHeader className="space-y-2">
                <DialogTitle className="flex items-center space-x-3 text-2xl font-bold text-neutral-900">
                  <div className="bg-primary-600 flex h-10 w-10 items-center justify-center rounded-lg shadow-lg">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <span>Q&A 관리</span>
                </DialogTitle>
                <DialogDescription className="flex items-center space-x-2 text-sm text-neutral-600">
                  <span>
                    상품에 대한 고객 문의를 확인하고 답변을 작성하세요
                  </span>
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* 콘텐츠 영역 (스크롤 가능) */}
            <div className="flex-1 overflow-y-auto">
              {isQnaLoading ? (
                <div className="flex min-h-[400px] items-center justify-center">
                  <div className="space-y-4 text-center">
                    <div className="flex justify-center">
                      <div className="border-t-primary-500 relative h-12 w-12 animate-spin rounded-full border-4 border-neutral-200"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-700">
                        Q&A 목록을 불러오는 중...
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        잠시만 기다려주세요
                      </p>
                    </div>
                  </div>
                </div>
              ) : qnaList.length === 0 ? (
                <div className="flex min-h-[400px] items-center justify-center">
                  <div className="space-y-4 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100">
                      <MessageSquare className="h-10 w-10 text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-neutral-900">
                        아직 문의가 없습니다
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        고객으로부터의 첫 질문을 기다리는 중입니다
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-600">
                      총 {qnaList.length}개의 문의
                    </span>
                  </div>
                  {qnaList.map((qna: any, index: number) => {
                    const qnaData = qna.productQnaCreateResponse || qna
                    const answers = qna.answers || []

                    return (
                      <div
                        key={qnaData.qnaId}
                        className="group hover:border-primary-300 animate-fade-in overflow-hidden rounded-xl border border-neutral-200 transition-all duration-300 hover:shadow-lg"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* 질문 영역 */}
                        <div className="border-b border-neutral-100 bg-white p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-1 items-start gap-3">
                              <div className="bg-primary-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-md">
                                Q
                              </div>
                              <div className="flex-1 pt-0.5">
                                <p className="text-base leading-relaxed font-semibold text-neutral-900">
                                  {qnaData.question}
                                </p>
                                <div className="mt-2 flex items-center space-x-2 text-xs text-neutral-500">
                                  <Clock className="h-3 w-3" />
                                  <time>
                                    {qnaData.questionedAt
                                      ? new Date(
                                          qnaData.questionedAt,
                                        ).toLocaleDateString('ko-KR', {
                                          year: 'numeric',
                                          month: '2-digit',
                                          day: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : ''}
                                  </time>
                                </div>
                              </div>
                            </div>
                            {answers.length > 0 && (
                              <div className="flex shrink-0 items-center space-x-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                                <span>✓</span>
                                <span>답변 {answers.length}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 답변 목록 */}
                        {answers.length > 0 && (
                          <div className="space-y-3 border-b border-neutral-100 bg-neutral-50/50 px-5 py-4">
                            {answers.map((answer: any, answerIndex: number) => (
                              <div
                                key={answer.answerId}
                                className="group/answer hover:border-primary-300 relative rounded-lg border border-neutral-200 bg-white p-4 transition-all duration-300"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex flex-1 items-start gap-3">
                                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                                      A
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm leading-relaxed text-neutral-800">
                                        {answer.answer}
                                      </p>
                                      <div className="mt-2 flex items-center space-x-2 text-xs text-neutral-500">
                                        <Clock className="h-3 w-3" />
                                        <time>
                                          {answer.answeredAt
                                            ? new Date(
                                                answer.answeredAt,
                                              ).toLocaleDateString('ko-KR', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                              })
                                            : ''}
                                        </time>
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDeleteAnswer(
                                        qnaData.qnaId,
                                        answer.answerId,
                                      )
                                    }
                                    className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover/answer:opacity-100 hover:bg-red-100 hover:text-red-600"
                                    title="답변 삭제"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 답변 작성 섹션 */}
                        <div className="bg-white p-5">
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Send className="text-primary-600 h-4 w-4" />
                              <span className="text-sm font-semibold text-neutral-900">
                                답변 작성
                              </span>
                            </div>
                            <textarea
                              placeholder="고객의 문의에 대해 답변해주세요..."
                              value={newAnswers[qnaData.qnaId] || ''}
                              onChange={(e) =>
                                setNewAnswers((prev) => ({
                                  ...prev,
                                  [qnaData.qnaId]: e.target.value,
                                }))
                              }
                              rows={2}
                              className="focus:border-primary-500 focus:ring-primary-100 w-full resize-none rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:ring-2 focus:outline-none"
                            />
                            <Button
                              onClick={() => handleAddAnswer(qnaData.qnaId)}
                              disabled={!newAnswers[qnaData.qnaId]?.trim()}
                              size="sm"
                              className="bg-primary-500 hover:bg-primary-600 w-full text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              답변 등록
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
