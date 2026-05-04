import type { Metadata } from 'next'
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
  title: 'NextJS Starter - 모던 웹 스타터킷',
  description:
    'Next.js 16.2.4, React 19.2.5, TypeScript, TailwindCSS v4, shadcn/ui로 구축된 프로덕션 준비 웹 애플리케이션 스타터킷',
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
