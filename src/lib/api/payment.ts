/**
 * 결제 API 호출 모음 (스웨거 기반)
 *
 * 흐름:
 * 1. 카드 관리: getPaymentMethods → addPaymentMethod → deletePaymentMethod
 * 2. 결제 준비: preparePayment (winnerId로 paymentId 획득)
 * 3. 결제 생성: createPayment (winnerId, amount로 결제 생성)
 * 4. 결제 승인: confirmPayment (paymentId)
 * 5. 결제 실패: failPayment (paymentId, 실패 사유)
 */

import { apiClient } from './api-client'
import type { components } from '@/types/swagger-generated'

// ============ Types from Swagger ============

export type CardCompany =
  components['schemas']['RegisterCardRequest']['cardCompany']
export type PaymentStatus =
  components['schemas']['PaymentPrepareResponse']['status']

export interface CardResponse {
  id: number
  billingKey?: string
  cardCompany?: CardCompany
  cardNumberMasked?: string
  createdAt?: string
}

export interface RegisterCardRequest {
  billingKey: string
  cardCompany: CardCompany
  cardNumberMasked: string
  cardName: string
}

export interface PaymentPrepareRequest {
  winnerId: number
}

export interface PaymentPrepareResponse {
  paymentId: number
  status?: PaymentStatus
  autoPaid?: boolean
  toss?: {
    orderId?: string
    amount?: number
  }
}

// ============ Response Wrapper Types ============

interface RsData<T> {
  code?: string
  status?: number
  message?: string
  data?: T
}

interface CardResponseList {
  registerCardResponses?: CardResponse[]
}

// ============ API Calls ============

/**
 * 저장된 결제 수단(카드) 목록 조회
 * GET /api/v1/user/me/paymentMethods
 */
export async function getPaymentMethods(): Promise<CardResponse[]> {
  const response = await apiClient.get<RsData<CardResponseList>>(
    '/api/v1/user/me/paymentMethods',
  )
  return response.data.data?.registerCardResponses || []
}

/**
 * 결제 수단(카드) 등록
 * POST /api/v1/user/me/paymentMethods
 * - billingKey는 Toss 카드 등록 API에서 발급받은 값
 */
export async function addPaymentMethod(
  payload: RegisterCardRequest,
): Promise<CardResponse> {
  const response = await apiClient.post<RsData<CardResponse>>(
    '/api/v1/user/me/paymentMethods',
    payload,
  )
  if (!response.data.data) {
    throw new Error('카드 등록에 실패했습니다.')
  }
  return response.data.data
}

/**
 * 결제 수단(카드) 삭제
 * DELETE /api/v1/user/me/paymentMethods/{paymentMethodId}
 */
export async function deletePaymentMethod(
  paymentMethodId: number,
): Promise<void> {
  await apiClient.delete(`/api/v1/user/me/paymentMethods/${paymentMethodId}`)
}

/**
 * Toss authKey로 billingKey 발급 요청
 * POST /api/v1/toss/billing/issue (가정 - 실제 엔드포인트는 백엔드 확인 필요)
 */
export async function issueBillingKey(
  authKey: string,
  customerKey: string,
): Promise<CardResponse> {
  const response = await apiClient.post<RsData<CardResponse>>(
    '/api/v1/toss/billing/issue',
    {
      authKey,
      customerKey,
    },
  )
  if (!response.data.data) {
    throw new Error('billingKey 발급에 실패했습니다.')
  }
  return response.data.data
}

/**
 * 결제 준비 (낙찰자 기준으로 결제 정보 준비)
 * POST /payments/prepare
 * - winnerId를 전달하면 paymentId와 Toss 결제 정보를 반환
 */
export async function preparePayment(
  payload: PaymentPrepareRequest,
): Promise<PaymentPrepareResponse> {
  const response = await apiClient.post<RsData<PaymentPrepareResponse>>(
    '/payments/prepare',
    payload,
  )
  if (!response.data.data) {
    throw new Error('결제 준비에 실패했습니다.')
  }
  return response.data.data
}

/**
 * 결제 생성
 * POST /payments/create?winnerId={winnerId}&amount={amount}
 */
export async function createPayment(
  winnerId: number,
  amount: number,
): Promise<void> {
  if (!winnerId || !amount) {
    throw new Error(
      `결제 생성 실패: winnerId(${winnerId})와 amount(${amount})가 필요합니다.`,
    )
  }

  await apiClient.post('/payments/create', null, {
    params: { winnerId, amount },
  })
}

/**
 * 결제 승인 (confirm)
 * POST /settlements/confirm?paymentId={paymentId}
 * - Toss PaymentWidget에서 결제 완료 후 호출 (스웨거 기준)
 */
export async function confirmPayment(paymentId: number): Promise<void> {
  await apiClient.post('/settlements/confirm', null, {
    params: { paymentId },
  })
}

/**
 * 결제 실패 처리
 * POST /payments/{paymentId}/fail
 * - body에 실패 사유를 Map 형태로 전달
 */
export async function failPayment(
  paymentId: number,
  failReason: string,
): Promise<void> {
  await apiClient.post(`/payments/${paymentId}/fail`, {
    reason: failReason,
  })
}
