# 리스트 패턴 가이드 (검색·필터·페이지·정렬)

이 문서는 baseline에서 _목록 화면_(상품 목록, 가게 목록, 채용 공고, 게시판 등)을 다루는 표준 패턴을 정의합니다.

> 이 가이드는 PRD `🎨 baseline 경계 정책`의 **Layer 1 (behavior)** 영역입니다. 훅과 데이터 흐름만 baseline이 제공하고, *카드 / 테이블 / 그리드*의 디자인은 도메인이 자유롭게 결정합니다.

---

## 🎯 한 줄 요약

URL 상태(`useListQueryParams`)와 페칭(TanStack Query)을 *분리*해 결합. 검색어·필터·페이지가 URL에 동기화돼 *뒤로가기 / 공유 링크*가 자연스럽게 동작합니다.

---

## 📐 표준 키와 자유 필터

baseline은 모든 도메인에 공통인 **5개 표준 키**를 인식합니다:

| 키      | 타입              | 기본값  | 용도               |
| ------- | ----------------- | ------- | ------------------ |
| `q`     | `string`          | `''`    | 검색어             |
| `page`  | `number`          | `1`     | 페이지 (1-indexed) |
| `size`  | `number`          | `20`    | 페이지 크기        |
| `sort`  | `string`          | `''`    | 정렬 필드명        |
| `order` | `'asc' \| 'desc'` | `'asc'` | 정렬 방향          |

표준 키 외의 모든 URL search params는 **자유 필터**(`filters`)로 노출됩니다. 도메인이 _카테고리, 가격대, 지역, 직무_ 등 어떤 키든 자유롭게 사용 가능합니다.

---

## 🔧 `useListQueryParams` 사용

### 1) 가장 단순한 형태

```typescript
'use client';

import { useListQueryParams } from '@/lib/hooks/use-list-query-params';

function ProductListPage() {
  const { params, filters, setParams } = useListQueryParams();

  return (
    <div>
      <SearchInput
        value={params.q}
        onChange={(q) => setParams({ q, page: 1 })} // 검색 시 page 리셋
      />
      <CategoryFilter
        value={filters.category ?? ''}
        onChange={(category) => setParams({ filters: { category }, page: 1 })}
      />
      <Pagination page={params.page} onPageChange={(page) => setParams({ page })} />
    </div>
  );
}
```

> **page 자동 리셋**: 검색어/필터를 변경할 때 `page: 1`을 함께 보내는 것이 표준 패턴. 안 그러면 _4페이지에서 새 검색_ 시 빈 결과가 나올 수 있습니다.

### 2) 기본값 커스터마이즈

```typescript
const { params } = useListQueryParams({
  defaults: { size: 50, sort: 'createdAt', order: 'desc' },
})
// URL에 size/sort/order가 없으면 이 값이 사용됨
// URL에 명시되면 그 값이 우선
```

### 3) TanStack Query와 결합

```typescript
'use client'

import { useListQueryParams } from '@/lib/hooks/use-list-query-params'
import { useProductsQuery } from '@/features/products'

function ProductListPage() {
  const { params, filters, setParams } = useListQueryParams()

  const { data, isLoading, error } = useProductsQuery({
    q: params.q,
    page: params.page,
    size: params.size,
    sort: params.sort || undefined,
    order: params.order,
    category: filters.category,
  })

  // ... 도메인 UI
}
```

`useProductsQuery`의 queryKey에 params/filters를 그대로 넣으면 URL이 바뀔 때마다 자동 refetch됩니다.

---

## 🔍 검색 디바운스 패턴

빠른 타이핑마다 URL/요청이 발생하는 것을 막기 위해 디바운스를 결합합니다. baseline은 `usehooks-ts`가 이미 동봉돼 있습니다.

```typescript
'use client';

import { useDebounceCallback } from 'usehooks-ts';
import { useListQueryParams } from '@/lib/hooks/use-list-query-params';
import { useState } from 'react';

function SearchBar() {
  const { params, setParams } = useListQueryParams();
  const [draft, setDraft] = useState(params.q); // 입력 중 임시값

  const commit = useDebounceCallback((q: string) => {
    setParams({ q, page: 1 }, { replace: true }); // replace로 히스토리 폭증 방지
  }, 300);

  return (
    <input
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        commit(e.target.value);
      }}
    />
  );
}
```

