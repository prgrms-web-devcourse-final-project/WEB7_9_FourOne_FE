// 페이지네이션 관련 타입 정의

// 공통 페이지네이션 응답 구조
export interface PageDto<T> {
  content: T[]
  pageable: PageableDto
}

export interface PageableDto {
  currentPage: number
  pageSize: number
  totalPages: number
  totalElements: number
  hasNext: boolean
  hasPrevious: boolean
}

// API 응답 래퍼
export interface PaginatedApiResponse<T> {
  resultCode: string
  msg: string
  data: PageDto<T>
}

// 페이지네이션 파라미터
export interface PaginationParams {
  page?: number
  size?: number
}

// 페이지네이션 상태
export interface PaginationState {
  currentPage: number
  pageSize: number
  totalPages: number
  totalElements: number
  hasNext: boolean
  hasPrevious: boolean
  isLoading: boolean
  error: string | null
}

// 페이지네이션 액션
export type PaginationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DATA'; payload: { data: any[]; pageable: PageableDto } }
  | { type: 'GO_TO_PAGE'; payload: number }
  | { type: 'SET_PAGE_SIZE'; payload: number }
  | { type: 'RESET' }

// 무한 스크롤 상태
export interface InfiniteScrollState<T> {
  data: T[]
  currentPage: number
  hasMore: boolean
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
}

// 무한 스크롤 액션
export type InfiniteScrollAction<T> =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOADING_MORE'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIAL_DATA'; payload: { data: T[]; pageable: PageableDto } }
  | { type: 'APPEND_DATA'; payload: { data: T[]; pageable: PageableDto } }
  | { type: 'RESET' }
