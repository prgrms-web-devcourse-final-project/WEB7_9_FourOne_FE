'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorAlert } from '@/components/ui/error-alert'
import { useAuth } from '@/contexts/AuthContext'
import { reviewApi } from '@/lib/api'
import { Review } from '@/types'
import { Edit, MessageSquare, Star, Trash2, User } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ReviewSectionProps {
  productId: number
}

interface ReviewFormData {
  comment: string
  isSatisfied: boolean
}

export function ReviewSection({ productId }: ReviewSectionProps) {
  const { isLoggedIn, user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null)
  const [formData, setFormData] = useState<ReviewFormData>({
    comment: '',
    isSatisfied: true,
  })

  // 리뷰 목록 로드
  const loadReviews = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await reviewApi.getReviewsByProduct(productId)

      if (response.success && response.data) {
        setReviews(response.data)
      } else {
        setError('리뷰를 불러오는데 실패했습니다.')
      }
    } catch (err) {
      console.error('리뷰 로드 에러:', err)
      setError('리뷰를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 리뷰 작성
  const handleCreateReview = async () => {
    if (!formData.comment.trim()) {
      setError('리뷰 내용을 입력해주세요.')
      return
    }

    try {
      setError('')
      const response = await reviewApi.createReview({
        productId,
        comment: formData.comment,
        isSatisfied: formData.isSatisfied,
      })

      if (response.success) {
        setFormData({ comment: '', isSatisfied: true })
        setShowReviewForm(false)
        await loadReviews()
      } else {
        setError(response.msg || '리뷰 작성에 실패했습니다.')
      }
    } catch (err) {
      console.error('리뷰 작성 에러:', err)
      setError('리뷰 작성에 실패했습니다.')
    }
  }

  // 리뷰 수정
  const handleUpdateReview = async () => {
    if (!editingReviewId || !formData.comment.trim()) {
      setError('리뷰 내용을 입력해주세요.')
      return
    }

    try {
      setError('')
      const response = await reviewApi.updateReview(editingReviewId, {
        productId: productId,
        comment: formData.comment,
        isSatisfied: formData.isSatisfied,
      })

      if (response.success) {
        setFormData({ comment: '', isSatisfied: true })
        setEditingReviewId(null)
        await loadReviews()
      } else {
        setError(response.msg || '리뷰 수정에 실패했습니다.')
      }
    } catch (err) {
      console.error('리뷰 수정 에러:', err)
      setError('리뷰 수정에 실패했습니다.')
    }
  }

  // 리뷰 삭제
  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('정말로 이 리뷰를 삭제하시겠습니까?')) {
      return
    }

    try {
      setError('')
      const response = await reviewApi.deleteReview(reviewId)

      if (response.success) {
        await loadReviews()
      } else {
        setError(response.msg || '리뷰 삭제에 실패했습니다.')
      }
    } catch (err) {
      console.error('리뷰 삭제 에러:', err)
      setError('리뷰 삭제에 실패했습니다.')
    }
  }

  // 수정 모드 시작
  const startEdit = (review: Review) => {
    setEditingReviewId(review.reviewId)
    setFormData({
      comment: review.comment,
      isSatisfied: review.isSatisfied,
    })
    setShowReviewForm(true)
  }

  // 수정 취소
  const cancelEdit = () => {
    setEditingReviewId(null)
    setFormData({ comment: '', isSatisfied: true })
    setShowReviewForm(false)
  }

  // 컴포넌트 마운트 시 리뷰 로드
  useEffect(() => {
    loadReviews()
  }, [productId])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          상품 리뷰 ({reviews.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 에러 메시지 */}
        {error && <ErrorAlert message={error} />}

        {/* 리뷰 작성 버튼 */}
        {isLoggedIn && !showReviewForm && (
          <Button
            onClick={() => setShowReviewForm(true)}
            className="w-full sm:w-auto"
          >
            리뷰 작성하기
          </Button>
        )}

        {/* 리뷰 작성/수정 폼 */}
        {showReviewForm && (
          <Card variant="outlined">
            <CardContent className="p-4">
              <h4 className="mb-4 font-semibold">
                {editingReviewId ? '리뷰 수정' : '리뷰 작성'}
              </h4>

              <div className="space-y-4">
                {/* 만족도 선택 */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    만족도
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="satisfaction"
                        checked={formData.isSatisfied}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            isSatisfied: true,
                          }))
                        }
                        className="mr-2"
                      />
                      <span className="flex items-center gap-1 text-green-600">
                        <Star className="h-4 w-4 fill-current" />
                        만족
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="satisfaction"
                        checked={!formData.isSatisfied}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            isSatisfied: false,
                          }))
                        }
                        className="mr-2"
                      />
                      <span className="flex items-center gap-1 text-red-600">
                        <Star className="h-4 w-4" />
                        불만족
                      </span>
                    </label>
                  </div>
                </div>

                {/* 리뷰 내용 */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    리뷰 내용
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        comment: e.target.value,
                      }))
                    }
                    placeholder="상품에 대한 솔직한 리뷰를 작성해주세요..."
                    className="focus:border-primary-500 w-full rounded-md border border-neutral-300 p-3 focus:outline-none"
                    rows={4}
                  />
                </div>

                {/* 버튼들 */}
                <div className="flex gap-2">
                  <Button
                    onClick={
                      editingReviewId ? handleUpdateReview : handleCreateReview
                    }
                    disabled={!formData.comment.trim()}
                  >
                    {editingReviewId ? '수정하기' : '작성하기'}
                  </Button>
                  <Button variant="outline" onClick={cancelEdit}>
                    취소
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 리뷰 목록 */}
        {isLoading ? (
          <div className="py-8 text-center">
            <div className="border-primary-200 border-t-primary-600 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4"></div>
            <p className="text-neutral-600">리뷰를 불러오는 중...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-neutral-400" />
            <p className="text-neutral-600">아직 작성된 리뷰가 없습니다.</p>
            <p className="text-sm text-neutral-500">
              첫 번째 리뷰를 작성해보세요!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.reviewId} variant="outlined">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* 리뷰 헤더 */}
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-neutral-500" />
                          <span className="font-medium">
                            {review.reviewerNickname}
                          </span>
                        </div>
                        <Badge
                          variant={
                            review.isSatisfied ? 'default' : 'destructive'
                          }
                          className={
                            review.isSatisfied
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {review.isSatisfied ? (
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-current" />
                              만족
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              불만족
                            </span>
                          )}
                        </Badge>
                        <span className="text-sm text-neutral-500">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>

                      {/* 리뷰 내용 */}
                      <p className="text-neutral-700">{review.comment}</p>
                    </div>

                    {/* 수정/삭제 버튼 (본인 리뷰만) */}
                    {isLoggedIn &&
                      user?.nickname === review.reviewerNickname && (
                        <div className="ml-4 flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(review)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReview(review.reviewId)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
