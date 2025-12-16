'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ErrorAlert } from '@/components/ui/error-alert'
import { reviewApi } from '@/lib/api'
import { Edit3, MessageSquare, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Review {
  id: number
  reviewerId: number
  reviewerName: string
  productId: number
  productName: string
  comment: string
  isSatisfied: boolean
  createDate: string
  modifyDate: string
}

export function ReviewManagementClient() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editFormData, setEditFormData] = useState({
    comment: '',
    isSatisfied: true,
  })
  const [isEditing, setIsEditing] = useState(false)

  // 리뷰 목록 로드
  useEffect(() => {
    const loadReviews = async () => {
      try {
        setIsLoading(true)
        setError('')

        // 현재는 사용자별 리뷰 조회 API가 없으므로
        // 임시로 더미 데이터를 사용하되, 실제 API 구조에 맞게 수정
        console.log('📝 내 리뷰 목록 로드 중...')

        // TODO: 실제 사용자별 리뷰 조회 API가 구현되면 교체
        // const response = await reviewApi.getMyReviews()

        // 임시 더미 데이터 (실제 API 응답 구조에 맞게)
        const dummyReviews = [
          {
            id: 1,
            reviewerId: 1,
            reviewerName: '홍길동',
            productId: 1,
            productName: '아이폰 15 Pro 256GB',
            comment: '상품 상태가 정말 좋았습니다. 빠른 배송도 만족스러웠어요!',
            isSatisfied: true,
            createDate: '2024-01-15T10:30:00Z',
            modifyDate: '2024-01-15T10:30:00Z',
          },
          {
            id: 2,
            reviewerId: 1,
            reviewerName: '홍길동',
            productId: 2,
            productName: '갤럭시 S24 Ultra 512GB',
            comment:
              '거래 과정에서 약간의 지연이 있었지만 결과적으로는 만족합니다.',
            isSatisfied: true,
            createDate: '2024-01-10T14:20:00Z',
            modifyDate: '2024-01-10T14:20:00Z',
          },
        ]
        setReviews(dummyReviews)
      } catch (err) {
        console.error('리뷰 로드 에러:', err)
        setError('리뷰를 불러오는데 실패했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    loadReviews()
  }, [])

  // 리뷰 삭제
  const handleDelete = async (reviewId: number) => {
    if (!confirm('정말로 이 리뷰를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await reviewApi.deleteReview(reviewId)
      if (response.success) {
        alert('리뷰가 성공적으로 삭제되었습니다.')
        // 리뷰 목록에서 제거
        setReviews((prev) => prev.filter((review) => review.id !== reviewId))
      } else {
        alert(response.msg || '리뷰 삭제에 실패했습니다.')
      }
    } catch (err: any) {
      console.error('리뷰 삭제 에러:', err)
      alert(err.response?.data?.msg || '리뷰 삭제에 실패했습니다.')
    }
  }

  // 리뷰 수정
  const handleEdit = (review: Review) => {
    setSelectedReview(review)
    setEditFormData({
      comment: review.comment,
      isSatisfied: review.isSatisfied,
    })
    setShowEditForm(true)
  }

  // 리뷰 수정 저장
  const handleSaveEdit = async () => {
    if (!selectedReview) return

    setIsEditing(true)
    try {
      const response = await reviewApi.updateReview(selectedReview.id, {
        comment: editFormData.comment,
        isSatisfied: editFormData.isSatisfied,
      })

      if (response.success) {
        alert('리뷰가 성공적으로 수정되었습니다.')
        setShowEditForm(false)
        setSelectedReview(null)
        // 리뷰 목록 새로고침
        // TODO: 실제 API로 교체 시 새로고침 로직 추가
      } else {
        alert(response.msg || '리뷰 수정에 실패했습니다.')
      }
    } catch (err: any) {
      console.error('리뷰 수정 에러:', err)
      alert(err.response?.data?.msg || '리뷰 수정에 실패했습니다.')
    }
    setIsEditing(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6">
          <ErrorAlert
            title="리뷰 로드 실패"
            message={error}
            onClose={() => setError('')}
          />
        </div>
      )}

      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">내 리뷰 관리</h1>
        <p className="mt-2 text-neutral-600">
          작성한 리뷰를 확인하고 수정하거나 삭제할 수 있습니다.
        </p>
      </div>

      {/* 리뷰 목록 */}
      <div className="space-y-4">
        {isLoading ? (
          <Card variant="outlined">
            <CardContent className="py-12 text-center">
              <div className="border-primary-200 border-t-primary-600 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4"></div>
              <h3 className="text-lg font-semibold text-neutral-900">
                리뷰를 불러오는 중...
              </h3>
            </CardContent>
          </Card>
        ) : reviews.length === 0 ? (
          <Card variant="outlined">
            <CardContent className="py-12 text-center">
              <div className="mb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                  <MessageSquare className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                  작성한 리뷰가 없습니다
                </h3>
                <p className="text-neutral-600">아직 작성한 리뷰가 없습니다.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.productId} variant="outlined">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                        <MessageSquare className="h-6 w-6 text-neutral-600" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center space-x-2">
                        <Badge
                          variant={review.isSatisfied ? 'success' : 'error'}
                        >
                          {review.isSatisfied ? (
                            <div className="flex items-center">
                              <Star className="mr-1 h-3 w-3 fill-current" />
                              만족
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Star className="mr-1 h-3 w-3" />
                              불만족
                            </div>
                          )}
                        </Badge>
                      </div>

                      <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                        {review.productName}
                      </h3>

                      <div className="mb-3 space-y-1 text-sm text-neutral-600">
                        <div className="flex items-center justify-between">
                          <span>리뷰어:</span>
                          <span>{review.reviewerName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>상품 ID:</span>
                          <span>#{review.productId}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>작성일:</span>
                          <span>{formatDate(review.createDate)}</span>
                        </div>
                        {review.modifyDate !== review.createDate && (
                          <div className="flex items-center justify-between">
                            <span>수정일:</span>
                            <span>{formatDate(review.modifyDate)}</span>
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg bg-neutral-50 p-3">
                        <p className="text-sm text-neutral-700">
                          {review.comment}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(review)}
                    >
                      <Edit3 className="mr-1 h-3 w-3" />
                      수정
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(review.id)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      삭제
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 리뷰 수정 폼 */}
      {showEditForm && selectedReview && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <h3 className="text-lg font-semibold">리뷰 수정</h3>
              <p className="text-sm text-neutral-600">
                {selectedReview.productName}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 만족도 선택 */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    만족도
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isSatisfied"
                        checked={editFormData.isSatisfied === true}
                        onChange={() =>
                          setEditFormData((prev) => ({
                            ...prev,
                            isSatisfied: true,
                          }))
                        }
                        className="text-primary-600 focus:ring-primary-500 mr-2"
                      />
                      <span className="flex items-center text-sm">
                        <Star className="mr-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                        만족
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isSatisfied"
                        checked={editFormData.isSatisfied === false}
                        onChange={() =>
                          setEditFormData((prev) => ({
                            ...prev,
                            isSatisfied: false,
                          }))
                        }
                        className="text-primary-600 focus:ring-primary-500 mr-2"
                      />
                      <span className="flex items-center text-sm">
                        <Star className="mr-1 h-4 w-4 text-neutral-400" />
                        불만족
                      </span>
                    </label>
                  </div>
                </div>

                {/* 리뷰 내용 */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    리뷰 내용
                  </label>
                  <textarea
                    value={editFormData.comment}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        comment: e.target.value,
                      }))
                    }
                    placeholder="리뷰 내용을 입력해주세요"
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:outline-none"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditForm(false)
                      setSelectedReview(null)
                    }}
                    disabled={isEditing}
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={isEditing || !editFormData.comment.trim()}
                  >
                    {isEditing ? (
                      <div className="flex items-center">
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        수정 중...
                      </div>
                    ) : (
                      '수정'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
