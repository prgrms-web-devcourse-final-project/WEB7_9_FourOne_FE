'use client'

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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { bidApi, productApi, auctionApi } from '@/lib/api'
import { handleApiError } from '@/lib/api/common'
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from '@/lib/utils/toast'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { components } from '@/types/swagger-generated'

type AuctionDetailResponse = components['schemas']['AuctionDetailResponse']
type ProductQnAResponse = components['schemas']['ProductQnAResponse']
type ProductQnAListResponse = components['schemas']['ProductQnAListResponse']
type ProductQnaCreateResponse =
  components['schemas']['ProductQnaCreateResponse']
type ProductQnAAnswerResponse =
  components['schemas']['ProductQnAAnswerResponse']
type AuctionBidUpdate = components['schemas']['AuctionBidUpdate']
type BidHistoryResponse = components['schemas']['BidHistoryResponse']
type BidViewMode = 'latest' | 'all'

interface AuctionDetailClientProps {
  auctionData: AuctionDetailResponse
}

export function AuctionDetailClient({ auctionData }: AuctionDetailClientProps) {
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const [isBookmarked, setIsBookmarked] = useState(
    auctionData.isBookmarked || false,
  )
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false)
  const [bidAmount, setBidAmount] = useState('')
  const [isBidLoading, setIsBidLoading] = useState(false)
  const [qnaList, setQnaList] = useState<ProductQnAResponse[]>([])
  const [isQnaLoading, setIsQnaLoading] = useState(false)
  const [qnaQuestion, setQnaQuestion] = useState('')
  const [isQnaSubmitting, setIsQnaSubmitting] = useState(false)

  // 최고 입찰가 상태
  const [currentHighestBid, setCurrentHighestBid] = useState<number>(
    auctionData.currentHighestBid || 0,
  )
  const [highestBidder, setHighestBidder] = useState<string | undefined>(
    auctionData.bidHistory?.[0]?.bidder,
  )
  const [isHighestBidLoading, setIsHighestBidLoading] = useState(false)
  const [lastHighestBidSync, setLastHighestBidSync] = useState<string | null>(
    null,
  )

  // SSE 연결 상태
  const [sseConnectionStatus, setSseConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected'
  >('disconnected')
  const [sseReconnectAttempts, setSseReconnectAttempts] = useState(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 다음 최소 입찰가 (자동 계산)
  const [nextMinBidPrice, setNextMinBidPrice] = useState<number>(0)

  // 입찰 이력 상태
  const [bidHistory, setBidHistory] = useState<BidHistoryResponse[]>(
    auctionData.bidHistory || [],
  )
  const [isBidHistoryLoading, setIsBidHistoryLoading] = useState(false)
  const [bidViewMode, setBidViewMode] = useState<BidViewMode>('latest')
  const [bidHistoryPage, setBidHistoryPage] = useState(0)
  const [bidHistoryTotalPages, setBidHistoryTotalPages] = useState(0)
  const [bidHistoryTotalElements, setBidHistoryTotalElements] = useState(0)
  const [bidHistoryIsLast, setBidHistoryIsLast] = useState(false)
  const [bidHistoryIsFirst, setBidHistoryIsFirst] = useState(true)
  const [remainingSeconds, setRemainingSeconds] = useState(
    auctionData.remainingTimeSeconds || 0,
  )
  const [isBuyNowLoading, setIsBuyNowLoading] = useState(false)
  const [showBuyNowDialog, setShowBuyNowDialog] = useState(false)
  const [auctionEnded, setAuctionEnded] = useState(false)

  const bidStreamRef = useRef<EventSource | null>(null)

  // QnA 데이터 로드
  useEffect(() => {
    if (auctionData.productId) {
      loadQna()
    }
  }, [auctionData.productId])

  // 입찰 이력 로드
  useEffect(() => {
    if (auctionData.auctionId) {
      loadBidList()
    }
  }, [auctionData.auctionId])

  // 최고 입찰가 초기 동기화
  useEffect(() => {
    if (auctionData.auctionId) {
      refreshHighestBid(false)
    }
  }, [auctionData.auctionId])

  const loadBidList = async (size = 10) => {
    if (!auctionData.auctionId) return
    setIsBidHistoryLoading(true)
    try {
      const response = await auctionApi.getBidList(auctionData.auctionId, {
        size,
      })
      if (Array.isArray(response.data)) {
        setBidHistory(response.data)
      } else if (
        response.data?.content &&
        Array.isArray(response.data.content)
      ) {
        // 호환성: 기존 페이지 응답 형태도 수용
        setBidHistory(response.data.content)
      }
      setBidHistoryTotalElements(
        Array.isArray(response.data)
          ? response.data.length
          : response.data?.totalElements || 0,
      )
    } catch (error: any) {
      const apiError = handleApiError(error)
      console.error('입찰 이력 로드 실패:', apiError.message)
    } finally {
      setIsBidHistoryLoading(false)
    }
  }

  const loadBidHistory = async (page: number, size = 10) => {
    if (!auctionData.auctionId) return
    setIsBidHistoryLoading(true)
    try {
      const response = await auctionApi.getBidHistory(auctionData.auctionId, {
        page,
        size,
        sort: 'createdAt,desc',
      } as any)
      if (response.data?.content) {
        setBidHistory(response.data.content)
        setBidHistoryPage(response.data.number || 0)
        setBidHistoryTotalPages(response.data.totalPages || 0)
        setBidHistoryTotalElements(response.data.totalElements || 0)
        setBidHistoryIsLast(response.data.last ?? false)
        setBidHistoryIsFirst(response.data.first ?? false)
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      console.error('입찰 이력 로드 실패:', apiError.message)
    } finally {
      setIsBidHistoryLoading(false)
    }
  }

  // 다음 최소 입찰가 자동 계산
  useEffect(() => {
    const minBidStep = auctionData.minBidStep || 1000
    const nextMin =
      currentHighestBid > 0
        ? currentHighestBid + minBidStep
        : (auctionData.startPrice || 0) + minBidStep
    setNextMinBidPrice(nextMin)
  }, [currentHighestBid, auctionData.minBidStep, auctionData.startPrice])

  // SSE 실시간 최고가 스트림 구독 (백엔드 직접 연결 + 재연결 로직)
  useEffect(() => {
    if (!auctionData.auctionId) {
      console.log('[SSE] auctionId 없음, SSE 연결 안 함')
      return
    }

    console.log(
      '[SSE] 경매 상태:',
      auctionData.status,
      '| auctionId:',
      auctionData.auctionId,
    )

    let es: EventSource | null = null
    const maxReconnectAttempts = 10 // 재연결 횟수 증가
    const baseReconnectDelay = 3000 // 3초

    const connectSSE = () => {
      if (es) {
        es.close()
      }

      setSseConnectionStatus('connecting')
      const sseUrl = `/api/sse/${auctionData.auctionId}`
      console.log('[SSE] 연결 시도:', sseUrl)
      console.log('[SSE] 인증 없이 연결 (withCredentials: false)')

      // 동일 도메인 프록시를 통해 CORS 403 회피
      es = new EventSource(sseUrl)
      console.log('[SSE] EventSource 객체 생성됨:', {
        url: es.url,
        readyState: es.readyState,
        withCredentials: es.withCredentials,
      })
      bidStreamRef.current = es

      // 1. 연결 성공 (open 이벤트)
      es.onopen = () => {
        console.log('[SSE] ✅ 연결 성공 (onopen) - 스트림 열림')
        ;(es as any).__connectTime = Date.now()
        setSseConnectionStatus('connected')
        setSseReconnectAttempts(0)

        // 폴링 중지
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
      }

      // 2. connect 이벤트 수신 (백엔드 초기 메시지)
      es.addEventListener('connect', (event) => {
        console.log('[SSE] 🔗 connect 이벤트 수신:', event.data)
        console.log('[SSE] 연결 유지 중... 입찰 이벤트 대기')
      })

      // 3. highestPrice 이벤트 수신 (백엔드에서 특정 이벤트 타입으로 전송하는 경우)
      es.addEventListener('highestPrice', (event) => {
        try {
          const price = Number(event.data)
          console.log('[SSE] 💰 highestPrice 이벤트 수신:', price)

          if (!isNaN(price) && price > 0) {
            setCurrentHighestBid(price)
            setLastHighestBidSync(new Date().toISOString())
          }
        } catch (err) {
          console.error('[SSE] highestPrice 파싱 에러:', err)
        }
      })

      // 4. 기본 message 이벤트 수신 (JSON 형태)
      es.onmessage = (event) => {
        try {
          // JSON 파싱 시도
          const payload = JSON.parse(event.data) as AuctionBidUpdate
          console.log('[SSE] 📨 기본 메시지 수신:', payload)

          if (payload.currentHighestBid !== undefined) {
            setCurrentHighestBid(payload.currentHighestBid)
          }
          if (payload.bidderNickname) {
            setHighestBidder(payload.bidderNickname)
          }
          setLastHighestBidSync(new Date().toISOString())
        } catch {
          // 숫자만 오는 경우 처리
          const price = Number(event.data)
          if (!isNaN(price) && price > 0) {
            console.log('[SSE] 📨 숫자 형태 수신:', price)
            setCurrentHighestBid(price)
            setLastHighestBidSync(new Date().toISOString())
          } else {
            console.log('[SSE] 📨 알 수 없는 메시지:', event.data)
          }
        }
      }

      // 5. 에러 및 재연결 로직 (백엔드 60초 타임아웃 대응)
      es.onerror = (error) => {
        const now = Date.now()
        const timeSinceConnect = bidStreamRef.current
          ? now - (bidStreamRef.current as any).__connectTime || 0
          : 0

        console.error('[SSE] ❌ 연결 에러 (백엔드가 60초 후 끊을 수 있음)', {
          readyState: es?.readyState,
          연결유지시간: `${Math.round(timeSinceConnect / 1000)}초`,
          error,
        })
        setSseConnectionStatus('disconnected')

        if (es) {
          es.close()
          bidStreamRef.current = null
        }

        // 백엔드 타임아웃 대응: 계속 재연결
        if (sseReconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(
            baseReconnectDelay * Math.pow(1.5, sseReconnectAttempts),
            30000,
          ) // 최대 30초
          console.log(
            `[SSE] ${delay}ms 후 재연결 시도 (${sseReconnectAttempts + 1}/${maxReconnectAttempts})`,
          )

          reconnectTimeoutRef.current = setTimeout(() => {
            setSseReconnectAttempts((prev) => prev + 1)
            connectSSE()
          }, delay)
        } else {
          console.log('[SSE] 최대 재연결 횟수 초과, 폴링으로 전환')
          // SSE 실패 시 폴링 fallback
          startPollingFallback()
        }
      }
    }

    // 폴링 fallback (SSE 실패 시)
    const startPollingFallback = () => {
      console.log('[Polling] SSE 실패로 폴링 시작 (5초 간격)')

      if (pollingIntervalRef.current) return // 이미 폴링 중

      pollingIntervalRef.current = setInterval(async () => {
        try {
          await refreshHighestBid(false)
        } catch (err) {
          console.error('[Polling] 최고가 조회 실패:', err)
        }
      }, 5000) // 5초마다 폴링
    }

    // SSE 연결 시작
    connectSSE()

    // 클린업
    return () => {
      console.log('[SSE] 클린업 - 연결 종료')

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }

      if (es) {
        es.close()
        bidStreamRef.current = null
      }

      setSseConnectionStatus('disconnected')
    }
  }, [auctionData.auctionId, auctionData.status, sseReconnectAttempts])

  const refreshHighestBid = async (showErrorToastOnFail = true) => {
    if (!auctionData.auctionId) return
    setIsHighestBidLoading(true)
    try {
      const response = await auctionApi.getHighestBid(auctionData.auctionId)
      if (response.data) {
        const payload = response.data as AuctionBidUpdate
        setCurrentHighestBid(payload.currentHighestBid || 0)
        setHighestBidder(payload.bidderNickname || undefined)
        setLastHighestBidSync(new Date().toISOString())
      } else if (showErrorToastOnFail) {
        showErrorToast('최고 입찰가 정보를 불러오지 못했습니다.')
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      if (showErrorToastOnFail) {
        showErrorToast(apiError.message)
      }
      console.error('최고 입찰가 조회 실패:', apiError.message)
    } finally {
      setIsHighestBidLoading(false)
    }
  }

  const loadQna = async () => {
    if (!auctionData.productId) return
    setIsQnaLoading(true)
    try {
      const response = await productApi.getQna(auctionData.productId, {
        page: 0,
        size: 50,
      })
      if (response.data?.productQnAResponses) {
        setQnaList(response.data.productQnAResponses)
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      console.error('QnA 로드 실패:', apiError.message)
    } finally {
      setIsQnaLoading(false)
    }
  }

  const handleAddQuestion = async () => {
    if (!isLoggedIn) {
      showInfoToast('로그인이 필요합니다.')
      router.push('/login')
      return
    }
    if (!qnaQuestion.trim()) {
      showInfoToast('질문을 입력해주세요.')
      return
    }
    if (!auctionData.productId) {
      showErrorToast('상품 정보를 찾을 수 없습니다.')
      return
    }

    setIsQnaSubmitting(true)
    try {
      const response = await productApi.addQna(
        auctionData.productId,
        qnaQuestion,
      )
      if (response.success) {
        showSuccessToast('질문이 등록되었습니다.')
        setQnaQuestion('')
        await loadQna()
      } else {
        showErrorToast(response.message || '질문 등록에 실패했습니다.')
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
    } finally {
      setIsQnaSubmitting(false)
    }
  }

  const handleBookmarkToggle = async () => {
    if (!isLoggedIn) {
      showInfoToast('로그인이 필요합니다.')
      router.push('/login')
      return
    }
    if (!auctionData.productId) {
      showErrorToast('상품 정보를 찾을 수 없습니다.')
      return
    }

    setIsBookmarkLoading(true)
    try {
      if (isBookmarked) {
        // 북마크 제거
        const response = await productApi.deleteBookmark(auctionData.productId)
        if (response.success) {
          setIsBookmarked(false)
          showSuccessToast('찜 목록에서 제거되었습니다.')
        } else {
          showErrorToast(response.message || '찜 제거에 실패했습니다.')
        }
      } else {
        // 북마크 추가
        const response = await productApi.addBookmark(auctionData.productId)
        if (response.success) {
          setIsBookmarked(true)
          showSuccessToast('찜 목록에 추가되었습니다.')
        } else {
          showErrorToast(response.message || '찜 추가에 실패했습니다.')
        }
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
      // 에러 발생 시 상태 되돌리지 않음 (요청 자체가 실패했으므로)
    } finally {
      setIsBookmarkLoading(false)
    }
  }

  const handlePlaceBid = async () => {
    if (!isLoggedIn) {
      showInfoToast('로그인이 필요합니다.')
      router.push('/login')
      return
    }
    if (!isLive) {
      showInfoToast('경매 시작 후에 입찰할 수 있습니다.')
      return
    }
    if (!bidAmount.trim()) {
      showInfoToast('입찰 금액을 입력해주세요.')
      return
    }
    const amount = parseInt(bidAmount)
    if (isNaN(amount) || amount <= 0) {
      showErrorToast('유효한 금액을 입력해주세요.')
      return
    }
    const requiredMinBid = currentHighestBid + (auctionData.minBidStep ?? 0)
    if (amount < requiredMinBid) {
      showErrorToast(
        `${requiredMinBid.toLocaleString()}원 이상으로 입찰해주세요.`,
      )
      return
    }

    setIsBidLoading(true)
    try {
      const response = await bidApi.createBid(auctionData.auctionId!, {
        bidAmount: amount,
      })
      if (response.success) {
        showSuccessToast('입찰이 완료되었습니다.')
        setBidAmount('')
        // 입찰 성공 시 최신 데이터 새로고침
        if (bidViewMode === 'all') {
          await Promise.all([
            refreshHighestBid(false),
            loadBidHistory(bidHistoryPage),
            loadBidList(),
          ])
        } else {
          await Promise.all([refreshHighestBid(false), loadBidList()])
        }
      } else {
        showErrorToast(response.message || '입찰에 실패했습니다.')
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
    } finally {
      setIsBidLoading(false)
    }
  }

  const handleBuyNow = async () => {
    if (!isLoggedIn) {
      showInfoToast('로그인이 필요합니다.')
      router.push('/login')
      return
    }
    if (!isLive) {
      showInfoToast('경매 시작 후에 이용 가능합니다.')
      return
    }
    if (!auctionData.auctionId || !auctionData.buyNowPrice) {
      showErrorToast('상품 정보를 찾을 수 없습니다.')
      return
    }

    setShowBuyNowDialog(true)
  }

  const confirmBuyNow = async () => {
    setShowBuyNowDialog(false)
    if (!auctionData.auctionId || !auctionData.buyNowPrice) return

    setIsBuyNowLoading(true)
    try {
      const response = await auctionApi.buyNow(auctionData.auctionId, {
        bidAmount: auctionData.buyNowPrice,
      })

      if (response.success) {
        showSuccessToast('확정되었습니다! 입찰 현황에서 결제를 진행해주세요.')

        // SSE 연결 종료
        if (bidStreamRef.current) {
          bidStreamRef.current.close()
          bidStreamRef.current = null
        }

        // 경매 종료 상태 설정
        setAuctionEnded(true)

        // 상세 정보 재조회
        router.refresh()
      } else {
        const message = response.message || '즉시 구매에 실패했습니다.'
        showErrorToast(message)
        // 실패 시 상세 재조회로 최신 상태 확인
        if (message.includes('종료') || message.includes('LIVE')) {
          router.refresh()
        }
      }
    } catch (error: any) {
      const apiError = handleApiError(error)
      showErrorToast(apiError.message)
      // 에러 발생 시에도 상태 동기화
      if (
        apiError.message.includes('401') ||
        apiError.message.includes('403')
      ) {
        showInfoToast('다시 로그인해주세요.')
        router.push('/login')
      } else {
        router.refresh()
      }
    } finally {
      setIsBuyNowLoading(false)
    }
  }

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return '-'
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
  }

  // KST-normalized date helpers (treat no-offset timestamps as KST)
  const toKstDate = (dateString: string | undefined) => {
    if (!dateString) return null
    const base = dateString.replace(' ', 'T')
    const hasOffset = /([+-]\d{2}:?\d{2}|Z)$/.test(base)
    const normalized = hasOffset ? base : `${base}Z`
    const date = new Date(normalized)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const formatDateTime = (dateString: string | undefined) => {
    const date = toKstDate(dateString)
    if (!date) return '-'
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Seoul',
    }).format(date)
  }

  const formatDateOnly = (dateString: string | undefined) => {
    const date = toKstDate(dateString)
    if (!date) return ''
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Seoul',
    }).format(date)
  }

  const formatBidTime = (dateString: string | undefined) => {
    const date = toKstDate(dateString)
    if (!date) return ''
    return new Intl.DateTimeFormat('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Seoul',
    }).format(date)
  }

  const formatRemainingTime = (remainingSeconds: number | undefined) => {
    if (remainingSeconds === undefined || remainingSeconds <= 0)
      return '경매 종료'
    const hours = Math.floor(remainingSeconds / 3600)
    const minutes = Math.floor((remainingSeconds % 3600) / 60)
    const seconds = remainingSeconds % 60
    return `${hours}시간 ${minutes}분 ${seconds}초`
  }

  const status = auctionData.status
  const isLive = status === 'LIVE' || status === '진행 중'
  const isScheduled = status === 'SCHEDULED' || status === '예정'
  const isEnded = status === 'ENDED' || status === '종료'

  const requiredMinBidAmount = currentHighestBid + (auctionData.minBidStep ?? 0)

  const isHighestBid = (bid: BidHistoryResponse) => {
    if (bid.bidAmount === undefined) return false
    return bid.bidAmount === currentHighestBid
  }

  // live ticking for remaining time
  useEffect(() => {
    // remainingTimeSeconds는 서버에서 end 기준; 시작 전이면 start까지 남은 시간으로 대체
    const now = Date.now()
    const startMs = toKstDate(auctionData.startAt)?.getTime() || 0
    const endMs = toKstDate(auctionData.endAt)?.getTime() || 0
    if (isScheduled && startMs > now) {
      setRemainingSeconds(Math.max(0, Math.floor((startMs - now) / 1000)))
    } else {
      setRemainingSeconds(auctionData.remainingTimeSeconds || 0)
    }
  }, [
    auctionData.remainingTimeSeconds,
    auctionData.startAt,
    auctionData.endAt,
    isScheduled,
  ])

  useEffect(() => {
    if (remainingSeconds <= 0) return
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [remainingSeconds])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* 이미지 섹션 */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="relative p-0">
              <div className="relative bg-neutral-100">
                {auctionData.imageUrls && auctionData.imageUrls.length > 0 ? (
                  <img
                    src={auctionData.imageUrls[0]}
                    alt={auctionData.name}
                    className="h-auto w-full object-cover"
                  />
                ) : (
                  <div className="flex h-96 w-full items-center justify-center">
                    <div className="text-center">
                      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 shadow-lg">
                        <svg
                          className="text-primary-600 h-8 w-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-neutral-500">
                        이미지 준비중
                      </span>
                    </div>
                  </div>
                )}

                {/* 북마크 버튼 - 이미지 우상단 */}
                <button
                  onClick={handleBookmarkToggle}
                  disabled={isBookmarkLoading}
                  className="absolute top-4 right-4 rounded-full bg-white p-2 shadow-lg hover:shadow-xl disabled:opacity-50"
                  aria-label={isBookmarked ? '찜 제거' : '찜 추가'}
                >
                  <Heart
                    className={`h-6 w-6 transition-colors ${
                      isBookmarked
                        ? 'fill-red-500 text-red-500'
                        : 'text-neutral-400'
                    }`}
                  />
                </button>
              </div>

              {/* 추가 이미지들 */}
              {auctionData.imageUrls && auctionData.imageUrls.length > 1 && (
                <div className="grid grid-cols-4 gap-2 border-t border-neutral-200 p-4">
                  {auctionData.imageUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`${auctionData.name} ${idx + 1}`}
                      className="aspect-square rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 정보 섹션 */}
        <div className="space-y-4 lg:col-span-1">
          {/* 카테고리 배지 */}
          <div className="flex gap-2">
            <Badge className="bg-primary-500 text-white">
              {auctionData.category}
            </Badge>
            <Badge>{auctionData.subCategory}</Badge>
          </div>

          {/* 제목 */}
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              {auctionData.name}
            </h1>
          </div>

          {/* 설명 */}
          {auctionData.description && (
            <p className="text-sm leading-relaxed text-neutral-600">
              {auctionData.description}
            </p>
          )}

          {/* 가격 정보 */}
          <Card className="border border-neutral-200 bg-white">
            <CardContent className="space-y-3 p-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-neutral-500">
                        현재 최고 입찰가
                      </p>
                      {sseConnectionStatus === 'connected' && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500"></span>
                        </span>
                      )}
                    </div>
                    <p className="text-primary-600 text-2xl font-bold">
                      {formatPrice(currentHighestBid)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refreshHighestBid(true)}
                    disabled={isHighestBidLoading}
                    className="h-auto px-2 py-1 text-xs text-neutral-600 hover:text-neutral-900"
                  >
                    {isHighestBidLoading ? '갱신 중...' : '새로고침'}
                  </Button>
                </div>
                {highestBidder && (
                  <p className="mt-1 text-xs text-neutral-500">
                    최고 입찰자: {highestBidder}
                  </p>
                )}
                {lastHighestBidSync && (
                  <p className="text-[11px] text-neutral-400">
                    {formatBidTime(lastHighestBidSync)} 기준
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">시작가</p>
                <p className="text-lg font-semibold text-neutral-700">
                  {formatPrice(auctionData.startPrice)}
                </p>
              </div>
              <div className="border-primary-100 border-t pt-2">
                <p className="text-xs font-medium text-neutral-500">
                  입찰 단위
                </p>
                <p className="text-sm text-neutral-700">
                  {formatPrice(auctionData.minBidStep)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 경매 상태 */}
          <Card className="border border-neutral-200 bg-white">
            <CardContent className="space-y-3 p-4">
              {isLive && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">종료까지</span>
                  <span className="text-sm font-semibold text-neutral-700">
                    {formatRemainingTime(remainingSeconds)}
                  </span>
                </div>
              )}
              {isScheduled && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">시작까지</span>
                  <span className="text-sm font-semibold text-neutral-700">
                    {formatRemainingTime(remainingSeconds)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">입찰 건수</span>
                <span className="text-sm font-semibold text-neutral-700">
                  {auctionData.totalBidCount || 0}건
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 판매자 정보 */}
          <Card className="border border-neutral-200 bg-white">
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-500">
                  판매자
                </p>
                <p className="text-sm font-semibold text-neutral-900">
                  {auctionData.sellerNickname || '판매자'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 경매 기간 */}
          <Card className="border border-neutral-200 bg-white">
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-500">
                  경매 시작
                </p>
                <p className="text-sm text-neutral-700">
                  {formatDateTime(auctionData.startAt)}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-500">
                  경매 종료
                </p>
                <p className="text-sm text-neutral-700">
                  {formatDateTime(auctionData.endAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 즉시 구매가 */}
          {auctionData.buyNowPrice && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <p className="mb-1 text-xs font-medium text-neutral-500">
                  즉시 구매가
                </p>
                <p className="text-xl font-bold text-purple-600">
                  {formatPrice(auctionData.buyNowPrice)}
                </p>
                {isLive && !auctionEnded && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full border-purple-300 text-purple-600 hover:bg-purple-100"
                    onClick={handleBuyNow}
                    disabled={isBuyNowLoading || !isLoggedIn}
                  >
                    {isBuyNowLoading ? '처리 중...' : '즉시 구매'}
                  </Button>
                )}
                {auctionEnded && (
                  <div className="mt-3 rounded-md bg-green-100 px-3 py-2 text-center">
                    <p className="text-sm font-semibold text-green-800">
                      입찰 현황에서 결제를 진행해주세요.
                    </p>
                  </div>
                )}
                {!isLive && !auctionEnded && (
                  <p className="mt-3 text-xs font-medium text-neutral-500">
                    {isScheduled
                      ? '경매 시작 후에 이용 가능합니다.'
                      : '경매가 종료되었습니다.'}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 액션 버튼들 - 제거됨 (하트 버튼은 이미지 우상단으로 이동) */}
        </div>
      </div>

      {/* 입찰 섹션 */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <h2 className="mb-4 text-xl font-bold">입찰하기</h2>
          {isLive ? (
            <div className="space-y-4">
              {/* 현재가 및 다음 최소 입찰가 안내 */}
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-600">현재 최고가</p>
                    <p className="text-primary-600 text-2xl font-bold">
                      {currentHighestBid.toLocaleString()}원
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-600">다음 입찰가</p>
                    <p className="text-xl font-semibold text-neutral-900">
                      {nextMinBidPrice.toLocaleString()}원 이상
                    </p>
                  </div>
                </div>
                {/* SSE 연결 상태 표시 */}
                <div className="mt-2 flex items-center gap-2">
                  {sseConnectionStatus === 'connected' && (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                      </span>
                      <span className="text-xs font-medium text-green-600">
                        실시간 업데이트 중
                      </span>
                    </>
                  )}
                  {sseConnectionStatus === 'connecting' && (
                    <>
                      <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500"></div>
                      <span className="text-xs text-yellow-600">
                        연결 중...
                      </span>
                    </>
                  )}
                  {sseConnectionStatus === 'disconnected' &&
                    pollingIntervalRef.current && (
                      <>
                        <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                        <span className="text-xs text-amber-600">
                          수동 업데이트 모드
                        </span>
                      </>
                    )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  입찰 금액
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`${nextMinBidPrice.toLocaleString()}원 이상 입력`}
                    className="focus:ring-primary-500 flex-1 rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:outline-none"
                    disabled={
                      !isLoggedIn || isBidLoading || !isLive || auctionEnded
                    }
                  />
                  <Button
                    onClick={handlePlaceBid}
                    disabled={
                      !isLoggedIn || isBidLoading || !isLive || auctionEnded
                    }
                    size="sm"
                  >
                    {isBidLoading
                      ? '입찰 중...'
                      : auctionEnded
                        ? '종료'
                        : '입찰'}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  최소 입찰가: {nextMinBidPrice.toLocaleString()}원 (현재가 +{' '}
                  {(auctionData.minBidStep || 1000).toLocaleString()}원)
                </p>
              </div>
            </div>
          ) : isScheduled ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-800">
              <p className="text-primary-700 font-semibold">
                경매 시작 전입니다.
              </p>
              <p className="mt-1">
                시작 예정: {formatDateTime(auctionData.startAt)}
              </p>
              <p className="mt-1 text-neutral-600">
                시작 이후 입찰이 가능합니다.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
              <p className="font-semibold text-neutral-800">
                경매가 종료되었습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 입찰 내역 */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">입찰 내역</h2>
              {bidHistory.length > 0 && bidViewMode === 'latest' && (
                <Badge variant="secondary">최근 {bidHistory.length}건</Badge>
              )}
              {bidHistory.length > 0 && bidViewMode === 'all' && (
                <Badge variant="secondary">
                  총 {bidHistoryTotalElements.toLocaleString()}건
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={bidViewMode === 'latest' ? 'secondary' : 'outline'}
                onClick={() => {
                  setBidViewMode('latest')
                  loadBidList()
                }}
                disabled={isBidHistoryLoading}
              >
                최근 10건
              </Button>
              <Button
                size="sm"
                variant={bidViewMode === 'all' ? 'secondary' : 'outline'}
                onClick={() => {
                  setBidViewMode('all')
                  setBidHistoryPage(0)
                  setBidHistoryIsLast(false)
                  setBidHistoryIsFirst(true)
                  loadBidHistory(0)
                }}
                disabled={isBidHistoryLoading}
              >
                전체 보기
              </Button>
            </div>
          </div>

          {isBidHistoryLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="border-t-primary-500 mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-neutral-200"></div>
                <p className="text-sm text-neutral-500">로딩 중...</p>
              </div>
            </div>
          ) : bidHistory.length === 0 ? (
            <div className="rounded-lg bg-neutral-50 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200">
                <svg
                  className="h-6 w-6 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-neutral-600">
                아직 입찰 내역이 없습니다
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                첫 번째 입찰자가 되어보세요!
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {bidHistory.map((bid, idx) => (
                  <div
                    key={bid.bidId || idx}
                    className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
                      idx === 0
                        ? 'bg-primary-50 border-primary-200 border'
                        : 'bg-neutral-50 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isHighestBid(bid) && (
                        <Badge variant="primary" size="sm" className="shrink-0">
                          최고가
                        </Badge>
                      )}
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {bid.bidder || '입찰자'}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatBidTime(bid.bidTime)}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        idx === 0 ? 'text-primary-600' : 'text-neutral-700'
                      }`}
                    >
                      {new Intl.NumberFormat('ko-KR').format(
                        bid.bidAmount || 0,
                      )}
                      원
                    </p>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 (전체 보기 전용) */}
              {bidViewMode === 'all' && bidHistoryTotalPages > 0 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadBidHistory(bidHistoryPage - 1)}
                    disabled={
                      bidHistoryIsFirst ||
                      bidHistoryPage === 0 ||
                      isBidHistoryLoading
                    }
                  >
                    이전
                  </Button>
                  <span className="text-sm text-neutral-600">
                    {bidHistoryPage + 1} / {bidHistoryTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadBidHistory(bidHistoryPage + 1)}
                    disabled={
                      bidHistoryIsLast ||
                      bidHistoryPage >= bidHistoryTotalPages - 1 ||
                      isBidHistoryLoading
                    }
                  >
                    다음
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* QnA 섹션 */}
      {auctionData.productId && (
        <Card className="mt-8">
          <CardContent className="p-6">
            <h2 className="mb-4 text-xl font-bold">질문과 답변</h2>

            {/* 질문 작성 폼 */}
            <div className="mb-6 space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
              <label className="block text-sm font-medium text-neutral-700">
                상품에 대해 궁금한 점이 있으신가요?
              </label>
              <textarea
                value={qnaQuestion}
                onChange={(e) => setQnaQuestion(e.target.value)}
                placeholder="질문 내용을 입력해주세요."
                rows={3}
                className="focus:ring-primary-500 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:outline-none"
                disabled={!isLoggedIn || isQnaSubmitting}
              />
              <div className="flex justify-end gap-2">
                {!isLoggedIn && (
                  <p className="text-sm text-neutral-500">
                    로그인 후 질문할 수 있습니다.
                  </p>
                )}
                <Button
                  onClick={handleAddQuestion}
                  disabled={
                    !isLoggedIn || isQnaSubmitting || !qnaQuestion.trim()
                  }
                  size="sm"
                >
                  {isQnaSubmitting ? '등록 중...' : '질문하기'}
                </Button>
              </div>
            </div>

            {/* 질문 목록 */}
            <div className="space-y-4">
              {isQnaLoading ? (
                <p className="text-center text-sm text-neutral-500">
                  로딩 중...
                </p>
              ) : qnaList.length === 0 ? (
                <p className="rounded-lg border border-neutral-200 bg-white p-4 text-center text-sm text-neutral-500">
                  아직 등록된 질문이 없습니다.
                </p>
              ) : (
                qnaList.map((qna) => {
                  const question = qna.productQnaCreateResponse
                  return (
                    <div
                      key={question?.qnaId}
                      className="space-y-2 rounded-lg border border-neutral-200 p-4"
                    >
                      {/* 질문 */}
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-primary-600 text-xs font-semibold">
                            Q
                          </span>
                          <span className="text-xs text-neutral-500">
                            {formatDateOnly(question?.questionedAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-neutral-900">
                          {question?.question}
                        </p>
                      </div>

                      {/* 답변 목록 */}
                      {qna.answers && qna.answers.length > 0 ? (
                        <div className="space-y-2">
                          {qna.answers.map((answer) => (
                            <div
                              key={answer.answerId}
                              className="border-primary-300 border-l-2 bg-white py-2 pl-3"
                            >
                              <div className="mb-1 flex items-center">
                                <span className="text-primary-600 text-xs font-semibold">
                                  A
                                </span>
                              </div>
                              <p className="text-sm text-neutral-800">
                                {answer.answer}
                              </p>
                              <p className="mt-1 text-xs text-neutral-500">
                                {formatDateOnly(answer.answeredAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border-l-2 border-neutral-200 bg-white py-2 pl-3">
                          <p className="text-sm text-neutral-500 italic">
                            아직 답변이 없습니다.
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 즉시 구매 확인 다이얼로그 */}
      <Dialog open={showBuyNowDialog} onOpenChange={setShowBuyNowDialog}>
        <DialogContent
          className="bg-white sm:max-w-md"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-neutral-900">
              즉시 구매 확인
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block text-base font-semibold text-orange-600">
                {formatPrice(auctionData.buyNowPrice)}
              </span>
              <span className="mt-2 block text-sm text-neutral-700">
                즉시 구매 시 경매가 종료되고 낙찰이 확정됩니다.
                <br />
                구매하시겠습니까?
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBuyNowDialog(false)}
              className="bg-white hover:bg-neutral-100"
            >
              취소
            </Button>
            <Button
              onClick={confirmBuyNow}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              구매 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
