import Link from 'next/link'
import { Container } from '@/components/layout/container'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const entryLinks = [
  {
    href: '/users',
    title: '사용자 목록 데모',
    description:
      'orval + ky + TanStack Query + MSW 통합 흐름 (Phase 1~4 데모).',
  },
  {
    href: '/login',
    title: '로그인',
    description: 'httpOnly 쿠키 + Route Handler 프록시 인증 흐름.',
  },
] as const

export default function Home() {
  return (
    <Container size="md" className="py-16">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Frontend Baseline</h1>
        <p className="text-muted-foreground text-sm">
          외부 백엔드와 통신하는 프론트엔드 프로젝트의 baseline. 새 도메인을
          추가하려면{' '}
          <code className="bg-muted rounded px-1">
            docs/guides/api-pattern.md
          </code>
          를 참고하세요.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {entryLinks.map(({ href, title, description }) => (
          <Link key={href} href={href} className="block">
            <Card className="hover:border-primary h-full transition-colors">
              <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </Container>
  )
}
