import { NextResponse } from 'next/server'

// Next.js 타임아웃 제한 해제 (Vercel: 최대 300초 hobby, 900초 pro)
export const maxDuration = 300
export const dynamic = 'force-dynamic'

// 간단 SSE 프록시: 브라우저 CORS 403 회피용
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ auctionId?: string }> },
) {
  const { auctionId } = await params
  if (!auctionId) {
    return NextResponse.json(
      { message: 'auctionId is required' },
      { status: 400 },
    )
  }

  const target = `https://api.p-14626.khee.store/api/v1/auctions/${auctionId}/bid-stream`

  try {
    const upstream = await fetch(target, {
      cache: 'no-store',
      headers: { Accept: 'text/event-stream' },
      // 타임아웃 없음 (SSE는 장시간 연결)
    })

    // 에러 상태 전달
    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => 'Unknown error')
      console.error('[SSE proxy] upstream error:', upstream.status, errorText)
      return new Response(errorText, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // SSE 유지에 필요한 헤더
    const headers = new Headers()
    headers.set('Content-Type', 'text/event-stream')
    headers.set('Cache-Control', 'no-cache')
    headers.set('Connection', 'keep-alive')
    headers.set('X-Accel-Buffering', 'no')

    // ReadableStream으로 전달하되 에러 핸들링
    const reader = upstream.body?.getReader()
    if (!reader) {
      return NextResponse.json({ message: 'No response body' }, { status: 502 })
    }

    const stream = new ReadableStream({
      async start(controller) {
        let heartbeatInterval: NodeJS.Timeout | null = null

        try {
          // 백엔드 heartbeat 없을 때 프록시에서 추가 (30초마다)
          heartbeatInterval = setInterval(() => {
            try {
              controller.enqueue(new TextEncoder().encode(':\n\n'))
              console.log('[SSE proxy] heartbeat sent to client')
            } catch (err) {
              console.error('[SSE proxy] heartbeat failed:', err)
              if (heartbeatInterval) clearInterval(heartbeatInterval)
            }
          }, 30000)

          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              console.log('[SSE proxy] upstream stream ended normally')
              break
            }
            controller.enqueue(value)
          }
        } catch (err: any) {
          // 60초 idle 타임아웃은 예상된 동작
          if (err?.cause?.code === 'UND_ERR_SOCKET') {
            console.log(
              '[SSE proxy] 백엔드 60초 타임아웃 (예상됨, 클라이언트 자동 재연결)',
            )
          } else {
            console.error('[SSE proxy] 예상치 못한 스트림 에러:', err)
          }
        } finally {
          if (heartbeatInterval) clearInterval(heartbeatInterval)
          controller.close()
          reader.releaseLock()
        }
      },
      cancel() {
        console.log('[SSE proxy] client disconnected')
        reader.releaseLock()
      },
    })

    return new Response(stream, { status: 200, headers })
  } catch (err) {
    console.error('[SSE proxy] fetch error:', err)
    return NextResponse.json(
      { message: 'Failed to connect SSE upstream' },
      { status: 502 },
    )
  }
}