> **`replace: true`** — 검색 디바운스에선 히스토리 누적을 피해야 합니다. 기본값은 `push`(히스토리에 남음).

---

## 🧭 push vs replace 가이드

| 상황                       | 권장      | 이유                                    |
| -------------------------- | --------- | --------------------------------------- |
| 명시적 검색 버튼 클릭      | `push`    | 뒤로가기로 이전 검색 복원 자연스러움    |
| 입력 중 디바운스 자동 갱신 | `replace` | 히스토리 폭증 방지                      |
| 페이지 번호 변경           | `push`    | 뒤로가기로 이전 페이지 복원             |
| 필터 토글                  | `push`    | 뒤로가기 자연스러움                     |
| 정렬 변경                  | `push`    | 뒤로가기 자연스러움                     |
| `reset()` 호출             | `replace` | 초기화 직후 뒤로가기로 다시 검색됨 방지 |

---

## 🌀 페이지네이션 vs 무한스크롤

같은 list 엔드포인트라도 UX 의도에 따라 패턴을 골라야 합니다.

| 상황                                   | 권장         | 이유                               |
| -------------------------------------- | ------------ | ---------------------------------- |
| 검색 결과 / 관리자 테이블              | 페이지네이션 | "몇 페이지 중 몇 페이지" 위치 인식 |
| 피드 / 타임라인 / 모바일 우선 카탈로그 | 무한스크롤   | 스크롤 흐름 끊김 없음              |
| 결과가 적고 정확한 위치가 중요         | 페이지네이션 | 책갈피 / 공유 링크가 _명시적_      |
| 결과가 많고 *발견*이 중요              | 무한스크롤   | 사용자가 임계 없이 탐색            |

> **혼합 패턴**: 데스크톱은 페이지네이션, 모바일은 무한스크롤로 분기하는 도메인도 흔합니다. baseline은 *두 훅을 모두 제공*하므로 도메인이 화면 사이즈에 따라 선택.

---

## ♾ `useInfiniteScroll` 사용

TanStack Query `useInfiniteQuery`와 결합해 *센티넬 엘리먼트*가 뷰포트에 진입하면 `fetchNextPage()`를 자동 호출하는 훅입니다.

### 1) 도메인 features에 무한 쿼리 추가

```typescript
// src/features/products/queries.ts (도메인 시점 작성)
import { useInfiniteQuery } from '@tanstack/react-query'
import { productsKeys } from './keys'
import { listProducts } from '@/lib/api/generated/products/products'

export function useProductsInfiniteQuery(params: { size: number }) {
  return useInfiniteQuery({
    queryKey: productsKeys.infinite(params),
    queryFn: ({ pageParam }) =>
      listProducts({ page: pageParam, size: params.size }),
    initialPageParam: 1,
    getNextPageParam: last => (last.hasMore ? last.page + 1 : undefined),
  })
}
```

> **`getNextPageParam` 형태는 백엔드에 따라 다릅니다** — `{ items, hasMore, page }` / `{ items, nextCursor }` / `{ items, total, page }` 등. baseline은 응답 형태를 강제하지 않습니다.

### 2) 컴포넌트에서 sentinel ref 연결

```tsx
'use client'

import { useInfiniteScroll } from '@/lib/hooks/use-infinite-scroll'
import { useProductsInfiniteQuery } from '@/features/products'

function ProductFeed() {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useProductsInfiniteQuery({
      size: 20,
    })

  const sentinelRef = useInfiniteScroll({
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,
  })

  const items = data?.pages.flatMap(p => p.items) ?? []

  return (
    <div>
      {items.map(item => (
        <YourDomainCard key={item.id} item={item} />
      ))}
      {/* 화면에 보이면 자동으로 다음 페이지 로드 */}
      <div ref={sentinelRef} />
      {isFetchingNextPage && <YourDomainSkeleton />}
    </div>
  )
}
```

