import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'
)
  .replace(/\/api\/proxy$/, '')
  .replace(/\/+$/, '')

// 공통 헤더 설정 (스웨거와 동일하게)
const getCommonHeaders = (request: NextRequest, hasBody: boolean = false) => {
  const headers: Record<string, string> = {
    accept: '*/*', // 스웨거와 동일한 Accept 헤더
  }

  // Content-Type은 POST/PUT/PATCH 등 body가 있을 때만 추가
  // GET 요청에는 Content-Type을 보내지 않음 (백엔드에서 400 에러 발생)
  // FormData 요청에서는 Content-Type을 설정하지 않음 (브라우저가 자동 설정)
  const contentType = request.headers.get('content-type')
  if (hasBody && contentType && !contentType.includes('multipart/form-data')) {
    headers['Content-Type'] = 'application/json'
  }

  // Authorization 헤더 전달 (Bearer 토큰)
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    headers['Authorization'] = authHeader
    console.log(
      '🔑 프록시 - Authorization 헤더 전달:',
      authHeader.substring(0, 30) + '...',
    )
  } else {
    console.error('❌ 프록시 - Authorization 헤더 누락!', {
      url: request.url,
      method: request.method,
      allHeaders: Object.fromEntries(request.headers.entries()),
    })
  }

  // 쿠키 전달 (모든 관련 쿠키 포함)
  const cookieHeader = request.headers.get('cookie')

  if (cookieHeader) {
    // 모든 쿠키를 그대로 전달
    const relevantCookies = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .join('; ')

    if (relevantCookies) {
      headers['Cookie'] = relevantCookies
    }
  }

  return headers
}

// 에러 응답 생성
const createErrorResponse = (message: string, status: number = 500) => {
  return NextResponse.json(
    {
      error: message,
      timestamp: new Date().toISOString(),
    },
    { status },
  )
}

