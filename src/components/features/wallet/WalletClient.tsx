'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTossPayments } from '@/hooks/useTossPayments'
import {
  cashApi,
  paymentApi,
  paymentMethodApi,
  tossApi,
} from '@/lib/api/real-api'
import { CreditCard, DollarSign, History, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

interface CashTransaction {
  transactionId: number
  cashId: number
  type: string
  amount: number
  balanceAfter: number
  createdAt: string
  related?: {
    type: string
    id: number
    product?: {
      productId: number
      productName: string
      thumbnailUrl: string
    }
    summary?: string
  }
}

interface PaymentTransaction {
  paymentId: number
  status: string
  amount: number
  provider: string
  methodType: string
  createdAt: string
  cashTransactionId?: number
  balanceAfter?: number
}

interface CashResponse {
  cashId: number
  memberId: number
  balance: number
  createDate: string
  modifyDate: string
}

interface PaymentMethodData {
  id: number
  type: string
  methodType: string
  alias: string
  isDefault: boolean
  provider: string
  brand?: string
  last4?: string
  expMonth?: number
  expYear?: number
  expireMonth?: number
  expireYear?: number
  bankCode?: string
  bankName?: string
  acctLast4?: string
  createDate: string
  modifyDate: string
  expireDate?: string
}

export function WalletClient() {
  const [cashInfo, setCashInfo] = useState<CashResponse | null>(null)
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<
    'wallet' | 'transactions' | 'payments'
  >('wallet')

  // 충전 관련 상태
  const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false)

  // 디버깅을 위한 로그
  useEffect(() => {
    console.log('충전 모달 상태:', isChargeDialogOpen)
  }, [isChargeDialogOpen])
  const [chargeAmount, setChargeAmount] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [isCharging, setIsCharging] = useState(false)

  // 거래 상세 모달 상태
  const [isTransactionDetailOpen, setIsTransactionDetailOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [transactionDetail, setTransactionDetail] = useState<any>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  // 결제 내역 관련 상태
  const [payments, setPayments] = useState<PaymentTransaction[]>([])
  const [isLoadingPayments, setIsLoadingPayments] = useState(false)
  const [isPaymentDetailOpen, setIsPaymentDetailOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentTransaction | null>(null)
  const [paymentDetail, setPaymentDetail] = useState<any>(null)
  const [isLoadingPaymentDetail, setIsLoadingPaymentDetail] = useState(false)

  // 결제수단 관리 관련 상태
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormData, setAddFormData] = useState({
    type: 'card',
    alias: '',
    token: '',
    brand: '',
    last4: '',
    expMonth: '',
    expYear: '',
    bankCode: '',
    bankName: '',
    acctLast4: '',
    provider: 'toss',
  })
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState({
    alias: '',
    isDefault: false,
  })
  const [isEditing, setIsEditing] = useState(false)

  // 토스 결제 SDK 훅
  const {
    isLoaded: isTossLoaded,
    error: tossError,
    createTossPayments,
  } = useTossPayments()

  // 토스 SDK 로드 상태 디버깅
  useEffect(() => {
    console.log('토스 SDK 상태:', { isTossLoaded, tossError })
  }, [isTossLoaded, tossError])

  // URL 쿼리 파라미터로 탭 설정
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const tab = urlParams.get('tab')

      if (tab === 'transactions') {
        setActiveTab('transactions')
        // 거래 내역이 비어있으면 로드
        if (transactions.length === 0) {
          loadTransactions()
        }
      } else if (tab === 'payments') {
        setActiveTab('payments')
        // 결제 내역이 비어있으면 로드
        if (payments.length === 0) {
          loadPayments()
        }
      } else if (tab === 'wallet') {
        setActiveTab('wallet')
      }

      // URL에서 쿼리 파라미터 제거 (깔끔한 URL 유지)
      if (tab) {
        window.history.replaceState({}, '', '/wallet')
      }
    }
  }, [])

  // 지갑 정보 및 결제수단 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError('')

        // 지갑 정보 로드
        try {
          const cashResponse = await cashApi.getMyCash()
          if (cashResponse.success) {
            setCashInfo(cashResponse.data)
          } else {
            console.warn('지갑 정보 로드 실패:', cashResponse.msg)
            // 지갑이 없는 경우는 정상적인 상황일 수 있음
          }
        } catch (cashError: any) {
          console.error('지갑 정보 로드 에러:', cashError)
          // 지갑이 생성되지 않은 경우는 정상적인 상황일 수 있음
          if (cashError.response?.status !== 404) {
            setError('지갑 정보를 불러오는데 실패했습니다.')
          }
        }

        // 결제수단 목록 로드
        try {
          const paymentMethodsResponse =
            await paymentMethodApi.getPaymentMethods()
          console.log('💳 결제수단 목록 응답:', paymentMethodsResponse)

          if (paymentMethodsResponse.success && paymentMethodsResponse.data) {
            // API 응답 데이터 구조에 맞게 변환
            let paymentMethodsData = []
            if (Array.isArray(paymentMethodsResponse.data)) {
              paymentMethodsData = paymentMethodsResponse.data
            } else if (
              paymentMethodsResponse.data.content &&
              Array.isArray(paymentMethodsResponse.data.content)
            ) {
              paymentMethodsData = paymentMethodsResponse.data.content
            }
            console.log('💳 처리된 결제수단 데이터:', paymentMethodsData)
            setPaymentMethods(paymentMethodsData)
          } else {
            console.warn('결제수단 로드 실패:', paymentMethodsResponse.msg)
            // 결제수단이 없는 경우는 정상적인 상황일 수 있음
            setPaymentMethods([])
          }
        } catch (paymentError: any) {
          console.error('결제수단 로드 에러:', paymentError)
          // 결제수단 로드 실패 시 빈 배열로 설정
          setPaymentMethods([])
          if (paymentError.response?.status !== 404) {
            setError('결제수단을 불러오는데 실패했습니다.')
          }
        }
      } catch (err) {
        console.error('데이터 로드 에러:', err)
        setError('데이터를 불러오는데 실패했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // 토스 카드 등록 완료 후 자동 새로고침
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('paymentMethodAdded') === 'true') {
      refreshPaymentMethods()
      // URL에서 파라미터 제거
      window.history.replaceState({}, '', '/wallet')
    }
  }, [])

  // 거래 내역 로드
  const loadTransactions = async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await cashApi.getCashTransactions({
        page: 1,
        size: 20,
      })

      if (response.success) {
        setTransactions(response.data?.items || [])
      } else {
        setError('거래 내역을 불러오는데 실패했습니다.')
      }
    } catch (err) {
      console.error('거래 내역 로드 에러:', err)
      setError('거래 내역을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
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

  const getTransactionType = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return { label: '입금', variant: 'success' as const, icon: '💰' }
      case 'WITHDRAW':
      case 'WITHDRAWAL':
        return { label: '출금', variant: 'error' as const, icon: '💸' }
      case 'PAYMENT':
        return { label: '결제', variant: 'warning' as const, icon: '💳' }
      case 'REFUND':
        return { label: '환불', variant: 'primary' as const, icon: '↩️' }
      default:
        return { label: '기타', variant: 'neutral' as const, icon: '📝' }
    }
  }

  // 충전 처리
  const handleCharge = async () => {
    if (!chargeAmount || !selectedPaymentMethod) {
      alert('충전 금액과 결제수단을 선택해주세요.')
      return
    }

    const amount = parseInt(chargeAmount)
    if (amount < 1000) {
      alert('최소 충전 금액은 1,000원입니다.')
      return
    }

    try {
      setIsCharging(true)

      // 1. 멱등키 발급
      const idempotencyResponse = await tossApi.getIdempotencyKey()
      if (!idempotencyResponse.success) {
        throw new Error('멱등키 발급에 실패했습니다.')
      }

      // 2. 지갑 충전 요청
      const chargeResponse = await tossApi.chargeWallet({
        paymentMethodId: parseInt(selectedPaymentMethod),
        amount: amount,
        idempotencyKey: idempotencyResponse.data.idempotencyKey,
      })

      if (chargeResponse.success) {
        alert('충전이 완료되었습니다!')
        setIsChargeDialogOpen(false)
        setChargeAmount('')
        setSelectedPaymentMethod('')

        // 지갑 정보 및 거래 내역 새로고침
        try {
          console.log('충전 완료 후 데이터 새로고침 시작...')

          // 1. 지갑 정보 새로고침
          const cashResponse = await cashApi.getMyCash()
          if (cashResponse.success) {
            setCashInfo(cashResponse.data)
            console.log('지갑 정보 새로고침 완료:', cashResponse.data)
          } else {
            console.warn('지갑 정보 새로고침 실패:', cashResponse.msg)
          }

          // 2. 거래 내역 새로고침 (현재 탭이 거래 내역인 경우)
          if (activeTab === 'transactions') {
            try {
              await loadTransactions()
              console.log('거래 내역 새로고침 완료')
            } catch (transactionError) {
              console.error('거래 내역 새로고침 실패:', transactionError)
            }
          }

          // 3. 결제 내역 새로고침 (현재 탭이 결제 내역인 경우)
          if (activeTab === 'payments') {
            try {
              await loadPayments()
              console.log('결제 내역 새로고침 완료')
            } catch (paymentError) {
              console.error('결제 내역 새로고침 실패:', paymentError)
            }
          }
        } catch (refreshError) {
          console.error('데이터 새로고침 실패:', refreshError)
          // 새로고침 실패해도 충전은 성공했으므로 사용자에게는 알리지 않음
        }
      } else {
        // API 응답에서 구체적인 에러 메시지 처리
        console.log('충전 API 응답 전체:', chargeResponse)

        // 다양한 경로에서 에러 메시지 추출 시도
        let errorMessage = chargeResponse.msg || '충전에 실패했습니다.'

        // API 응답의 다른 필드들도 확인
        if (chargeResponse.data?.message) {
          errorMessage = chargeResponse.data.message
        } else if (chargeResponse.data?.msg) {
          errorMessage = chargeResponse.data.msg
        } else if (chargeResponse.data?.errorMessage) {
          errorMessage = chargeResponse.data.errorMessage
        } else if ((chargeResponse as any).message) {
          errorMessage = (chargeResponse as any).message
        } else if ((chargeResponse as any).errorMessage) {
          errorMessage = (chargeResponse as any).errorMessage
        }

        console.log('추출된 에러 메시지:', errorMessage)

        if (
          errorMessage.includes('최대 충전 한도') ||
          errorMessage.includes('한도를 초과')
        ) {
          alert(
            `충전 한도 초과: ${errorMessage}\n\n더 작은 금액으로 충전하거나 다른 결제수단을 사용해주세요.`,
          )
        } else if (
          errorMessage.includes('잔액') ||
          errorMessage.includes('부족')
        ) {
          alert(
            `결제수단 잔액 부족: ${errorMessage}\n\n다른 결제수단을 선택해주세요.`,
          )
        } else if (
          errorMessage.includes('카드') ||
          errorMessage.includes('결제수단')
        ) {
          alert(
            `결제수단 오류: ${errorMessage}\n\n다른 결제수단을 선택해주세요.`,
          )
        } else {
          alert(`충전 실패: ${errorMessage}`)
        }

        // API 응답에서 에러를 처리했으므로 catch 블록에서 중복 처리하지 않도록 return
        return
      }
    } catch (err: any) {
      console.error('충전 에러:', err)

      // 4xx 에러 처리 (API 응답에서 처리되지 않은 경우)
      if (err.response?.status >= 400 && err.response?.status < 500) {
        console.log('4xx 에러 - catch 블록에서 처리:', err.response?.data)

        // 4xx 에러에서도 구체적인 에러 메시지 추출하여 사용자에게 표시
        let errorMessage = ''

        if (err.response?.data?.message) {
          errorMessage = err.response.data.message
        } else if (err.response?.data?.msg) {
          errorMessage = err.response.data.msg
        } else if (err.response?.data?.errorMessage) {
          errorMessage = err.response.data.errorMessage
        } else {
          errorMessage = '요청 처리 중 오류가 발생했습니다.'
        }

        console.log('4xx 에러에서 추출된 메시지:', errorMessage)

        // 구체적인 에러 메시지에 따라 적절한 알림 표시
        if (
          errorMessage.includes('최대 충전 한도') ||
          errorMessage.includes('한도를 초과')
        ) {
          alert(
            `충전 한도 초과: ${errorMessage}\n\n더 작은 금액으로 충전하거나 다른 결제수단을 사용해주세요.`,
          )
        } else if (
          errorMessage.includes('잔액') ||
          errorMessage.includes('부족')
        ) {
          alert(
            `결제수단 잔액 부족: ${errorMessage}\n\n다른 결제수단을 선택해주세요.`,
          )
        } else {
          alert(`충전 실패: ${errorMessage}`)
        }

        return
      }

      // 네트워크 에러나 기타 예외 처리
      console.log('Catch 블록 에러 전체:', err)
      console.log('err.response?.data:', err.response?.data)

      // 다양한 경로에서 에러 메시지 추출 시도
      let errorMessage = ''

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.response?.data?.msg) {
        errorMessage = err.response.data.msg
      } else if (err.response?.data?.data?.message) {
        errorMessage = err.response.data.data.message
      } else if (err.response?.data?.errorMessage) {
        errorMessage = err.response.data.errorMessage
      } else if (err.message) {
        errorMessage = err.message
      } else {
        errorMessage = '충전 중 알 수 없는 오류가 발생했습니다.'
      }

      console.log('Catch 블록에서 추출된 에러 메시지:', errorMessage)

      if (errorMessage) {
        if (
          errorMessage.includes('최대 충전 한도') ||
          errorMessage.includes('한도를 초과')
        ) {
          alert(
            `충전 한도 초과: ${errorMessage}\n\n더 작은 금액으로 충전하거나 다른 결제수단을 사용해주세요.`,
          )
        } else if (
          errorMessage.includes('잔액') ||
          errorMessage.includes('부족')
        ) {
          alert(
            `결제수단 잔액 부족: ${errorMessage}\n\n다른 결제수단을 선택해주세요.`,
          )
        } else {
          alert(`충전 실패: ${errorMessage}`)
        }
      } else {
        alert(
          '충전 중 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        )
      }
    } finally {
      setIsCharging(false)
    }
  }

  // 결제수단 등록 (토스 팝업)
  const handleAddPaymentMethod = async () => {
    try {
      // 인증 토큰 확인
      const cookies = document.cookie.split(';')
      const accessTokenCookie = cookies.find((cookie) =>
        cookie.trim().startsWith('accessToken='),
      )
      const cookieToken = accessTokenCookie?.split('=')[1]?.trim()
      const localStorageToken = localStorage.getItem('accessToken')
      console.log('🔐 토스 카드 등록 - 인증 토큰 상태:', {
        cookieToken: cookieToken ? '존재함' : '없음',
        localStorageToken: localStorageToken ? '존재함' : '없음',
        hasToken: !!(cookieToken || localStorageToken),
      })

      // 1. 토스 빌링 인증 파라미터 조회
      console.log('📞 토스 빌링 인증 파라미터 조회 시작...')
      const authParamsResponse = await tossApi.getBillingAuthParams()
      console.log('📞 토스 빌링 인증 파라미터 응답:', authParamsResponse)

      if (!authParamsResponse.success) {
        throw new Error('결제수단 등록 정보를 가져오는데 실패했습니다.')
      }

      const { clientKey, customerKey, successUrl, failUrl } =
        authParamsResponse.data

      // 2. 토스 SDK로 카드 등록 팝업 띄우기
      if (isTossLoaded) {
        try {
          const tossPayments = createTossPayments(clientKey)

          // successUrl에 파라미터 추가하여 지갑 페이지로 돌아올 때 자동 새로고침되도록 함
          const successUrlWithParam = `${successUrl}?redirectTo=${encodeURIComponent('/wallet?paymentMethodAdded=true')}`
          tossPayments.requestBillingAuth('카드', {
            customerKey: customerKey,
            successUrl: successUrlWithParam,
            failUrl: failUrl,
          })
        } catch (tossError) {
          console.error('토스 SDK 에러:', tossError)
          // 토스 SDK 에러 시 대체 방법 사용
          const currentUrl = window.location.origin
          const fullSuccessUrl = `${currentUrl}/payments/toss/billing-success?redirectTo=${encodeURIComponent('/wallet?paymentMethodAdded=true')}`
          const fullFailUrl = `${currentUrl}/payments/toss/billing-fail`

          window.location.href = `/api/proxy/api/v1/payments/toss/billing-auth?customerKey=${customerKey}&successUrl=${encodeURIComponent(fullSuccessUrl)}&failUrl=${encodeURIComponent(fullFailUrl)}`
        }
      } else {
        // 토스 SDK가 로드되지 않은 경우 직접 페이지 이동
        const currentUrl = window.location.origin
        const fullSuccessUrl = `${currentUrl}/payments/toss/billing-success?redirectTo=${encodeURIComponent('/wallet?paymentMethodAdded=true')}`
        const fullFailUrl = `${currentUrl}/payments/toss/billing-fail`

        window.location.href = `/api/proxy/api/v1/payments/toss/billing-auth?customerKey=${customerKey}&successUrl=${encodeURIComponent(fullSuccessUrl)}&failUrl=${encodeURIComponent(fullFailUrl)}`
      }
    } catch (err) {
      console.error('결제수단 등록 에러:', err)
      alert(
        `결제수단 등록에 실패했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
      )
    }
  }

  // 결제수단 삭제
  const handleDeletePaymentMethod = async (id: number) => {
    if (!confirm('정말로 이 결제 수단을 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await paymentMethodApi.deletePaymentMethod(id)
      if (response.success) {
        setPaymentMethods((prev) => prev.filter((method) => method.id !== id))
        alert('결제 수단이 삭제되었습니다.')
      } else {
        alert(response.msg || '결제 수단 삭제에 실패했습니다.')
      }
    } catch (err: any) {
      console.error('결제 수단 삭제 에러:', err)
      alert(err.response?.data?.msg || '결제 수단 삭제에 실패했습니다.')
    }
  }

  // 결제수단 추가
  const handleAddPaymentMethodForm = async () => {
    setIsAdding(true)
    try {
      const response = await paymentMethodApi.createPaymentMethod({
        type: addFormData.type,
        token: addFormData.token,
        alias: addFormData.alias,
        brand: addFormData.type === 'card' ? addFormData.brand : undefined,
        last4: addFormData.type === 'card' ? addFormData.last4 : undefined,
        expMonth:
          addFormData.type === 'card'
            ? parseInt(addFormData.expMonth)
            : undefined,
        expYear:
          addFormData.type === 'card'
            ? parseInt(addFormData.expYear)
            : undefined,
        bankCode:
          addFormData.type === 'bank' ? addFormData.bankCode : undefined,
        bankName:
          addFormData.type === 'bank' ? addFormData.bankName : undefined,
        acctLast4:
          addFormData.type === 'bank' ? addFormData.acctLast4 : undefined,
        provider: addFormData.provider,
      })

      if (response.success) {
        alert('결제수단이 성공적으로 추가되었습니다.')
        setShowAddForm(false)
        setAddFormData({
          type: 'card',
          alias: '',
          token: '',
          brand: '',
          last4: '',
          expMonth: '',
          expYear: '',
          bankCode: '',
          bankName: '',
          acctLast4: '',
          provider: 'toss',
        })
        // 목록 새로고침
        try {
          const listResponse = await paymentMethodApi.getPaymentMethods()
          if (listResponse.success && listResponse.data) {
            let paymentMethodsData = []
            if (Array.isArray(listResponse.data)) {
              paymentMethodsData = listResponse.data
            } else if (
              listResponse.data.content &&
              Array.isArray(listResponse.data.content)
            ) {
              paymentMethodsData = listResponse.data.content
            }
            setPaymentMethods(paymentMethodsData)
          }
        } catch (refreshError) {
          console.error('결제수단 목록 새로고침 실패:', refreshError)
          // 새로고침 실패해도 추가는 성공했으므로 에러 표시하지 않음
        }
      } else {
        alert(response.msg || '결제수단 추가에 실패했습니다.')
      }
    } catch (err: any) {
      console.error('결제수단 추가 에러:', err)
      alert(err.response?.data?.msg || '결제수단 추가에 실패했습니다.')
    }
    setIsAdding(false)
  }

  // 결제수단 수정
  const handleEditPaymentMethod = async () => {
    if (!editingId) return

    setIsEditing(true)
    try {
      // 수정하려는 결제수단의 원래 데이터 찾기
      const originalPaymentMethod = paymentMethods.find(
        (pm) => pm.id === editingId,
      )
      if (!originalPaymentMethod) {
        throw new Error('수정할 결제수단을 찾을 수 없습니다.')
      }

      // 원래 데이터의 필수 필드들을 포함해서 수정 요청
      const updateData: any = {
        alias: editFormData.alias,
        isDefault: editFormData.isDefault,
      }

      const response = await paymentMethodApi.updatePaymentMethod(
        editingId,
        updateData,
      )

      if (response.success) {
        alert('결제수단이 성공적으로 수정되었습니다.')
        setEditingId(null)
        setEditFormData({ alias: '', isDefault: false })
        // 목록 새로고침
        try {
          const listResponse = await paymentMethodApi.getPaymentMethods()
          if (listResponse.success && listResponse.data) {
            let paymentMethodsData = []
            if (Array.isArray(listResponse.data)) {
              paymentMethodsData = listResponse.data
            } else if (
              listResponse.data.content &&
              Array.isArray(listResponse.data.content)
            ) {
              paymentMethodsData = listResponse.data.content
            }
            setPaymentMethods(paymentMethodsData)
          }
        } catch (refreshError) {
          console.error('결제수단 목록 새로고침 실패:', refreshError)
          // 새로고침 실패해도 수정은 성공했으므로 에러 표시하지 않음
        }
      } else {
        alert(response.msg || '결제수단 수정에 실패했습니다.')
      }
    } catch (err: any) {
      console.error('결제수단 수정 에러:', err)
      alert(err.response?.data?.msg || '결제수단 수정에 실패했습니다.')
    }
    setIsEditing(false)
  }

  // 수정 모드 시작
  const startEdit = (paymentMethod: PaymentMethodData) => {
    setEditingId(paymentMethod.id)
    setEditFormData({
      alias: paymentMethod.alias,
      isDefault: paymentMethod.isDefault,
    })
  }

  const getCardTypeIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return '💳'
      case 'mastercard':
        return '💳'
      case 'amex':
        return '💳'
      default:
        return '💳'
    }
  }

  const getBankIcon = (bankName?: string) => {
    return '🏦'
  }

  // 결제수단 목록 새로고침
  const refreshPaymentMethods = async () => {
    try {
      setIsLoading(true)
      setError('')

      const paymentMethodsResponse = await paymentMethodApi.getPaymentMethods()
      console.log('💳 결제수단 새로고침 응답:', paymentMethodsResponse)

      if (paymentMethodsResponse.success && paymentMethodsResponse.data) {
        let paymentMethodsData = []
        if (Array.isArray(paymentMethodsResponse.data)) {
          paymentMethodsData = paymentMethodsResponse.data
        } else if (
          paymentMethodsResponse.data.content &&
          Array.isArray(paymentMethodsResponse.data.content)
        ) {
          paymentMethodsData = paymentMethodsResponse.data.content
        }
        console.log('💳 처리된 결제수단 데이터:', paymentMethodsData)
        setPaymentMethods(paymentMethodsData)
      } else {
        console.warn('결제수단 로드 실패:', paymentMethodsResponse.msg)
        // 결제수단이 없는 경우는 정상적인 상황일 수 있음
        setPaymentMethods([])
      }
    } catch (err: any) {
      console.error('결제수단 새로고침 에러:', err)
      // 결제수단 로드 실패 시 빈 배열로 설정
      setPaymentMethods([])
      if (err.response?.status !== 404) {
        setError('결제수단을 불러오는데 실패했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 결제 내역 불러오기
  const loadPayments = async () => {
    try {
      setIsLoadingPayments(true)
      const paymentsResponse = await paymentApi.getMyPayments()
      console.log('💳 결제 내역 응답:', paymentsResponse)

      if (paymentsResponse.success && paymentsResponse.data) {
        const paymentsData = paymentsResponse.data.items || []
        console.log('💳 처리된 결제 내역 데이터:', paymentsData)
        setPayments(paymentsData)
      } else {
        console.error('결제 내역 로드 실패:', paymentsResponse.msg)
        setError(paymentsResponse.msg || '결제 내역을 불러오는데 실패했습니다.')
      }
    } catch (err) {
      console.error('결제 내역 로드 에러:', err)
      setError('결제 내역을 불러오는데 실패했습니다.')
    } finally {
      setIsLoadingPayments(false)
    }
  }

  // 거래 상세 정보 조회
  const handleTransactionClick = async (transaction: any) => {
    try {
      setSelectedTransaction(transaction)
      setIsTransactionDetailOpen(true)
      setIsLoadingDetail(true)

      console.log('🔍 거래 상세 조회 시작:', transaction.transactionId)
      const detailResponse = await cashApi.getTransactionDetail(
        transaction.transactionId,
      )
      console.log('🔍 거래 상세 응답:', detailResponse)

      if (detailResponse.success) {
        setTransactionDetail(detailResponse.data)
      } else {
        console.error('거래 상세 조회 실패:', detailResponse.msg)
        setError(
          detailResponse.msg || '거래 상세 정보를 불러오는데 실패했습니다.',
        )
      }
    } catch (err) {
      console.error('거래 상세 조회 에러:', err)
      setError('거래 상세 정보를 불러오는데 실패했습니다.')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  // 결제 상세 정보 조회
  const handlePaymentClick = async (payment: PaymentTransaction) => {
    try {
      setSelectedPayment(payment)
      setIsPaymentDetailOpen(true)
      setIsLoadingPaymentDetail(true)

      console.log('🔍 결제 상세 조회 시작:', payment.paymentId)
      const detailResponse = await paymentApi.getPaymentDetail(
        payment.paymentId,
      )
      console.log('🔍 결제 상세 응답:', detailResponse)

      if (detailResponse.success) {
        setPaymentDetail(detailResponse.data)
      } else {
        console.error('결제 상세 조회 실패:', detailResponse.msg)
        setError(
          detailResponse.msg || '결제 상세 정보를 불러오는데 실패했습니다.',
        )
      }
    } catch (err) {
      console.error('결제 상세 조회 에러:', err)
      setError('결제 상세 정보를 불러오는데 실패했습니다.')
    } finally {
      setIsLoadingPaymentDetail(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 탭 네비게이션 */}
      <div className="mb-6">
        <div className="flex space-x-1 rounded-lg bg-neutral-100 p-1">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'wallet'
                ? 'text-primary-600 bg-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <DollarSign className="mr-2 inline h-4 w-4" />
            지갑 관리
          </button>
          <button
            onClick={() => {
              setActiveTab('transactions')
              if (transactions.length === 0) {
                loadTransactions()
              }
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'transactions'
                ? 'text-primary-600 bg-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <History className="mr-2 inline h-4 w-4" />
            거래 내역
          </button>
          <button
            onClick={() => {
              setActiveTab('payments')
              if (payments.length === 0) {
                loadPayments()
              }
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'payments'
                ? 'text-primary-600 bg-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <CreditCard className="mr-2 inline h-4 w-4" />
            결제 내역
          </button>
        </div>
      </div>

      {/* 지갑 관리 탭 */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          {/* 지갑 관리 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">지갑 관리</h2>
              <p className="mt-1 text-sm text-neutral-600">
                잔액 확인 및 결제수단을 관리할 수 있습니다.
              </p>
            </div>
          </div>
          {isLoading ? (
            <Card variant="outlined">
              <CardContent className="py-12 text-center">
                <div className="border-primary-200 border-t-primary-600 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4"></div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  지갑 정보를 불러오는 중...
                </h3>
              </CardContent>
            </Card>
          ) : cashInfo ? (
            <div className="">
              {/* 잔액 카드 */}
              <Card variant="outlined">
                <CardHeader>
                  <h3 className="flex items-center text-lg font-semibold">
                    <DollarSign className="text-primary-600 mr-2 h-5 w-5" />
                    현재 잔액
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="text-primary-600 text-3xl font-bold">
                    {formatPrice(cashInfo.balance)}
                  </div>
                  <p className="mt-2 text-sm text-neutral-600">
                    지갑 ID: {cashInfo.cashId}
                  </p>
                  <div className="mt-4 flex space-x-2">
                    <Button
                      onClick={() => {
                        console.log('충전하기 버튼 클릭됨')
                        setIsChargeDialogOpen(true)
                      }}
                      className="flex-1"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      충전하기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* 지갑 없음 카드 */}
              <Card variant="outlined">
                <CardHeader>
                  <h3 className="flex items-center text-lg font-semibold">
                    <DollarSign className="text-primary-600 mr-2 h-5 w-5" />
                    현재 잔액
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="text-primary-600 text-3xl font-bold">0원</div>

                  <div className="mt-4 flex space-x-2">
                    <Button
                      onClick={() => {
                        console.log('충전하기 버튼 클릭됨')
                        setIsChargeDialogOpen(true)
                      }}
                      className="flex-1"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      충전하기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 결제수단 목록 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">
                등록된 결제수단
              </h3>
              <div className="flex space-x-2">
                <Button
                  onClick={refreshPaymentMethods}
                  variant="outline"
                  size="sm"
                >
                  새로고침
                </Button>
                <Button onClick={() => setShowAddForm(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  수동 추가
                </Button>
                <Button
                  onClick={handleAddPaymentMethod}
                  variant="outline"
                  size="sm"
                  disabled={!isTossLoaded}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {isTossLoaded ? '카드 등록' : '로딩 중...'}
                </Button>
              </div>
            </div>

            {paymentMethods.length === 0 ? (
              <Card variant="outlined">
                <CardContent className="py-12 text-center">
                  <div className="mb-4">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                      <CreditCard className="h-8 w-8 text-neutral-400" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                      등록된 결제수단이 없습니다
                    </h3>
                    <p className="text-neutral-600">
                      새로운 결제수단을 추가해보세요.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <Card key={method.id} variant="outlined">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
                              <span className="text-xl">
                                {method.type === 'CARD'
                                  ? getCardTypeIcon(method.brand)
                                  : getBankIcon(method.bankName)}
                              </span>
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-center space-x-2">
                              <Badge
                                variant={
                                  method.isDefault ? 'primary' : 'neutral'
                                }
                              >
                                {method.isDefault ? '기본' : '일반'}
                              </Badge>
                              <Badge variant="neutral">{method.type}</Badge>
                            </div>

                            {editingId === method.id ? (
                              <div className="mb-2 space-y-2">
                                <Input
                                  value={editFormData.alias}
                                  onChange={(e) =>
                                    setEditFormData((prev) => ({
                                      ...prev,
                                      alias: e.target.value,
                                    }))
                                  }
                                  placeholder="별칭을 입력하세요"
                                />
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={editFormData.isDefault}
                                    onChange={(e) =>
                                      setEditFormData((prev) => ({
                                        ...prev,
                                        isDefault: e.target.checked,
                                      }))
                                    }
                                    className="text-primary-600 focus:ring-primary-500 rounded border-neutral-300"
                                  />
                                  <span className="ml-2 text-sm text-neutral-600">
                                    기본 결제수단으로 설정
                                  </span>
                                </label>
                              </div>
                            ) : (
                              <h4 className="mb-1 text-base font-semibold text-neutral-900">
                                {method.alias}
                              </h4>
                            )}

                            <div className="space-y-1 text-sm text-neutral-600">
                              <div className="flex items-center justify-between">
                                <span>제공업체:</span>
                                <span>{method.provider}</span>
                              </div>
                              {method.type === 'CARD' && (
                                <>
                                  <div className="flex items-center justify-between">
                                    <span>카드 브랜드:</span>
                                    <span>{method.brand}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span>카드 번호:</span>
                                    <span>**** **** **** {method.last4}</span>
                                  </div>
                                </>
                              )}
                              {method.type === 'BANK' && (
                                <>
                                  <div className="flex items-center justify-between">
                                    <span>은행:</span>
                                    <span>{method.bankName}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span>계좌 번호:</span>
                                    <span>****{method.acctLast4}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 액션 버튼들 */}
                        <div className="flex space-x-2">
                          {editingId === method.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={handleEditPaymentMethod}
                                disabled={isEditing}
                              >
                                {isEditing ? '저장 중...' : '저장'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingId(null)}
                                disabled={isEditing}
                              >
                                취소
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(method)}
                              >
                                수정
                              </Button>
                              {!method.isDefault && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleDeletePaymentMethod(method.id)
                                  }
                                >
                                  삭제
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 거래 내역 탭 */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* 거래 내역 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900">거래 내역</h2>
              <p className="mt-2 text-base text-neutral-600">
                지갑의 모든 입출금 내역을 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="from-primary-50 to-primary-100 flex items-center space-x-3 rounded-full bg-gradient-to-r px-4 py-2 shadow-sm">
                <div className="bg-primary-500 h-2.5 w-2.5 animate-pulse rounded-full"></div>
                <span className="text-primary-700 text-sm font-semibold">
                  총 {transactions.length}건
                </span>
              </div>
              <Button
                onClick={loadTransactions}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="hover:border-primary-200 border-neutral-200 transition-colors hover:bg-neutral-50"
              >
                <History className="mr-2 h-4 w-4" />
                {isLoading ? '새로고침 중...' : '새로고침'}
              </Button>
            </div>
          </div>
          {isLoading ? (
            <Card variant="outlined" className="border-0 bg-white shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="border-primary-200 border-t-primary-600 mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4"></div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                  거래 내역을 불러오는 중...
                </h3>
                <p className="text-sm text-neutral-500">잠시만 기다려주세요.</p>
              </CardContent>
            </Card>
          ) : transactions.length === 0 ? (
            <Card variant="outlined" className="border-0 bg-white shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="mb-6">
                  <div className="from-primary-50 to-primary-100 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br shadow-sm">
                    <History className="text-primary-400 h-10 w-10" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-neutral-900">
                    거래 내역이 없습니다
                  </h3>
                  <p className="mb-6 text-neutral-500">
                    아직 거래 내역이 없습니다. 첫 충전을 해보세요!
                  </p>
                  <Button
                    onClick={() => setActiveTab('wallet')}
                    size="sm"
                    className="bg-primary-600 hover:bg-primary-700"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    지갑으로 이동
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => {
                const typeInfo = getTransactionType(transaction.type)
                const isPositive = transaction.amount > 0
                const absoluteAmount = Math.abs(transaction.amount)

                return (
                  <Card
                    key={transaction.transactionId}
                    variant="outlined"
                    className="group hover:border-primary-200 cursor-pointer border-0 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    onClick={() => handleTransactionClick(transaction)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-5">
                        {/* 거래 타입 아이콘 */}
                        <div className="flex-shrink-0">
                          <div
                            className={`flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm transition-all duration-200 group-hover:scale-105 ${
                              isPositive
                                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600'
                                : 'bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600'
                            }`}
                          >
                            <span className="text-3xl">{typeInfo.icon}</span>
                          </div>
                        </div>

                        {/* 거래 정보 */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <Badge
                                  variant={typeInfo.variant}
                                  className="px-3 py-1.5 text-sm font-semibold shadow-sm"
                                >
                                  {typeInfo.label}
                                </Badge>
                                <span className="font-mono text-xs text-neutral-400">
                                  #{transaction.transactionId}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-neutral-500">
                                <span className="flex items-center">
                                  <History className="mr-1.5 h-3.5 w-3.5" />
                                  {formatDate(transaction.createdAt)}
                                </span>
                                {transaction.related &&
                                  transaction.related.summary && (
                                    <span className="flex items-center">
                                      <span className="mr-1.5">🔗</span>
                                      {transaction.related.summary}
                                    </span>
                                  )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-2xl font-bold ${
                                  isPositive
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                                }`}
                              >
                                {isPositive ? '+' : '-'}
                                {formatPrice(absoluteAmount)}
                              </div>
                              <div className="mt-1 text-sm text-neutral-500">
                                잔액:{' '}
                                <span className="font-semibold">
                                  {formatPrice(transaction.balanceAfter)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 결제 내역 탭 */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* 결제 내역 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">결제 내역</h2>
              <p className="mt-1 text-sm text-neutral-600">
                결제 내역을 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-primary-50 flex items-center space-x-2 rounded-full px-3 py-1.5">
                <div className="bg-primary-500 h-2 w-2 rounded-full"></div>
                <span className="text-primary-700 text-sm font-medium">
                  총 {payments.length}건
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadPayments}
                disabled={isLoadingPayments}
                className="border-neutral-200 hover:bg-neutral-50"
              >
                <History className="mr-2 h-4 w-4" />
                새로고침
              </Button>
            </div>
          </div>

          {/* 결제 내역 목록 */}
          {isLoadingPayments ? (
            <Card variant="outlined" className="border-0 bg-white shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="border-primary-200 border-t-primary-600 mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4"></div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                  결제 내역을 불러오는 중...
                </h3>
                <p className="text-sm text-neutral-500">잠시만 기다려주세요.</p>
              </CardContent>
            </Card>
          ) : payments.length === 0 ? (
            <Card variant="outlined" className="border-0 bg-white shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="mb-6">
                  <div className="from-primary-50 to-primary-100 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br shadow-sm">
                    <CreditCard className="text-primary-400 h-10 w-10" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-neutral-900">
                    결제 내역이 없습니다
                  </h3>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => {
                const getPaymentStatus = (status: string) => {
                  switch (status) {
                    case 'SUCCESS':
                      return {
                        label: '성공',
                        variant: 'success' as const,
                        icon: '✅',
                      }
                    case 'FAILED':
                      return {
                        label: '실패',
                        variant: 'error' as const,
                        icon: '❌',
                      }
                    case 'PENDING':
                      return {
                        label: '진행중',
                        variant: 'secondary' as const,
                        icon: '⏳',
                      }
                    default:
                      return {
                        label: status,
                        variant: 'neutral' as const,
                        icon: '❓',
                      }
                  }
                }

                const getProviderInfo = (provider: string) => {
                  switch (provider.toLowerCase()) {
                    case 'toss':
                      return { name: '토스페이먼츠', color: 'text-blue-600' }
                    case 'kakao':
                      return { name: '카카오페이', color: 'text-yellow-600' }
                    default:
                      return { name: provider, color: 'text-neutral-600' }
                  }
                }

                const statusInfo = getPaymentStatus(payment.status)
                const providerInfo = getProviderInfo(payment.provider)

                return (
                  <Card
                    key={payment.paymentId}
                    variant="outlined"
                    className="group cursor-pointer border-0 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    onClick={() => handlePaymentClick(payment)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center space-x-4">
                        {/* 결제 상태 아이콘 */}
                        <div className="flex-shrink-0">
                          <div
                            className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm transition-all duration-200 group-hover:scale-105 ${
                              statusInfo.variant === 'success'
                                ? 'from-success-50 to-success-100 text-success-600 bg-gradient-to-br'
                                : statusInfo.variant === 'error'
                                  ? 'from-error-50 to-error-100 text-error-600 bg-gradient-to-br'
                                  : 'bg-gradient-to-br from-neutral-50 to-neutral-100 text-neutral-600'
                            }`}
                          >
                            <span className="text-2xl">{statusInfo.icon}</span>
                          </div>
                        </div>

                        {/* 결제 정보 */}
                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant={statusInfo.variant}
                                  className="px-2.5 py-1 text-sm font-semibold"
                                >
                                  {statusInfo.label}
                                </Badge>
                                <span className="text-xs text-neutral-400">
                                  #{payment.paymentId}
                                </span>
                              </div>
                              <div className="flex items-center space-x-3 text-sm text-neutral-500">
                                <span className="flex items-center">
                                  <History className="mr-1 h-3 w-3" />
                                  {formatDate(payment.createdAt)}
                                </span>
                                <span
                                  className={`flex items-center ${providerInfo.color}`}
                                >
                                  <span className="mr-1">💳</span>
                                  {providerInfo.name}
                                </span>
                                <span className="flex items-center">
                                  <span className="mr-1">🔧</span>
                                  {payment.methodType}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-primary-600 text-xl font-bold">
                                +{formatPrice(payment.amount)}
                              </div>
                              {payment.balanceAfter && (
                                <div className="text-xs text-neutral-400">
                                  잔액: {formatPrice(payment.balanceAfter)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 결제수단 관리 탭 - 제거됨 (지갑 관리 탭에 통합) */}
      {false && (
        <div className="space-y-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-900">
                결제수단 관리
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                등록된 결제수단을 관리하고 새로운 결제수단을 추가할 수 있습니다.
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={refreshPaymentMethods}
                variant="outline"
                size="sm"
              >
                새로고침
              </Button>
              <Button onClick={() => setShowAddForm(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                수동 추가
              </Button>
              <Button
                onClick={handleAddPaymentMethod}
                variant="outline"
                size="sm"
                disabled={!isTossLoaded}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {isTossLoaded ? '카드 등록' : '로딩 중...'}
              </Button>
            </div>
          </div>

          {/* 결제수단 목록 */}
          <div className="space-y-4">
            {isLoading ? (
              <Card variant="outlined">
                <CardContent className="py-12 text-center">
                  <div className="border-primary-200 border-t-primary-600 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4"></div>
                  <h3 className="text-lg font-semibold text-neutral-900">
                    결제수단을 불러오는 중...
                  </h3>
                </CardContent>
              </Card>
            ) : paymentMethods.length === 0 ? (
              <Card variant="outlined">
                <CardContent className="py-12 text-center">
                  <div className="mb-4">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                      <CreditCard className="h-8 w-8 text-neutral-400" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                      등록된 결제수단이 없습니다
                    </h3>
                    <p className="text-neutral-600">
                      새로운 결제수단을 추가해보세요.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              paymentMethods.map((method) => (
                <Card key={method.id} variant="outlined">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                            <span className="text-2xl">
                              {method.type === 'CARD'
                                ? getCardTypeIcon(method.brand)
                                : getBankIcon(method.bankName)}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center space-x-2">
                            <Badge
                              variant={method.isDefault ? 'primary' : 'neutral'}
                            >
                              {method.isDefault ? '기본' : '일반'}
                            </Badge>
                            <Badge variant="neutral">{method.type}</Badge>
                          </div>

                          {editingId === method.id ? (
                            <div className="mb-2 space-y-2">
                              <Input
                                value={editFormData.alias}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({
                                    ...prev,
                                    alias: e.target.value,
                                  }))
                                }
                                placeholder="별칭을 입력하세요"
                              />
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={editFormData.isDefault}
                                  onChange={(e) =>
                                    setEditFormData((prev) => ({
                                      ...prev,
                                      isDefault: e.target.checked,
                                    }))
                                  }
                                  className="text-primary-600 focus:ring-primary-500 rounded border-neutral-300"
                                />
                                <span className="ml-2 text-sm text-neutral-600">
                                  기본 결제수단으로 설정
                                </span>
                              </label>
                            </div>
                          ) : (
                            <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                              {method.alias}
                            </h3>
                          )}

                          <div className="mb-3 space-y-1 text-sm text-neutral-600">
                            <div className="flex items-center justify-between">
                              <span>제공업체:</span>
                              <span>{method.provider}</span>
                            </div>
                            {method.type === 'CARD' && (
                              <>
                                <div className="flex items-center justify-between">
                                  <span>카드 브랜드:</span>
                                  <span>{method.brand}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>카드 번호:</span>
                                  <span>**** **** **** {method.last4}</span>
                                </div>
                              </>
                            )}
                            {method.type === 'BANK' && (
                              <>
                                <div className="flex items-center justify-between">
                                  <span>은행:</span>
                                  <span>{method.bankName}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>계좌 번호:</span>
                                  <span>****{method.acctLast4}</span>
                                </div>
                                {method.bankCode && (
                                  <div className="flex items-center justify-between">
                                    <span>은행 코드:</span>
                                    <span>{method.bankCode}</span>
                                  </div>
                                )}
                              </>
                            )}
                            <div className="flex items-center justify-between">
                              <span>등록일: </span>
                              <span>{formatDate(method.createDate)}</span>
                            </div>
                            {method.expireDate && (
                              <div className="flex items-center justify-between">
                                <span>만료일: </span>
                                <span>{formatDate(method.expireDate)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼들 */}
                      <div className="flex space-x-2">
                        {editingId === method.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={handleEditPaymentMethod}
                              disabled={isEditing}
                            >
                              {isEditing ? '저장 중...' : '저장'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingId(null)}
                              disabled={isEditing}
                            >
                              취소
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(method)}
                            >
                              수정
                            </Button>
                            {!method.isDefault && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleDeletePaymentMethod(method.id)
                                }
                              >
                                삭제
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* 충전 다이얼로그 */}
      <Dialog open={isChargeDialogOpen} onOpenChange={setIsChargeDialogOpen}>
        <DialogContent className="z-[9998] border-2 border-gray-300 bg-white shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>지갑 충전</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 충전 금액 입력 */}
            <div className="space-y-2">
              <Label htmlFor="chargeAmount">충전 금액</Label>
              <Input
                id="chargeAmount"
                type="number"
                placeholder="충전할 금액을 입력하세요"
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
                min="1000"
                step="1000"
              />
              <p className="text-sm text-neutral-600">
                최소 충전 금액: 1,000원
              </p>
              <p className="text-sm text-amber-600">
                ⚠️ 1회 최대 충전 한도가 있습니다. 한도 초과 시 더 작은 금액으로
                충전해주세요.
              </p>
            </div>

            {/* 결제수단 선택 */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">결제수단</Label>
              {paymentMethods.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="mb-2 text-sm text-neutral-600">
                    등록된 결제수단이 없습니다.
                  </p>
                  <Button
                    onClick={handleAddPaymentMethod}
                    variant="outline"
                    size="sm"
                    disabled={!isTossLoaded}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {isTossLoaded ? '카드 등록하기' : '로딩 중...'}
                  </Button>
                </div>
              ) : (
                <Select
                  value={selectedPaymentMethod}
                  onValueChange={(value) => {
                    console.log('결제수단 선택됨:', value)
                    setSelectedPaymentMethod(value)
                  }}
                >
                  <SelectTrigger
                    onClick={() =>
                      console.log(
                        'Select 클릭됨, 결제수단 개수:',
                        paymentMethods.length,
                      )
                    }
                  >
                    <SelectValue placeholder="결제수단을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id.toString()}>
                        {method.alias}
                        {method.type === 'CARD' &&
                          method.brand &&
                          method.last4 && (
                            <>
                              {' '}
                              - {method.brand} ****{method.last4}
                            </>
                          )}
                        {method.isDefault && ' (기본)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 충전 버튼 */}
            <div className="flex space-x-2 pt-4">
              <Button
                onClick={handleCharge}
                disabled={!chargeAmount || !selectedPaymentMethod || isCharging}
                className="flex-1"
              >
                {isCharging ? '충전 중...' : '충전하기'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsChargeDialogOpen(false)}
                disabled={isCharging}
              >
                취소
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 거래 상세 모달 */}
      <Dialog
        open={isTransactionDetailOpen}
        onOpenChange={setIsTransactionDetailOpen}
      >
        <DialogContent className="z-[9998] border-0 bg-white shadow-2xl sm:max-w-lg">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold text-neutral-900">
              거래 상세 내역
            </DialogTitle>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="py-8 text-center">
              <div className="border-primary-200 border-t-primary-600 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4"></div>
              <p className="text-sm text-neutral-600">
                거래 상세 정보를 불러오는 중...
              </p>
            </div>
          ) : transactionDetail ? (
            <div className="space-y-6">
              {/* 거래 기본 정보 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      selectedTransaction?.type === 'DEPOSIT' ||
                      selectedTransaction?.type === 'REFUND'
                        ? 'bg-success-50 text-success-600'
                        : 'bg-error-50 text-error-600'
                    }`}
                  >
                    <span className="text-xl">
                      {selectedTransaction &&
                        getTransactionType(selectedTransaction.type).icon}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedTransaction &&
                        getTransactionType(selectedTransaction.type).label}
                    </h3>
                    <p className="text-sm text-neutral-600">
                      거래 ID: #{selectedTransaction?.transactionId}
                    </p>
                  </div>
                </div>

                {/* 거래 금액 */}
                <div className="rounded-2xl bg-gradient-to-r from-neutral-50 to-neutral-100 p-6 shadow-sm">
                  <div className="text-center">
                    <p className="mb-2 text-sm font-medium text-neutral-600">
                      거래 금액
                    </p>
                    <p
                      className={`text-3xl font-bold ${
                        selectedTransaction?.type === 'DEPOSIT' ||
                        selectedTransaction?.type === 'REFUND'
                          ? 'text-success-600'
                          : 'text-error-600'
                      }`}
                    >
                      {selectedTransaction?.type === 'DEPOSIT' ||
                      selectedTransaction?.type === 'REFUND'
                        ? '+'
                        : ''}
                      {selectedTransaction &&
                        formatPrice(selectedTransaction.amount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 상세 정보 */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-neutral-900">
                  거래 정보
                </h4>
                <div className="space-y-3 rounded-xl bg-neutral-50 p-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-neutral-600">
                      거래일시
                    </span>
                    <span className="text-sm text-neutral-900">
                      {selectedTransaction &&
                        formatDate(selectedTransaction.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-neutral-600">
                      거래 후 잔액
                    </span>
                    <span className="text-primary-600 text-sm font-bold">
                      {selectedTransaction &&
                        formatPrice(selectedTransaction.balanceAfter)}
                    </span>
                  </div>
                  {transactionDetail.description && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-neutral-600">
                        설명
                      </span>
                      <span className="text-sm text-neutral-900">
                        {transactionDetail.description}
                      </span>
                    </div>
                  )}
                  {transactionDetail.reference && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-neutral-600">
                        참조
                      </span>
                      <span className="text-sm text-neutral-900">
                        {transactionDetail.reference}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 관련 정보 */}
              {selectedTransaction?.related && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-neutral-900">
                    관련 정보
                  </h4>
                  <div className="from-primary-50 to-primary-100 rounded-xl bg-gradient-to-r p-4 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-neutral-600">
                          타입
                        </span>
                        <span className="text-sm text-neutral-900">
                          {selectedTransaction.related.type}
                        </span>
                      </div>
                      {selectedTransaction.related.id && (
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium text-neutral-600">
                            ID
                          </span>
                          <span className="text-sm text-neutral-900">
                            #{selectedTransaction.related.id}
                          </span>
                        </div>
                      )}
                      {selectedTransaction.related.summary && (
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium text-neutral-600">
                            요약
                          </span>
                          <span className="text-sm text-neutral-900">
                            {selectedTransaction.related.summary}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                <History className="h-6 w-6 text-neutral-400" />
              </div>
              <p className="text-neutral-600">
                거래 상세 정보를 불러올 수 없습니다.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-6">
            <Button
              variant="outline"
              onClick={() => setIsTransactionDetailOpen(false)}
              className="border-neutral-200 hover:bg-neutral-50"
            >
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 결제 상세 모달 */}
      <Dialog open={isPaymentDetailOpen} onOpenChange={setIsPaymentDetailOpen}>
        <DialogContent className="z-[9998] border-0 bg-white shadow-2xl sm:max-w-lg">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold text-neutral-900">
              결제 상세 내역
            </DialogTitle>
          </DialogHeader>

          {isLoadingPaymentDetail ? (
            <div className="py-8 text-center">
              <div className="border-primary-200 border-t-primary-600 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4"></div>
              <p className="text-sm text-neutral-600">
                결제 상세 정보를 불러오는 중...
              </p>
            </div>
          ) : paymentDetail ? (
            <div className="space-y-6">
              {/* 결제 기본 정보 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      selectedPayment?.status === 'SUCCESS'
                        ? 'bg-success-50 text-success-600'
                        : selectedPayment?.status === 'FAILED'
                          ? 'bg-error-50 text-error-600'
                          : 'bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    <span className="text-xl">
                      {selectedPayment?.status === 'SUCCESS'
                        ? '✅'
                        : selectedPayment?.status === 'FAILED'
                          ? '❌'
                          : '⏳'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedPayment?.status === 'SUCCESS'
                        ? '결제 성공'
                        : selectedPayment?.status === 'FAILED'
                          ? '결제 실패'
                          : '결제 진행중'}
                    </h3>
                    <p className="text-sm text-neutral-600">
                      결제 ID: #{selectedPayment?.paymentId}
                    </p>
                  </div>
                </div>

                {/* 결제 금액 */}
                <div className="from-primary-50 to-primary-100 rounded-2xl bg-gradient-to-r p-6 shadow-sm">
                  <div className="text-center">
                    <p className="mb-2 text-sm font-medium text-neutral-600">
                      결제 금액
                    </p>
                    <p className="text-primary-600 text-3xl font-bold">
                      +{selectedPayment && formatPrice(selectedPayment.amount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 상세 정보 */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-neutral-900">
                  결제 정보
                </h4>
                <div className="space-y-3 rounded-xl bg-neutral-50 p-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-neutral-600">
                      결제일시
                    </span>
                    <span className="text-sm text-neutral-900">
                      {selectedPayment && formatDate(selectedPayment.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-neutral-600">
                      결제 서비스
                    </span>
                    <span className="text-sm text-neutral-900">
                      {selectedPayment?.provider === 'toss'
                        ? '토스페이먼츠'
                        : selectedPayment?.provider === 'kakao'
                          ? '카카오페이'
                          : selectedPayment?.provider}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-neutral-600">
                      결제 수단
                    </span>
                    <span className="text-sm text-neutral-900">
                      {selectedPayment?.methodType}
                    </span>
                  </div>
                  {selectedPayment?.balanceAfter && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-neutral-600">
                        충전 후 잔액
                      </span>
                      <span className="text-primary-600 text-sm font-bold">
                        {selectedPayment &&
                          formatPrice(selectedPayment.balanceAfter)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 연결된 거래 정보 */}
              {selectedPayment?.cashTransactionId && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-neutral-900">
                    연결된 거래
                  </h4>
                  <div className="from-primary-50 to-primary-100 rounded-xl bg-gradient-to-r p-4 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-neutral-600">
                          거래 ID
                        </span>
                        <span className="text-sm text-neutral-900">
                          #{selectedPayment.cashTransactionId}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-neutral-600">
                          상태
                        </span>
                        <span className="text-sm text-neutral-900">
                          지갑 충전 완료
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                <CreditCard className="h-6 w-6 text-neutral-400" />
              </div>
              <p className="text-neutral-600">
                결제 상세 정보를 불러올 수 없습니다.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-6">
            <Button
              variant="outline"
              onClick={() => setIsPaymentDetailOpen(false)}
              className="border-neutral-200 hover:bg-neutral-50"
            >
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 결제수단 수동 추가 폼 */}
      {showAddForm && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <h3 className="text-lg font-semibold">결제수단 수동 추가</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 결제수단 타입 선택 */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    결제수단 타입
                  </label>
                  <select
                    value={addFormData.type}
                    onChange={(e) =>
                      setAddFormData((prev) => ({
                        ...prev,
                        type: e.target.value,
                      }))
                    }
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:outline-none"
                  >
                    <option value="card">카드</option>
                    <option value="bank">계좌</option>
                  </select>
                </div>

                {/* 별칭 */}
                <div>
                  <Input
                    label="별칭"
                    value={addFormData.alias}
                    onChange={(e) =>
                      setAddFormData((prev) => ({
                        ...prev,
                        alias: e.target.value,
                      }))
                    }
                    placeholder="예: 내 신용카드"
                  />
                </div>

                {/* 토큰 */}
                <div>
                  <Input
                    label="토큰"
                    value={addFormData.token}
                    onChange={(e) =>
                      setAddFormData((prev) => ({
                        ...prev,
                        token: e.target.value,
                      }))
                    }
                    placeholder="test_token_12345"
                  />
                </div>

                {/* 카드 정보 */}
                {addFormData.type === 'card' && (
                  <>
                    <div>
                      <Input
                        label="카드 브랜드"
                        value={addFormData.brand}
                        onChange={(e) =>
                          setAddFormData((prev) => ({
                            ...prev,
                            brand: e.target.value,
                          }))
                        }
                        placeholder="예: visa, mastercard"
                      />
                    </div>
                    <div>
                      <Input
                        label="카드 번호 마지막 4자리"
                        value={addFormData.last4}
                        onChange={(e) =>
                          setAddFormData((prev) => ({
                            ...prev,
                            last4: e.target.value,
                          }))
                        }
                        placeholder="1234"
                        maxLength={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="만료 월"
                          type="number"
                          value={addFormData.expMonth}
                          onChange={(e) =>
                            setAddFormData((prev) => ({
                              ...prev,
                              expMonth: e.target.value,
                            }))
                          }
                          placeholder="12"
                          min="1"
                          max="12"
                        />
                      </div>
                      <div>
                        <Input
                          label="만료 년도"
                          type="number"
                          value={addFormData.expYear}
                          onChange={(e) =>
                            setAddFormData((prev) => ({
                              ...prev,
                              expYear: e.target.value,
                            }))
                          }
                          placeholder="2025"
                          min="2024"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* 계좌 정보 */}
                {addFormData.type === 'bank' && (
                  <>
                    <div>
                      <Input
                        label="은행 코드"
                        value={addFormData.bankCode}
                        onChange={(e) =>
                          setAddFormData((prev) => ({
                            ...prev,
                            bankCode: e.target.value,
                          }))
                        }
                        placeholder="예: 001"
                      />
                    </div>
                    <div>
                      <Input
                        label="은행명"
                        value={addFormData.bankName}
                        onChange={(e) =>
                          setAddFormData((prev) => ({
                            ...prev,
                            bankName: e.target.value,
                          }))
                        }
                        placeholder="예: 국민은행"
                      />
                    </div>
                    <div>
                      <Input
                        label="계좌 번호 마지막 4자리"
                        value={addFormData.acctLast4}
                        onChange={(e) =>
                          setAddFormData((prev) => ({
                            ...prev,
                            acctLast4: e.target.value,
                          }))
                        }
                        placeholder="5678"
                        maxLength={4}
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    disabled={isAdding}
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleAddPaymentMethodForm}
                    disabled={
                      isAdding || !addFormData.alias || !addFormData.token
                    }
                  >
                    {isAdding ? (
                      <div className="flex items-center">
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        추가 중...
                      </div>
                    ) : (
                      '추가'
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
