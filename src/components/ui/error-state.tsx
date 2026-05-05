import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface ErrorStateProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  icon?: ReactNode
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
}

/**
 * 에러 상태를 표시하는 무명사 프리미티브.
 * EmptyState와 구조 동일, `role="alert"`로 시맨틱·스크린리더 안내가 다릅니다.
 *
 * baseline 경계 정책 (PRD `🎨 baseline 경계 정책`) Layer 4 — Slot 패턴 강제:
 * - 모든 콘텐츠는 props로만 받음 — baseline은 *기본 일러스트/문구를 박지 않음*
 * - 레이아웃(flex-col + gap + py-12)과 색(CSS 변수)만 baseline 책임
 *
 * `children`을 직접 넘기면 슬롯(icon/title/description/action) 무시.
 */
export function ErrorState({
  icon,
  title,
  description,
  action,
  className,
  children,
  ...props
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12 text-center',
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          {icon}
          {title ? <div className="text-sm font-medium">{title}</div> : null}
          {description ? (
            <div className="text-muted-foreground text-sm">{description}</div>
          ) : null}
          {action}
        </>
      )}
    </div>
  )
}