// 백엔드 응답 처리 (수정됨)
const handleBackendResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type')
  const responseText = await response.text()

  // 백엔드 응답 로깅
  console.log('백엔드 응답 상태:', response.status)
  console.log('백엔드 응답 내용:', responseText)

  // 204 No Content 응답 처리
  if (response.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  // 빈 응답 처리 (204가 아닌 경우)
  if (!responseText || responseText.trim() === '') {
    return NextResponse.json(
      {
        message: 'Empty response',
        status: response.status,
      },
      { status: response.status },
    )
  }

  // HTML 응답인 경우 (에러 페이지)
  if (
    contentType?.includes('text/html') ||
    responseText.includes('<!doctype html>') ||
    responseText.includes('<html')
  ) {
    // HTML에서 에러 정보 추출 시도
    let errorMessage = `HTTP ${response.status} - ${response.statusText}`
    let errorTitle = ''

    // HTML에서 title 태그 추출
    const titleMatch = responseText.match(/<title>(.*?)<\/title>/i)
    if (titleMatch) {
      errorTitle = titleMatch[1]
    }

    // h1 태그에서 에러 제목 추출
    const h1Match = responseText.match(/<h1>(.*?)<\/h1>/i)
    if (h1Match) {
      errorTitle = h1Match[1]

      console.log('추출된 h1:', errorTitle)
    }

    // 에러 메시지 개선
    if (response.status === 400) {
      errorMessage = '잘못된 요청입니다. 인증 정보를 확인해주세요.'
    } else if (response.status === 401) {
      errorMessage = '인증이 필요합니다. 로그인해주세요.'
    } else if (response.status === 403) {
      errorMessage = '접근 권한이 없습니다.'
    } else if (response.status === 404) {
      errorMessage = '요청한 리소스를 찾을 수 없습니다.'
    } else if (response.status >= 500) {
      errorMessage = '서버 오류가 발생했습니다.'
    }

    console.log('HTML 에러 응답 반환:', { errorMessage, errorTitle })
    return NextResponse.json(
      {
        error: 'Backend returned HTML error page',
        message: errorMessage,
        status: response.status,
        statusText: response.statusText,
        title: errorTitle,
        contentType: contentType,
      },
      { status: response.status },
    )
  }

  // JSON 응답 처리
  if (
    contentType?.includes('application/json') ||
    responseText.trim().startsWith('{') ||
    responseText.trim().startsWith('[')
  ) {
    try {
      const data = JSON.parse(responseText)

      // Set-Cookie 헤더가 있으면 클라이언트에 전달
      const responseHeaders = new Headers()
      const setCookieHeaders = response.headers.getSetCookie()
      if (setCookieHeaders && setCookieHeaders.length > 0) {
        setCookieHeaders.forEach((cookie) => {
          // 쿠키 속성 수정
          let modifiedCookie = cookie

          // SameSite가 없으면 추가
          if (!cookie.toLowerCase().includes('samesite=')) {
            modifiedCookie += '; SameSite=Lax'
          }

          // Secure는 개발환경에서 제거
          if (cookie.toLowerCase().includes('secure')) {
            modifiedCookie = modifiedCookie.replace(/;\s*Secure/gi, '')
          }

          responseHeaders.append('Set-Cookie', modifiedCookie)
        })
      }

      return NextResponse.json(data, {
        status: response.status,
        headers: responseHeaders,
      })
    } catch (parseError) {
      console.warn('JSON 파싱 실패:', parseError)
      console.log('파싱 실패한 텍스트:', responseText)

      // JSON 파싱 실패 시 원본 텍스트 반환
      return NextResponse.json(
        {
          error: 'JSON 파싱 실패',
          message: '응답을 JSON으로 파싱할 수 없습니다.',
          raw_response: responseText,
          parse_error:
            parseError instanceof Error
              ? parseError.message
              : 'Unknown parse error',
        },
        { status: response.status },
      )
    }
  }

  // 일반 텍스트 응답 처리
  console.log('일반 텍스트 응답 처리')
  return NextResponse.json(
    {
      message: responseText,
      raw_response: responseText,
      contentType: contentType,
      status: response.status,
    },
    { status: response.status },
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const resolvedParams = await params
    const path = resolvedParams.path.join('/')

    // 쿼리 파라미터 추가
    const searchParams = request.nextUrl.searchParams
    const queryString = searchParams.toString()
    const urlBase = [API_BASE_URL, path].join('/').replace(/([^:]\/)\/+/g, '$1')
    const url = queryString ? `${urlBase}?${queryString}` : urlBase

    console.log('GET 요청:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: getCommonHeaders(request),
    })

    return await handleBackendResponse(response)
  } catch (error) {
    console.error('프록시 GET 요청 실패:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const resolvedParams = await params
    const path = resolvedParams.path.join('/')
    const url = [API_BASE_URL, path].join('/').replace(/([^:]\/)\/+/g, '$1')

    const contentType = request.headers.get('content-type') || ''

    let body = null
    let hasBody = false
    let headers = getCommonHeaders(request, false)

    // FormData 처리 - 스트림으로 그대로 전달
    if (contentType.includes('multipart/form-data')) {
      // 중요: request.body를 그대로 전달 (파싱하지 않음)
      body = request.body
      hasBody = true

      // Content-Type도 boundary 포함해서 그대로 전달
      headers['Content-Type'] = contentType

      console.log('📤 FormData 요청 - 스트림으로 전달')
      console.log('📤 Content-Type:', contentType)
    }
    // JSON 처리
    else {
      try {
        const requestBody = await request.json()
        if (requestBody && Object.keys(requestBody).length > 0) {
          body = JSON.stringify(requestBody)
          hasBody = true
          headers['Content-Type'] = 'application/json'
        }
      } catch (error) {
        console.log('POST 요청에 body가 없거나 JSON이 아닙니다.')
      }
    }

    console.log(
      'POST 요청:',
      url,
      hasBody
        ? `(${contentType.includes('multipart') ? 'FormData' : 'JSON'})`
        : '(no body)',
    )

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: headers,
    }

    if (hasBody && body) {
      fetchOptions.body = body

      // ReadableStream 사용 시 duplex 필요
      if (body instanceof ReadableStream) {
        ;(fetchOptions as any).duplex = 'half'
      }
    }

    const response = await fetch(url, fetchOptions)
    return await handleBackendResponse(response)
  } catch (error) {
    console.error('프록시 POST 요청 실패:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const resolvedParams = await params
    const path = resolvedParams.path.join('/')
    const url = [API_BASE_URL, path].join('/').replace(/([^:]\/)\/+/g, '$1')

    const contentType = request.headers.get('content-type') || ''

    let body = null
    let hasBody = false
    let headers = getCommonHeaders(request, false)

    // FormData 처리 (POST와 동일)
    if (contentType.includes('multipart/form-data')) {
      body = request.body
      hasBody = true
      headers['Content-Type'] = contentType

      console.log('📤 FormData PUT 요청 - 스트림으로 전달')
    }
    // JSON 처리
    else {
      try {
        const requestBody = await request.json()
        if (requestBody && Object.keys(requestBody).length > 0) {
          body = JSON.stringify(requestBody)
          hasBody = true
          headers['Content-Type'] = 'application/json'
        }
      } catch (error) {
        console.log('PUT 요청에 body가 없거나 JSON이 아닙니다.')
      }
    }

    console.log('=== PUT 요청 디버깅 ===')
    console.log('요청 URL:', url)
    console.log('Content-Type:', contentType)
    console.log('Body 있음:', hasBody)
    console.log(
      'Body 타입:',
      contentType.includes('multipart') ? 'FormData' : 'JSON',
    )
    console.log('======================')

    const fetchOptions: RequestInit = {
      method: 'PUT',
      headers: headers,
    }

    if (hasBody && body) {
      fetchOptions.body = body

      // ReadableStream duplex 추가
      if (body instanceof ReadableStream) {
        ;(fetchOptions as any).duplex = 'half'
      }
    }

    const response = await fetch(url, fetchOptions)
    return await handleBackendResponse(response)
  } catch (error) {
    console.error('프록시 PUT 요청 실패:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const resolvedParams = await params
    const path = resolvedParams.path.join('/')
    const url = [API_BASE_URL, path].join('/').replace(/([^:]\/)\/+/g, '$1')

    console.log('=== DELETE 요청 디버깅 ===')
    console.log('요청 URL:', url)
    console.log('경로:', path)
    console.log('========================')

    const response = await fetch(url, {
      method: 'DELETE',
      headers: getCommonHeaders(request),
    })

    return await handleBackendResponse(response)
  } catch (error) {
    console.error('프록시 DELETE 요청 실패:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  console.log('🔧 PATCH 요청 시작!')
  try {
    const resolvedParams = await params
    const path = resolvedParams.path.join('/')
    const url = [API_BASE_URL, path].join('/').replace(/([^:]\/)\/+/g, '$1')

    const contentType = request.headers.get('content-type') || ''

    let body = null
    let hasBody = false
    let headers = getCommonHeaders(request, false)

    // FormData 처리 (POST와 동일)
    if (contentType.includes('multipart/form-data')) {
      body = request.body
      hasBody = true
      headers['Content-Type'] = contentType

      console.log('📤 FormData PATCH 요청 - 스트림으로 전달')
    }
    // JSON 처리
    else {
      try {
        const requestBody = await request.json()
        if (requestBody && Object.keys(requestBody).length > 0) {
          body = JSON.stringify(requestBody)
          hasBody = true
          headers['Content-Type'] = 'application/json'
        }
      } catch (error) {
        console.log('PATCH 요청에 body가 없거나 JSON이 아닙니다.')
      }
    }

    console.log('=== PATCH 요청 디버깅 ===')
    console.log('요청 URL:', url)
    console.log('Content-Type:', contentType)
    console.log('Body 있음:', hasBody)
    console.log(
      'Body 타입:',
      contentType.includes('multipart') ? 'FormData' : 'JSON',
    )
    console.log('원본 쿠키 헤더:', request.headers.get('cookie'))
    console.log('전달될 헤더:', headers)
    console.log('========================')

    const fetchOptions: RequestInit = {
      method: 'PATCH',
      headers: headers,
    }

    if (hasBody && body) {
      fetchOptions.body = body

      // ReadableStream duplex 추가
      if (body instanceof ReadableStream) {
        ;(fetchOptions as any).duplex = 'half'
      }
    }

    console.log('🔧 PATCH fetch 옵션:', fetchOptions)
    const response = await fetch(url, fetchOptions)
    console.log('🔧 PATCH 응답 상태:', response.status)
    return await handleBackendResponse(response)
  } catch (error) {
    console.error('프록시 PATCH 요청 실패:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}
