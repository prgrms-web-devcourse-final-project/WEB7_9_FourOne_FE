'use client'

import { PaginationAction, PaginationState } from '@/types/pagination'
import { useCallback, useEffect, useReducer, useState } from 'react'

// 페이지네이션 리듀서
function paginationReducer(
  state: PaginationState,
  action: PaginationAction,
): PaginationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null }

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }

    case 'SET_DATA':
      return {
        ...state,
        ...action.payload.pageable,
        isLoading: false,
        error: null,
      }

    case 'GO_TO_PAGE':
      return { ...state, currentPage: action.payload }

    case 'SET_PAGE_SIZE':
      return { ...state, pageSize: action.payload, currentPage: 1 }

    case 'RESET':
      return {
        currentPage: 1,
        pageSize: 20,
        totalPages: 0,
        totalElements: 0,
        hasNext: false,
        hasPrevious: false,
        isLoading: false,
        error: null,
      }

    default:
      return state
  }
}

// 초기 상태
const initialState: PaginationState = {
  currentPage: 1,
  pageSize: 20,
  totalPages: 0,
  totalElements: 0,
  hasNext: false,
  hasPrevious: false,
  isLoading: false,
  error: null,
}

// 페이지네이션 훅
export function usePagination<T>(
  apiCall: (params: { page: number; size: number }) => Promise<any>,
  options: {
    initialPageSize?: number
    autoLoad?: boolean
    onError?: (error: string) => void
  } = {},
) {
  const [state, dispatch] = useReducer(paginationReducer, {
    ...initialState,
    pageSize: options.initialPageSize || 20,
  })

  const [data, setData] = useState<T[]>([])

  // API 호출 함수
  const loadPage = useCallback(
    async (page: number, size: number = state.pageSize) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true })

        const response = await apiCall({ page, size })

        if (response.success && response.data) {
          let content, pageable

          // API 응답 구조에 따라 데이터 추출 (Swagger 우선)
          if (response.data.items && response.data.hasNext !== undefined) {
            // Swagger AuctionCursorResponse: { cursor, items, hasNext }
            content = response.data.items
            pageable = {
              currentPage: page,
              pageSize: size,
              totalPages: response.data.hasNext ? page + 1 : page,
              totalElements: (page - 1) * size + content.length,
              hasNext: response.data.hasNext || false,
              hasPrevious: page > 1,
            }
          } else if (response.data.content && response.data.pageable) {
            // 표준 페이지네이션 응답 구조 (content + pageable)
            content = response.data.content
            pageable = response.data.pageable
          } else if (
            response.data.content &&
            response.data.totalPages !== undefined
          ) {
            // 알림/입찰 API 구조 (content + 직접 페이지네이션 정보)
            content = response.data.content
            pageable = {
              currentPage: response.data.currentPage
                ? response.data.currentPage + 1
                : page,
              pageSize: response.data.pageSize || size,
              totalPages: response.data.totalPages,
              totalElements: response.data.totalElements,
              hasNext:
                response.data.currentPage !== undefined
                  ? response.data.currentPage + 1 < response.data.totalPages
                  : response.data.hasNext || false,
              hasPrevious:
                response.data.currentPage !== undefined
                  ? response.data.currentPage > 0
                  : page > 1,
            }
          } else if (Array.isArray(response.data)) {
            // 배열로 직접 반환되는 경우
            content = response.data
            pageable = {
              currentPage: page,
              pageSize: size,
              totalPages: Math.ceil(response.data.length / size),
              totalElements: response.data.length,
              hasNext: false,
              hasPrevious: page > 1,
            }
          } else {
            // 기타 구조
            content = response.data.notifications || response.data.bids || []
            pageable = {
              currentPage: page,
              pageSize: size,
              totalPages: Math.ceil(
                (response.data.total || content.length) / size,
              ),
              totalElements: response.data.total || content.length,
              hasNext: false,
              hasPrevious: page > 1,
            }
          }

          console.log('📄 페이지네이션 데이터 처리:', { content, pageable })
          setData(content)
          dispatch({ type: 'SET_DATA', payload: { data: content, pageable } })
        } else {
          const errorMsg = response.msg || '데이터를 불러오는데 실패했습니다.'
          dispatch({ type: 'SET_ERROR', payload: errorMsg })
          options.onError?.(errorMsg)
        }
      } catch (error: any) {
        const errorMsg =
          error.response?.data?.msg || '데이터를 불러오는데 실패했습니다.'
        dispatch({ type: 'SET_ERROR', payload: errorMsg })
        options.onError?.(errorMsg)
      }
    },
    [apiCall, state.pageSize, options.onError],
  )

  // 다음 페이지로 이동
  const nextPage = useCallback(() => {
    if (state.hasNext && !state.isLoading) {
      const nextPageNum = state.currentPage + 1
      dispatch({ type: 'GO_TO_PAGE', payload: nextPageNum })
      loadPage(nextPageNum)
    }
  }, [state.hasNext, state.currentPage, state.isLoading, loadPage])

  // 이전 페이지로 이동
  const previousPage = useCallback(() => {
    if (state.hasPrevious && !state.isLoading) {
      const prevPageNum = state.currentPage - 1
      dispatch({ type: 'GO_TO_PAGE', payload: prevPageNum })
      loadPage(prevPageNum)
    }
  }, [state.hasPrevious, state.currentPage, state.isLoading, loadPage])

  // 특정 페이지로 이동
  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= state.totalPages && !state.isLoading) {
        dispatch({ type: 'GO_TO_PAGE', payload: page })
        loadPage(page)
      }
    },
    [state.totalPages, state.isLoading, loadPage],
  )

  // 페이지 크기 변경
  const setPageSize = useCallback(
    (size: number) => {
      dispatch({ type: 'SET_PAGE_SIZE', payload: size })
      loadPage(1, size)
    },
    [loadPage],
  )

  // 새로고침
  const refresh = useCallback(() => {
    loadPage(state.currentPage, state.pageSize)
  }, [loadPage, state.currentPage, state.pageSize])

  // 리셋
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
    setData([])
  }, [])

  // 자동 로드 - apiCall이 변경될 때만 초기 로드
  useEffect(() => {
    if (
      options.autoLoad !== false &&
      state.currentPage === 1 &&
      state.totalPages === 0
    ) {
      loadPage(1, state.pageSize)
    }
  }, [apiCall, state.pageSize, options.autoLoad, options.onError])

  return {
    // 상태
    data,
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    totalPages: state.totalPages,
    totalElements: state.totalElements,
    hasNext: state.hasNext,
    hasPrevious: state.hasPrevious,
    isLoading: state.isLoading,
    error: state.error,

    // 액션
    loadPage,
    nextPage,
    previousPage,
    goToPage,
    setPageSize,
    refresh,
    reset,
  }
}
