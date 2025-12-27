'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { productApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from '@/lib/utils/toast'
import { Heart, HeartIcon, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ProductDetailBasicProps {
  product: {
    productId: number
    sellerId?: number
    name: string
    description: string
    images?: string[]
    category?: string
    subCategory?: string
    createdAt?: string
    updatedAt?: string
    bookmarkCount?: number
  }
}

export function ProductDetailBasicClient({ product }: ProductDetailBasicProps) {
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false)
  const [qnaList, setQnaList] = useState<any[]>([])
  const [isQnaLoading, setIsQnaLoading] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')

  useEffect(() => {
    // QnA 목록 로드
    const loadQna = async () => {
      try {
        setIsQnaLoading(true)
        const response = await productApi.getQna(product.productId, {
          page: 0,
          size: 50,
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
    loadQna()
  }, [product.productId])

  const handleBookmarkToggle = async () => {
    if (!isLoggedIn) {
      showInfoToast('로그인이 필요합니다.')
      router.push('/login')
      return
    }
    setIsBookmarkLoading(true)
    try {
      if (isBookmarked) {
        await productApi.deleteBookmark(product.productId)
        setIsBookmarked(false)
        showSuccessToast('찜 목록에서 제거되었습니다.')
      } else {
        await productApi.addBookmark(product.productId)
        setIsBookmarked(true)
        showSuccessToast('찜 목록에 추가되었습니다.')
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
    } finally {
      setIsBookmarkLoading(false)
    }
  }

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
      const response = await productApi.addQna(product.productId, newQuestion)
      if (response.success) {
        setNewQuestion('')
        // 새로고침
        const res = await productApi.getQna(product.productId, {
          page: 0,
          size: 50,
        })
        if (res.success && res.data) {
          setQnaList(res.data.productQnAResponses || [])
        }
        showSuccessToast('질문이 등록되었습니다.')
      } else {
        showErrorToast(
          response.message || response.msg || '질문 등록에 실패했습니다.',
        )
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 이미지 섹션 */}
        <div className="space-y-4">
          <div className="aspect-square rounded-lg bg-neutral-200">
            {product.images && product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center rounded-lg bg-neutral-100">
                <div className="mb-2 rounded-full bg-neutral-300 p-3" />
                <p className="text-sm text-neutral-500">이미지 준비중</p>
              </div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(1, 5).map((imageUrl, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-lg bg-neutral-200"
                >
                  <img
                    src={imageUrl}
                    alt={`${product.name} ${index + 2}`}
                    className="h-full w-full rounded-lg object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 정보 섹션 */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {product.category && (
                  <Badge variant="primary" className="px-3 py-1.5 text-base">
                    {product.category}
                  </Badge>
                )}
                {product.subCategory && (
                  <Badge variant="secondary" className="px-2 py-1 text-xs">
                    {product.subCategory}
                  </Badge>
                )}
                {typeof product.bookmarkCount === 'number' && (
                  <Badge className="px-2 py-1 text-xs">
                    <HeartIcon className="mr-1 inline-block h-4 w-4 text-red-500" />
                    {product.bookmarkCount}
                  </Badge>
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
                      className={`h-5 w-5 ${isBookmarked ? 'fill-red-500 text-red-500' : 'text-neutral-400'}`}
                    />
                  </Button>
                )}
              </div>
            </div>

            <h1 className="text-3xl leading-tight font-bold text-neutral-900">
              {product.name}
            </h1>

            {/* 메타 정보 */}
            <div className="text-sm text-neutral-600">
              {product.createdAt && (
                <span className="mr-3">
                  등록일:{' '}
                  {new Date(product.createdAt).toLocaleDateString('ko-KR')}
                </span>
              )}
              {product.updatedAt && (
                <span>
                  수정일:{' '}
                  {new Date(product.updatedAt).toLocaleDateString('ko-KR')}
                </span>
              )}
            </div>
          </div>

          {/* 상품 설명 */}
          <Card variant="outlined">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center space-x-2">
                <h3 className="text-lg font-bold text-neutral-900">
                  상품 설명
                </h3>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
                <p className="text-base leading-relaxed whitespace-pre-wrap text-neutral-700">
                  {product.description || '상품 설명이 없습니다.'}
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
              {qnaList.map((qna: any) => {
                const qnaData = qna.productQnaCreateResponse || qna
                const answers = qna.answers || []
                return (
                  <div
                    key={qnaData.qnaId}
                    className="rounded-lg border border-neutral-200 bg-white"
                  >
                    <div className="p-4">
                      <p className="text-base font-semibold text-neutral-900">
                        {qnaData.question}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {qnaData.questionedAt
                          ? new Date(qnaData.questionedAt).toLocaleDateString(
                              'ko-KR',
                            )
                          : ''}
                      </p>
                    </div>
                    {answers.length > 0 && (
                      <div className="space-y-2 border-t border-neutral-200 bg-neutral-50 p-4">
                        {answers.map((answer: any) => (
                          <div
                            key={answer.answerId}
                            className="rounded-lg border border-neutral-200 bg-white p-3"
                          >
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
