import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { MockProvider } from '@/components/providers/mock-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Frontend Baseline',
  description: '외부 백엔드와 통신하는 프론트엔드 프로젝트의 baseline',
}

/**
 * mobile-first 보장을 위한 명시적 viewport.
 * - width=device-width: 디바이스 실제 너비 사용
 * - initialScale=1: 첫 진입 시 줌 비율 1 (iOS 자동 줌인 방지의 *전제 조건*)
 * - maximumScale 등은 의도적으로 *제한하지 않음* — 접근성(확대) 보장
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MockProvider>
            <QueryProvider>
              {children}
              <Toaster />
            </QueryProvider>
          </MockProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
