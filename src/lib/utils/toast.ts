import { toast } from 'sonner'

/**
 * 에러 메시지를 토스트로 표시
 * @param message 에러 메시지
 * @param title 제목 (선택사항)
 */
export function showErrorToast(message: string, title?: string) {
  toast.error(title || '오류 발생', {
    description: message,
    duration: 5000,
  })
}

/**
 * 경고 메시지를 토스트로 표시
 * @param message 경고 메시지
 * @param title 제목 (선택사항)
 */
export function showWarningToast(message: string, title?: string) {
  toast.warning(title || '경고', {
    description: message,
    duration: 5000,
  })
}

/**
 * 정보 메시지를 토스트로 표시
 * @param message 정보 메시지
 * @param title 제목 (선택사항)
 */
export function showInfoToast(message: string, title?: string) {
  toast.info(title || '알림', {
    description: message,
    duration: 4000,
  })
}

/**
 * 성공 메시지를 토스트로 표시
 * @param message 성공 메시지
 * @param title 제목 (선택사항)
 */
export function showSuccessToast(message: string, title?: string) {
  toast.success(title || '성공', {
    description: message,
    duration: 3000,
  })
}

