'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { paymentApi } from '@/lib/api'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast'
import { CreditCard, Plus, Trash2 } from 'lucide-react'
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
        isEmbedded ? '' : 'mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8'
      }
    >
      {!isEmbedded && (
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">등록된 카드</h1>
          <Button onClick={handleAddCard}>
            <Plus className="mr-2 h-4 w-4" />
            카드 추가 안내
          </Button>
        </div>
      )}

      {isLoading ? (
        <Card variant="outlined">
          <CardContent className="py-16 text-center">
            <div className="border-primary-200 border-t-primary-600 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4"></div>
            <h3 className="text-lg font-semibold text-neutral-900">
              카드 목록을 불러오는 중...
            </h3>
          </CardContent>
        </Card>
      ) : error ? (
        <Card variant="outlined">
          <CardContent className="py-16 text-center">
            <p className="text-red-600">{error}</p>
            <Button onClick={loadCards} variant="outline" className="mt-4">
              다시 시도
            </Button>
          </CardContent>
        </Card>
      ) : cards.length === 0 ? (
        <Card variant="outlined">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
              <CreditCard className="h-8 w-8 text-neutral-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-900">
              등록된 카드가 없습니다
            </h3>
            <p className="mb-4 text-neutral-600">
              경매 낙찰 후 결제 시 토스 결제창을 통해 카드를 등록할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <Card key={card.id} variant="outlined">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {card.cardName}
                    </h3>
                    <p className="text-sm text-neutral-600">
                      {getCardCompanyName(card.cardCompany)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(card.id)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  삭제
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-600">
                  카드번호: {card.cardNumberMasked}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 안내 메시지 */}
      <Card variant="outlined" className="mt-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <h4 className="mb-2 text-sm font-semibold text-blue-900">
            💡 카드 등록 안내
          </h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• 카드는 토스 결제창을 통해서만 안전하게 등록됩니다.</li>
            <li>• 경매 낙찰 후 결제 시 자동으로 카드 등록이 가능합니다.</li>
            <li>• 등록된 카드는 다음 결제 시 자동결제에 사용됩니다.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
