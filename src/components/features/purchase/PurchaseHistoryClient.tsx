'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, Eye, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Payment {
  paymentId: number
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED'
  amount: number
  provider: string
  methodType: 'CARD' | 'BANK'
  createdAt: string
  cashTransactionId?: number
  balanceAfter?: number
}

interface PurchaseHistoryClientProps {
  purchases?: Payment[]
}

export function PurchaseHistoryClient({
  purchases = [],
}: PurchaseHistoryClientProps) {
  const router = useRouter()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return { label: '성공', variant: 'success' as const }
      case 'FAILED':
        return { label: '실패', variant: 'error' as const }
      case 'PENDING':
        return { label: '대기중', variant: 'warning' as const }
      case 'CANCELLED':
        return { label: '취소됨', variant: 'error' as const }
      default:
        return { label: '알 수 없음', variant: 'neutral' as const }
    }
  }

  const stats = {
    total: purchases.length,
    success: purchases.filter((p) => p.status === 'SUCCESS').length,
    failed: purchases.filter((p) => p.status === 'FAILED').length,
    pending: purchases.filter((p) => p.status === 'PENDING').length,
    cancelled: purchases.filter((p) => p.status === 'CANCELLED').length,
    totalAmount: purchases
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + (p.amount || 0), 0),
  }

  const statusTabs = [
    { id: 'all', label: '전체', count: stats.total },
    { id: 'success', label: '성공', count: stats.success },
    { id: 'failed', label: '실패', count: stats.failed },
    { id: 'pending', label: '대기중', count: stats.pending },
    { id: 'cancelled', label: '취소됨', count: stats.cancelled },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 구매 현황 요약 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card variant="outlined">
          <CardContent className="p-4 text-center">
            <div className="text-primary-500 text-2xl font-bold">
              {stats.total}
            </div>
            <div className="text-sm text-neutral-600">전체 구매</div>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent className="p-4 text-center">
            <div className="text-success-500 text-2xl font-bold">
              {stats.success}
            </div>
            <div className="text-sm text-neutral-600">성공</div>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent className="p-4 text-center">
            <div className="text-error-500 text-2xl font-bold">
              {stats.failed}
            </div>
            <div className="text-sm text-neutral-600">실패</div>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent className="p-4 text-center">
            <div className="text-warning-500 text-2xl font-bold">
              {stats.pending}
            </div>
            <div className="text-sm text-neutral-600">대기중</div>
          </CardContent>
        </Card>
      </div>

      {/* 구매 내역 목록 */}
      <div className="space-y-4">
        {purchases.length === 0 ? (
          <Card variant="outlined">
            <CardContent className="py-12 text-center">
              <div className="mb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                  <span className="text-2xl">🛒</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                  구매 내역이 없습니다
                </h3>
                <p className="text-neutral-600">아직 구매한 상품이 없습니다.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          purchases.map((purchase: Payment) => {
            const statusBadge = getStatusBadge(purchase.status)

            return (
              <Card key={purchase.paymentId} variant="outlined">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* 결제 아이콘 */}
                    <div className="flex-shrink-0">
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-neutral-200">
                        <span className="text-2xl">
                          {purchase.methodType === 'CARD' ? '💳' : '🏦'}
                        </span>
                      </div>
                    </div>

                    {/* 결제 정보 */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center space-x-2">
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                        <Badge variant="neutral">{purchase.methodType}</Badge>
                      </div>

                      <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                        결제 ID: {purchase.paymentId}
                      </h3>

                      <div className="mb-3 space-y-1 text-sm text-neutral-600">
                        <div className="flex items-center justify-between">
                          <span>결제 금액:</span>
                          <span className="text-primary-600 font-semibold">
                            {formatPrice(purchase.amount || 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>결제 수단:</span>
                          <span>{purchase.provider}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>결제일:</span>
                          <span>{formatDate(purchase.createdAt)}</span>
                        </div>
                        {purchase.balanceAfter && (
                          <div className="flex items-center justify-between">
                            <span>잔액:</span>
                            <span>{formatPrice(purchase.balanceAfter)}</span>
                          </div>
                        )}
                      </div>

                      {/* 액션 버튼들 */}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="mr-1 h-3 w-3" />
                          상세보기
                        </Button>
                        {purchase.status === 'SUCCESS' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                router.push(
                                  `/review?productId=${purchase.paymentId}`,
                                )
                              }
                            >
                              <MessageSquare className="mr-1 h-3 w-3" />
                              리뷰 작성
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="mr-1 h-3 w-3" />
                              영수증
                            </Button>
                          </>
                        )}
                        {purchase.status === 'PENDING' && (
                          <Button size="sm" variant="outline">
                            결제 완료 처리
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