> **카드 / 스켈레톤은 _도메인_ 컴포넌트** — baseline이 제공하지 않습니다 (PRD `🎨 baseline 경계 정책` _No Domain Nouns_).

### 3) 옵션

| 옵션         | 기본값    | 용도                                             |
| ------------ | --------- | ------------------------------------------------ |
| `rootMargin` | `'200px'` | 뷰포트 도달 *전*에 미리 로드 (체감 부드러움)     |
| `enabled`    | `true`    | 모달 / 탭 비활성 시 잠시 끔 (불필요한 로드 방지) |

---

## 🪟 상태 표시 프리미티브 (Empty / Error / Skeleton)

리스트 화면의 _비어있음 / 실패 / 로딩_ 세 상태를 표시하는 baseline 컴포넌트입니다.

> **Layer 4 (무명사 프리미티브) — Slot 패턴 강제**. baseline은 _기본 일러스트 / 문구를 박지 않습니다_. 모든 콘텐츠는 props로 받고, 색은 CSS 변수만, 레이아웃은 `flex-col + items-center + gap-3 + py-12 + text-center`까지만 (PRD `🎨 baseline 경계 정책` 참조).

### `<EmptyState />` — 빈 상태

검색 결과 0건, 첫 진입 시 항목 없음 등에 사용. `role="status"`로 스크린리더가 *상태*로 안내.

```tsx
'use client'

import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Inbox } from 'lucide-react'
;<EmptyState
  icon={<Inbox className="text-muted-foreground size-12" />}
  title="결과가 없어요"
  description="다른 검색어로 시도해보세요."
  action={
    <Button variant="outline" onClick={resetFilters}>
      필터 초기화
    </Button>
  }
/>
```

> **icon은 props** — baseline은 어떤 아이콘도 기본값으로 박지 않습니다. 도메인이 lucide / 자체 SVG / 일러스트 이미지 등 자유 선택.

### `<ErrorState />` — 에러 상태

쿼리 실패, 권한 오류 등에 사용. `role="alert"`로 스크린리더가 *경고*로 안내.

```tsx
import { ErrorState } from '@/components/ui/error-state'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
;<ErrorState
  icon={<AlertCircle className="text-destructive size-12" />}
  title="불러오지 못했어요"
  description={error.message}
  action={<Button onClick={() => refetch()}>다시 시도</Button>}
/>
```

### `<Skeleton />` — 로딩 상태 (shadcn 동봉)

shadcn `<Skeleton/>`을 _그대로_ 사용합니다 (별도 baseline 컴포넌트 없음). 도메인이 _카드 레이아웃에 맞춰_ 자유롭게 조합:

```tsx
import { Skeleton } from '@/components/ui/skeleton'

function ProductFeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="size-20 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

> **카드 스켈레톤은 _도메인_** — baseline은 `<Skeleton/>` 프리미티브만 제공. `<ProductFeedSkeleton/>`, `<JobCardSkeleton/>` 같은 도메인 명사 합성은 도메인이 작성합니다.

### 세 상태 통합 패턴 (TanStack Query 결합)

```tsx
'use client'

