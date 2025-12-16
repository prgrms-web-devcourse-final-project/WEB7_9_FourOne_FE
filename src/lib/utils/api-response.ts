// API 응답 처리 유틸리티 함수
// 새로운 백엔드 구조와 기존 구조 모두 지원

export interface NormalizedApiResponse<T = any> {
  data?: T
  success: boolean
  resultCode: string
  msg: string // 하위 호환성
  code?: string // 새로운 구조
  status?: number // 새로운 구조
  message?: string // 새로운 구조
}

/**
 * API 응답을 표준화하는 함수
 * 새로운 백엔드 구조: { code, status, message, data }
 * 기존 구조: { resultCode, msg, data }
 */
export function normalizeApiResponse<T>(response: any): NormalizedApiResponse<T> {
  // 새로운 응답 구조 지원: { code, status, message, data }
  if (response.code !== undefined || response.status !== undefined) {
    const code = String(response.code || '')
    const status = response.status || 0
    const success = status === 200 || code === '200' || code.startsWith('200')

    return {
      data: response.data,
      success,
      resultCode: code || String(status),
      msg: response.message || '', // 하위 호환성
      code: code,
      status: status,
      message: response.message || '',
    }
  }

  // 기존 응답 구조 지원 (하위 호환성): { resultCode, msg, data }
  const resultCode = String(response.resultCode || '')
  const success =
    resultCode === '200' ||
    resultCode === '200-1' ||
    resultCode === '200-2' ||
    resultCode === '201' ||
    resultCode.startsWith('200')

  return {
    data: response.data,
    success,
    resultCode: resultCode,
    msg: response.msg || '',
    // 새로운 구조 필드도 포함 (호환성)
    code: resultCode,
    status: success ? 200 : 400,
    message: response.msg || '',
  }
}

/**
 * API 응답에서 에러 메시지 추출
 * 백엔드 메시지를 우선 사용
 */
export function getErrorMessage(response: any, defaultMessage = '오류가 발생했습니다.'): string {
  // 새로운 구조: { code, status, message, data }
  if (response.message) {
    return response.message
  }

  // 기존 구조: { resultCode, msg, data }
  if (response.msg) {
    return response.msg
  }

  // Axios 에러 응답
  if (response.response?.data) {
    const data = response.response.data
    if (data.message) return data.message
    if (data.msg) return data.msg
    if (data.errorMessage) return data.errorMessage
  }

  return defaultMessage
}

/**
 * API 응답이 성공인지 확인
 */
export function isSuccessResponse(response: any): boolean {
  // 새로운 구조
  if (response.status !== undefined) {
    return response.status === 200
  }
  if (response.code !== undefined) {
    const code = String(response.code)
    return code === '200' || code.startsWith('200')
  }

  // 기존 구조
  if (response.resultCode !== undefined) {
    const resultCode = String(response.resultCode)
    return (
      resultCode === '200' ||
      resultCode === '200-1' ||
      resultCode === '200-2' ||
      resultCode === '201' ||
      resultCode.startsWith('200')
    )
  }

  return false
}

