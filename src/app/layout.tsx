import { AuthProvider } from '@/contexts/AuthContext'
import { WebSocketProvider } from '@/contexts/WebSocketContext'
import type { Metadata, Viewport } from 'next'
import { Noto_Sans_KR } from 'next/font/google'
import './globals.css'

const notoSansKR = Noto_Sans_KR({
  variable: '--font-noto-sans-kr',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'DROP',
  description:
    '희소 굿즈·리미티드 아이템 거래 시장에서 발생하는 불투명성, 신뢰 문제, 가격 형성 왜곡을 해결하는 굿즈 경매 플랫폼',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko-KR"
      className={`${notoSansKR.variable} ${notoSansKR.className} antialiased`}
    >
      <head>
        <meta property="og:title" content="DROP" />
        <meta
          property="og:description"
          content="희소 굿즈·리미티드 아이템 거래 시장에서 발생하는 불투명성, 신뢰 문제, 가격 형성 왜곡을 해결하는 굿즈 경매 플랫폼"
        />
        <meta property="og:image:alt" content="DROP" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <script src="https://js.tosspayments.com/v1"></script>
        <script src="https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/stompjs@2.3.3/lib/stomp.min.js"></script>
      </head>
      <body className="font-noto-sans-kr">
        <AuthProvider>
          <WebSocketProvider>{children}</WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
