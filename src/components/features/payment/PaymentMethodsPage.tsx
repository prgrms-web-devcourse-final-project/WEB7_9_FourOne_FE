'use client'

/**
 * 결제 수단(카드) 관리 UI - Toss SDK 통합
 *
 * 기능:
 * - 저장된 카드 목록 표시 (CardResponse)
 * - Toss SDK를 통한 카드 등록 (billingKey 발급)
 * - 카드 삭제
 */

import { useState, useEffect } from 'react'
import { usePaymentMethods } from '@/hooks/usePaymentMethods'
import { CardResponse, CardCompany, issueBillingKey } from '@/lib/api/payment'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Trash2, CreditCard } from 'lucide-react'

interface TossPaymentsInstance {
  requestBillingAuth: (method: string, options: any) => Promise<void>
}

type TossPaymentsConstructor = (
  clientKey: string,
) => Promise<TossPaymentsInstance>

const CARD_COMPANY_NAMES: Record<CardCompany, string> = {
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

export interface PaymentMethodsPageProps {
  onSelectMethod?: (method: CardResponse) => void
}

export function PaymentMethodsPage({
  onSelectMethod,
}: PaymentMethodsPageProps) {
  const { methods, loading, error, addMethod, removeMethod, refreshMethods } =
    usePaymentMethods()
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [cardName, setCardName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [tossLoading, setTossLoading] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)

  // Toss SDK 로드
  useEffect(() => {
    if (typeof window === 'undefined') return

    const script = document.createElement('script')
    script.src = 'https://js.tosspayments.com/v1/payment-widget'
    script.async = true

    script.onload = () => {
      // SDK 로드 완료 후 짧은 딜레이를 주어 초기화 대기
      setTimeout(() => {
        setSdkReady(true)
      }, 100)
    }

    script.onerror = () => {
      console.error('Failed to load Toss SDK')
      setSdkReady(false)
    }

    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  // URL 콜백 처리 (Toss에서 리다이렉트)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const errorCode = params.get('code')
    const errorMessage = params.get('message')
    const authKey = params.get('authKey')
    const customerKey = params.get('customerKey')
    const cardCompany = params.get('cardCompany') as CardCompany | null
    const cardNumber = params.get('cardNumber')

    // 저장해둔 카드 별명 복원 (사용자가 입력한 값 유지)
    const savedCardName = sessionStorage.getItem('pendingCardName')

    // 에러 응답 처리
    if (success === 'false') {
      const decodedMessage = errorMessage
        ? decodeURIComponent(errorMessage)
        : '카드 등록에 실패했습니다.'
      setFormError(`[${errorCode || 'ERROR'}] ${decodedMessage}`)
      setIsAddingCard(true) // 모달을 다시 열어서 에러를 보여줌
      // URL 파라미터 제거
      window.history.replaceState({}, '', '/payment-methods')
      return
    }

    // 성공 응답 처리
    if (success === 'true' && authKey && customerKey) {
      handleTossCallback(
        authKey,
        customerKey,
        cardCompany,
        cardNumber,
        savedCardName,
      )
    }
  }, [])

  const handleTossCallback = async (
    authKey: string,
    customerKey: string,
    cardCompanyParam?: CardCompany | null,
    cardNumberParam?: string | null,
    savedCardName?: string | null,
  ) => {
    try {
      setTossLoading(true)
      setFormError(null)

      console.log('🔑 Toss 콜백 처리:', {
        authKey,
        customerKey,
        cardCompanyParam,
        cardNumberParam,
        savedCardName,
      })

      // 임시: 백엔드 API 없이 테스트용 billingKey 생성
      const billingKey = `billing_${Date.now()}_${authKey.substring(0, 10)}`
      const cardCompanyValue: CardCompany = cardCompanyParam || 'SHINHAN'
      // Toss에서 카드 번호를 주지 않으므로 형식에 맞는 더미 값을 사용
      const cardNumberMasked =
        cardNumberParam && /\d{4}-\*{4}-\*{4}-\d{4}/.test(cardNumberParam)
          ? cardNumberParam
          : '0000-****-****-0000'
      const cardNameValue = savedCardName || cardName || '새 카드'

      console.log('🧪 테스트 데이터 생성:', {
        billingKey,
        cardCompany: cardCompanyValue,
        cardNumberMasked,
        cardName: cardNameValue,
      })

      // 카드 등록 API 직접 호출
      await addMethod({
        billingKey,
        cardCompany: cardCompanyValue,
        cardNumberMasked,
        cardName: cardNameValue,
      })

      console.log('[결제] 카드 등록 성공')

      setIsAddingCard(false)
      setCardName('')
      sessionStorage.removeItem('pendingCardName')
      setFormError(null)

      // URL 파라미터 제거
      window.history.replaceState({}, '', '/payment-methods')
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        '카드 등록에 실패했습니다.'

      setFormError(errorMessage)
      console.error('Toss 콜백 처리 실패:', err)

      // 에러 발생 시 모달 열어서 사용자에게 알림
      setIsAddingCard(true)

      // URL 파라미터 제거
      window.history.replaceState({}, '', '/payment-methods')
    } finally {
      setTossLoading(false)
    }
  }

  const handleStartCardRegistration = async () => {
    if (!cardName.trim()) {
      setFormError('카드 별명을 입력해주세요.')
      return
    }

    if (!sdkReady) {
      setFormError('Toss SDK를 로드하는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    const TossPayments = (window as any).TossPayments as
      | TossPaymentsConstructor
      | undefined
    if (!TossPayments) {
      setFormError('Toss SDK를 사용할 수 없습니다. 페이지를 새로고침 해주세요.')
      return
    }

    try {
      setTossLoading(true)
      setFormError(null)

      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      if (!clientKey) {
        setFormError('Toss 클라이언트 키가 설정되지 않았습니다.')
        setTossLoading(false)
        return
      }

      const tossPayments = await TossPayments(clientKey)
      const customerKey = `customer_${Date.now()}` // 실제로는 유저 ID 사용

      // 리다이렉트 후 복원할 별명 저장
      sessionStorage.setItem('pendingCardName', cardName)

      // Toss 위젯 이동 전에 모달을 닫아 오버레이가 남지 않도록 처리
      setIsAddingCard(false)
      setFormError('Toss 결제 페이지로 이동합니다...')

      // 빌링키 발급을 위한 카드 등록 요청
      await tossPayments.requestBillingAuth('카드', {
        customerKey,
        successUrl: `${window.location.origin}/payment-methods?success=true`,
        failUrl: `${window.location.origin}/payment-methods?success=false`,
      })
    } catch (err: any) {
      setFormError(err?.message || '카드 등록 요청에 실패했습니다.')
      setTossLoading(false)
    }
  }

  const handleDeleteCard = async (id: number) => {
    try {
      await removeMethod(id)
      setDeleteConfirm(null)
    } catch (err) {
      // Error already handled in hook
    }
  }

  const handleOpenAddCard = () => {
    setIsAddingCard(true)
    setFormError(null)
    setCardName('')
  }

  if (loading && methods.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="text-gray-600">카드 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">결제 수단 관리</h1>
        <Dialog open={isAddingCard} onOpenChange={setIsAddingCard}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAddCard}>
              <CreditCard className="mr-2 h-4 w-4" />
              카드 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="pointer-events-auto bg-white sm:max-w-md">
            <DialogHeader className="space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <DialogTitle className="text-center text-xl">
                새 카드 등록
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="cardName" className="text-sm font-medium">
                  카드 별명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cardName"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="예: 주거래 카드"
                  className="h-11"
                  autoFocus={false}
                />
                <p className="text-xs text-gray-500">
                  등록 후 카드를 쉽게 구분할 수 있는 이름입니다
                </p>
              </div>

              {formError && (
                <Alert
                  variant="destructive"
                  className="border-red-200 bg-red-50"
                >
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {formError}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingCard(false)}
                  className="h-11 flex-1"
                >
                  취소
                </Button>
                <Button
                  onClick={handleStartCardRegistration}
                  disabled={
                    loading || tossLoading || !cardName.trim() || !sdkReady
                  }
                  className="h-11 flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {!sdkReady ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      SDK 로딩 중...
                    </>
                  ) : tossLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      처리 중...
                    </>
                  ) : (
                    '카드 등록'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {methods.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="mb-4 text-gray-600">등록된 카드가 없습니다</p>
          <Button onClick={handleOpenAddCard}>첫 카드 추가하기</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {methods.map((method) => (
            <Card key={method.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">
                      {method.cardCompany
                        ? CARD_COMPANY_NAMES[method.cardCompany]
                        : '카드'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {method.cardNumberMasked}
                    </p>
                    <p className="text-xs text-gray-500">
                      {method.createdAt
                        ? new Date(method.createdAt).toLocaleDateString('ko-KR')
                        : '등록일 미상'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onSelectMethod && (
                    <Button
                      variant="outline"
                      onClick={() => onSelectMethod(method)}
                    >
                      선택
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirm(method.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={deleteConfirm !== null}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>카드를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 카드를 삭제하면 다시 등록해야
              합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteCard(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
