import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Sans_KR } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

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
      className={`${inter.variable} ${notoSansKR.variable} ${notoSansKR.className} antialiased`}
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
      </head>
      <body className="font-noto-sans-kr">
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
