'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ErrorAlert } from '@/components/ui/error-alert'
import { Input } from '@/components/ui/input'
import { paymentMethodApi } from '@/lib/api'
import { CreditCard, Edit3, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface PaymentMethod {
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

export function PaymentMethodClient() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
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

  // 결제 수단 목록 로드
  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        setIsLoading(true)
        setError('')

        const response = await paymentMethodApi.getPaymentMethods()
        console.log('💳 결제수단 목록 응답:', response)

        if (response.success && response.data) {
          // API 응답 데이터 구조에 맞게 변환
          let paymentMethodsData = []
          if (Array.isArray(response.data)) {
            paymentMethodsData = response.data
          } else if (
            response.data.content &&
            Array.isArray(response.data.content)
          ) {
            paymentMethodsData = response.data.content
          }
          setPaymentMethods(paymentMethodsData)
        } else {
          setError(response.msg || '결제 수단을 불러오는데 실패했습니다.')
        }
      } catch (err: any) {
        console.error('결제 수단 로드 에러:', err)
        setError(
          err.response?.data?.msg || '결제 수단을 불러오는데 실패했습니다.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadPaymentMethods()
  }, [])

  // 결제 수단 삭제
  const handleDelete = async (id: number) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
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

  // 결제수단 추가
  const handleAddPaymentMethod = async () => {
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
  const startEdit = (paymentMethod: PaymentMethod) => {
    setEditingId(paymentMethod.id)
    setEditFormData({
      alias: paymentMethod.alias,
      isDefault: paymentMethod.isDefault,
    })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6">
          <ErrorAlert
            title="결제 수단 로드 실패"
            message={error}
            onClose={() => setError('')}
          />
        </div>
      )}

      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            결제 수단 관리
          </h1>
          <p className="mt-2 text-neutral-600">
            등록된 결제 수단을 관리하고 새로운 결제 수단을 추가할 수 있습니다.
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          결제 수단 추가
        </Button>
      </div>

      {/* 결제 수단 목록 */}
      <div className="space-y-4">
        {isLoading ? (
          <Card variant="outlined">
            <CardContent className="py-12 text-center">
              <div className="border-primary-200 border-t-primary-600 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4"></div>
              <h3 className="text-lg font-semibold text-neutral-900">
                결제 수단을 불러오는 중...
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
                  등록된 결제 수단이 없습니다
                </h3>
                <p className="text-neutral-600">
                  새로운 결제 수단을 추가해보세요.
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
                            <div className="flex items-center justify-between">
                              <span>만료일:</span>
                              <span>
                                {method.expMonth}/{method.expYear}
                              </span>
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
                          <span>등록일:</span>
                          <span>{formatDate(method.createDate)}</span>
                        </div>
                        {method.expireDate && (
                          <div className="flex items-center justify-between">
                            <span>만료일:</span>
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
                          <Edit3 className="mr-1 h-3 w-3" />
                          수정
                        </Button>
                        {!method.isDefault && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(method.id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
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

      {/* 결제 수단 추가 폼 */}
      {showAddForm && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <h3 className="text-lg font-semibold">결제 수단 추가</h3>
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
                    onClick={handleAddPaymentMethod}
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
