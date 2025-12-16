'use client'

import { InfiniteScrollAction, InfiniteScrollState } from '@/types/pagination'
import { useCallback, useEffect, useReducer, useRef } from 'react'

// 무한 스크롤 리듀서
function infiniteScrollReducer<T>(
  state: InfiniteScrollState<T>,
  action: InfiniteScrollAction<T>,
): InfiniteScrollState<T> {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null }

    case 'SET_LOADING_MORE':
      return { ...state, isLoadingMore: action.payload }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isLoadingMore: false,
      }

    case 'SET_INITIAL_DATA':
      return {
        ...state,
        data: action.payload.data,
        currentPage: action.payload.pageable.currentPage,
        hasMore: action.payload.pageable.hasNext,
        isLoading: false,
        isLoadingMore: false,
        error: null,
      }

    case 'APPEND_DATA':
      return {
        ...state,
        data: [...state.data, ...action.payload.data],
        currentPage: action.payload.pageable.currentPage,
        hasMore: action.payload.pageable.hasNext,
        isLoadingMore: false,
        error: null,
      }

    case 'RESET':
      return {
        data: [],
        currentPage: 1,
        hasMore: true,
        isLoading: false,
        isLoadingMore: false,
        error: null,
      }

    default:
      return state
  }
}

// 초기 상태
const initialState: InfiniteScrollState<any> = {
  data: [],
  currentPage: 1,
  hasMore: true,
  isLoading: false,
  isLoadingMore: false,
  error: null,
}

// 무한 스크롤 훅
export function useInfiniteScroll<T>(
  apiCall: (params: { page: number; size: number }) => Promise<any>,
  options: {
    pageSize?: number
    autoLoad?: boolean
    onError?: (error: string) => void
    threshold?: number // 스크롤 임계값 (기본값: 100px)
  } = {},
) {
  const [state, dispatch] = useReducer(infiniteScrollReducer<T>, initialState)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // API 호출 함수
  const loadMore = useCallback(async () => {
    if (state.isLoadingMore || !state.hasMore) return

    try {
      dispatch({ type: 'SET_LOADING_MORE', payload: true })

      const nextPage = state.currentPage + 1
      const response = await apiCall({
        page: nextPage,
        size: options.pageSize || 20,
      })

      if (response.success && response.data) {
        let content, pageable

        // API 응답 구조에 따라 데이터 추출
        if (response.data.content && response.data.pageable) {
          // 표준 페이지네이션 응답 구조
          content = response.data.content
          pageable = response.data.pageable
        } else if (response.data.content && response.data.totalPages) {
          // 알림/입찰 API 구조
          content = response.data.content
          pageable = {
            currentPage: response.data.currentPage + 1,
            pageSize: response.data.pageSize,
            totalPages: response.data.totalPages,
            totalElements: response.data.totalElements,
            hasNext: response.data.currentPage + 1 < response.data.totalPages,
            hasPrevious: response.data.currentPage > 0,
          }
        } else if (Array.isArray(response.data)) {
          // 배열로 직접 반환되는 경우
          content = response.data
          pageable = {
            currentPage: nextPage,
            pageSize: options.pageSize || 20,
            totalPages: Math.ceil(
              response.data.length / (options.pageSize || 20),
            ),
            totalElements: response.data.length,
            hasNext: false,
            hasPrevious: nextPage > 1,
          }
        } else {
          // 기타 구조
          content =
            response.data.items ||
            response.data.notifications ||
            response.data.bids ||
            []
          pageable = {
            currentPage: nextPage,
            pageSize: options.pageSize || 20,
            totalPages: Math.ceil(
              (response.data.total || content.length) /
                (options.pageSize || 20),
            ),
            totalElements: response.data.total || content.length,
            hasNext: false,
            hasPrevious: nextPage > 1,
          }
        }

        if (state.data.length === 0) {
          // 첫 로드
          dispatch({
            type: 'SET_INITIAL_DATA',
            payload: { data: content, pageable },
          })
        } else {
          // 추가 로드
          dispatch({
            type: 'APPEND_DATA',
            payload: { data: content, pageable },
          })
        }
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
  }, [
    apiCall,
    state.currentPage,
    state.isLoadingMore,
    state.hasMore,
    state.data.length,
    options.pageSize,
    options.onError,
  ])

  // 초기 로드
  const loadInitial = useCallback(async () => {
    if (state.isLoading) return

    try {
      dispatch({ type: 'SET_LOADING', payload: true })

      const response = await apiCall({ page: 1, size: options.pageSize || 20 })

      if (response.success && response.data) {
        let content, pageable

        // API 응답 구조에 따라 데이터 추출
        if (response.data.content && response.data.pageable) {
          // 표준 페이지네이션 응답 구조
          content = response.data.content
          pageable = response.data.pageable
        } else if (response.data.content && response.data.totalPages) {
          // 알림/입찰 API 구조
          content = response.data.content
          pageable = {
            currentPage: response.data.currentPage + 1,
            pageSize: response.data.pageSize,
            totalPages: response.data.totalPages,
            totalElements: response.data.totalElements,
            hasNext: response.data.currentPage + 1 < response.data.totalPages,
            hasPrevious: response.data.currentPage > 0,
          }
        } else if (Array.isArray(response.data)) {
          // 배열로 직접 반환되는 경우
          content = response.data
          pageable = {
            currentPage: 1,
            pageSize: options.pageSize || 20,
            totalPages: Math.ceil(
              response.data.length / (options.pageSize || 20),
            ),
            totalElements: response.data.length,
            hasNext: false,
            hasPrevious: false,
          }
        } else {
          // 기타 구조
          content =
            response.data.items ||
            response.data.notifications ||
            response.data.bids ||
            []
          pageable = {
            currentPage: 1,
            pageSize: options.pageSize || 20,
            totalPages: Math.ceil(
              (response.data.total || content.length) /
                (options.pageSize || 20),
            ),
            totalElements: response.data.total || content.length,
            hasNext: false,
            hasPrevious: false,
          }
        }

        dispatch({
          type: 'SET_INITIAL_DATA',
          payload: { data: content, pageable },
        })
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
  }, [apiCall, state.isLoading, options.pageSize, options.onError])

  // Intersection Observer 설정
  useEffect(() => {
    if (!loadMoreRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && state.hasMore && !state.isLoadingMore) {
          loadMore()
        }
      },
      {
        rootMargin: `${options.threshold || 100}px`,
      },
    )

    observerRef.current.observe(loadMoreRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loadMore, state.hasMore, state.isLoadingMore, options.threshold])

  // 리셋
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  // 새로고침
  const refresh = useCallback(() => {
    reset()
    loadInitial()
  }, [reset, loadInitial])

  // 자동 로드 - apiCall이 변경될 때만 초기 로드
  useEffect(() => {
    if (
      options.autoLoad !== false &&
      state.data.length === 0 &&
      !state.isLoading
    ) {
      loadInitial()
    }
  }, [apiCall, options.autoLoad, options.pageSize, options.onError])

  return {
    // 상태
    data: state.data,
    currentPage: state.currentPage,
    hasMore: state.hasMore,
    isLoading: state.isLoading,
    isLoadingMore: state.isLoadingMore,
    error: state.error,

    // 액션
    loadMore,
    loadInitial,
    refresh,
    reset,

    // refs
    loadMoreRef,
  }
}
