import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface EmptyStateProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  icon?: ReactNode
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
}

/**
 * 빈 상태(검색 결과 없음, 항목 없음 등)를 표시하는 무명사 프리미티브.
 *
 * baseline 경계 정책 (PRD `🎨 baseline 경계 정책`) Layer 4 — Slot 패턴 강제:
 * - 모든 콘텐츠는 props로만 받음 — baseline은 *기본 일러스트/문구를 박지 않음*
 * - 레이아웃(flex-col + gap + py-12)과 색(CSS 변수)만 baseline 책임
 * - 폰트 크기는 Tailwind utility 기본값(`text-sm font-medium`) —
 *   도메인이 ReactNode를 직접 넘겨 자유롭게 override 가능
 *
 * `children`을 직접 넘기면 슬롯(icon/title/description/action) 무시.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      role="status"
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