function ProductList() {
  const { data, isLoading, error, refetch } = useProductsQuery(/* ... */)

  if (isLoading) return <ProductFeedSkeleton />

  if (error) {
    return (
      <ErrorState
        icon={<AlertCircle className="text-destructive size-12" />}
        title="불러오지 못했어요"
        description={error.message}
        action={<Button onClick={() => refetch()}>다시 시도</Button>}
      />
    )
  }

  if (!data?.items.length) {
    return (
      <EmptyState
        icon={<Inbox className="text-muted-foreground size-12" />}
        title="결과가 없어요"
        description="다른 검색어로 시도해보세요."
      />
    )
  }

  return data.items.map(item => <YourDomainCard key={item.id} item={item} />)
}
```

### 상태 프리미티브 함정

- **icon에 색을 박지 마세요**: baseline 컴포넌트는 icon에 색을 입히지 않습니다. 도메인이 `<Inbox className="text-muted-foreground" />`처럼 *넘기는 시점*에 색을 결정 — 브랜드 정체성 유지.
- **EmptyState를 에러에 사용**: 시맨틱이 다릅니다 (`role="status"` vs `role="alert"`). 스크린리더 사용자에게 *상태*와 *경고*가 다르게 안내됩니다.
- **Skeleton을 baseline에서 합성**: `<TableSkeleton/>`, `<CardSkeleton/>` 같은 *도메인-종속 합성*은 baseline에 두지 않습니다. 매 도메인이 자기 카드/테이블 모양에 맞춰 직접 조합.

---

## 🚫 함정 모음

### URL 동기화 (`useListQueryParams`)

1. **표준 키와 충돌하는 자유 필터 키**: 도메인 필터에 `q` / `page` / `size` / `sort` / `order`를 _절대_ 사용하지 마세요. baseline이 가로챕니다.
2. **검색/필터 변경 시 page 미리셋**: 위 예시처럼 항상 `setParams({ q, page: 1 })`. 빠뜨리면 빈 결과 버그.
3. **페이지 크기 동적 변경 시 page 미리셋**: `size: 50 → 100` 변경 시에도 현재 페이지가 범위 밖일 수 있음. `setParams({ size, page: 1 })`.
4. **`useSearchParams()`는 client-only**: 사용 컴포넌트에 `'use client';` 필수. 안 그러면 빌드 실패.
5. **scroll 이슈**: 훅은 `{ scroll: false }`로 호출 — 페이지 변경 시 *맨 위로 스크롤되는 것*을 막습니다. 페이지네이션처럼 _스크롤이 필요하면_ 도메인이 직접 `window.scrollTo`.
6. **default 값 URL 미제거**: `value === default`이면 URL에서 자동 제거됩니다. 도메인이 `?page=1`을 기대하면 안 됨 — `params.page === 1`을 보고 판단.
7. **filters 값이 빈 문자열**: 빈 문자열은 *필터 해제*로 간주돼 URL에서 제거됩니다. 빈 문자열을 *명시적 값*으로 쓰지 마세요.

### 무한스크롤 (`useInfiniteScroll`)

8. **첫 페이지 높이 부족 → 즉시 무한 루프**: 첫 응답이 화면 높이를 못 채우면 sentinel이 _즉시 보이는_ 상태라 다음 페이지를 자동 호출. `getNextPageParam`이 `undefined`를 반환할 때까지 멈추지 않습니다 — 백엔드 페이지 종료 조건을 _반드시_ 정확히 구현.
9. **sentinel 조건부 렌더링**: `{hasNextPage && <div ref={...} />}`처럼 sentinel을 조건부로 렌더링하면 ref 콜백이 disconnect → 다시 mount → 즉시 fetch 반복이 발생할 수 있습니다. *항상 렌더링*하고 분기는 옵저버 내부의 `hasNextPage` 검사에 맡기세요.
10. **`hasNextPage`가 `undefined`**: 첫 fetch 전 또는 `getNextPageParam` 미정의 시 `undefined`. 훅에 넘길 때 반드시 `hasNextPage ?? false`.
11. **모달 / 탭 비활성 중 백그라운드 로드**: 화면에 안 보이는데 sentinel은 _DOM에 있어서_ 트리거될 수 있음 — `enabled: false`로 일시 정지.
12. **무한스크롤 페이지에서 뒤로가기 → 스크롤 위치 손실**: TanStack Query 캐시는 살아있지만 *스크롤 위치*는 브라우저가 복원하지 못합니다. 도메인이 직접 `sessionStorage`로 저장/복원 (baseline 정책상 도메인 영역).

---

## 📑 다음 단계 (Phase 5-J 후속)

이 가이드는 5-J가 진행되면서 아래 섹션이 추가됩니다:

- **토스트 사용 패턴** — sonner 호출 시점, 낙관적 업데이트 회복

---

## 📎 관련 문서

- **baseline 경계 정책**: [`../PRD.md`](../PRD.md) `🎨 baseline 경계 정책`
- **API 통신 패턴**: [`./api-pattern.md`](./api-pattern.md)
- **클라이언트 상태 관리**: [`./state-client.md`](./state-client.md)
