'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { paymentApi } from '@/lib/api'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
import { CreditCard, Plus, Trash2, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Card {
  id: number
  cardCompany:
    | 'KB'
    | 'SHINHAN'
    | 'HYUNDAI'
    | 'SAMSUNG'
    | 'LOTTE'
    | 'NH'
    | 'HANA'
    | 'BC'
    | 'WOORI'
  cardNumberMasked: string
  cardName: string
}

interface PaymentMethodClientProps {
  isEmbedded?: boolean
}

export function PaymentMethodClient({
  isEmbedded = false,
}: PaymentMethodClientProps) {
  const [cards, setCards] = useState<Card[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCards()
  }, [])

  const loadCards = async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await paymentApi.getCards()

      if (response.success && response.data) {
        setCards(Array.isArray(response.data) ? response.data : [])
      } else {
        setError(response.msg || '카드 목록을 불러오는데 실패했습니다.')
      }
    } catch (err: any) {
      console.error('카드 목록 로드 에러:', err)
      setError(
        err.response?.data?.message || '카드 목록을 불러오는데 실패했습니다.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말로 이 카드를 삭제하시겠습니까?')) return

    try {
      const response = await paymentApi.deleteCard(id)

      if (response.success) {
        showSuccessToast('카드가 삭제되었습니다.')
        loadCards()
      } else {
        showErrorToast(response.msg || '카드 삭제에 실패했습니다.')
      }
    } catch (err: any) {
      showErrorToast('카드 삭제 중 오류가 발생했습니다.')
    }
  }

  const getCardCompanyName = (company: string) => {
    const names: Record<string, string> = {
      KB: 'KB국민카드',
      SHINHAN: '신한카드',
      HYUNDAI: '현대카드',
      SAMSUNG: '삼성카드',
      LOTTE: '롯데카드',
      NH: 'NH농협카드',
      HANA: '하나카드',
      BC: 'BC카드',
      WOORI: '우리카드',
    }
    return names[company] || company
  }

  const handleAddCard = () => {
    alert(
      '카드 등록은 토스 결제창을 통해서만 가능합니다.\n낙찰 후 결제 시 자동으로 등록됩니다.',
    )
  }

  return (
    <div
      className={
        isEmbedded ? '' : 'mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8'
      }
    >
      {!isEmbedded && (
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">결제 수단</h1>
          <Button
            onClick={handleAddCard}
            className="bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            추가 안내
          </Button>
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600"></div>
            <h3 className="text-sm font-semibold text-neutral-900">
              로드 중...
            </h3>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-sm text-neutral-600">{error}</p>
            <Button
              onClick={loadCards}
              className="bg-primary-600 hover:bg-primary-700"
            >
              다시 시도
            </Button>
          </CardContent>
        </Card>
      ) : cards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-neutral-100 p-4">
                <CreditCard className="h-8 w-8 text-neutral-400" />
              </div>
            </div>
            <h3 className="mb-2 text-base font-semibold text-neutral-900">
              등록된 결제 수단이 없습니다
            </h3>
            <p className="text-sm text-neutral-600">
              낙찰 후 결제 진행 시 새 카드를 등록할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <Card key={card.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 shrink-0">
                      <CreditCard className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-neutral-900 truncate">
                        {card.cardName}
                      </h4>
                      <p className="text-xs text-neutral-600 mt-1">
                        {getCardCompanyName(card.cardCompany)} · {card.cardNumberMasked}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(card.id)}
                    className="ml-2 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 안내 섹션 */}
      <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-neutral-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">
              결제 수단 등록 안내
            </h4>
            <ul className="space-y-1 text-xs text-neutral-700">
              <li className="flex gap-2">
                <span className="shrink-0">•</span>
                <span>결제 수단은 Toss 결제 시스템을 통해 안전하게 등록됩니다</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0">•</span>
                <span>낙찰 후 결제 진행 시 새로운 카드를 등록할 수 있습니다</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0">•</span>
                <span>모든 카드 정보는 암호화되어 안전하게 보관됩니다</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
