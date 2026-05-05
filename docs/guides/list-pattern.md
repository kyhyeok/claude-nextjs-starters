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

## 🚫 함정 모음

1. **표준 키와 충돌하는 자유 필터 키**: 도메인 필터에 `q` / `page` / `size` / `sort` / `order`를 _절대_ 사용하지 마세요. baseline이 가로챕니다.
2. **검색/필터 변경 시 page 미리셋**: 위 예시처럼 항상 `setParams({ q, page: 1 })`. 빠뜨리면 빈 결과 버그.
3. **페이지 크기 동적 변경 시 page 미리셋**: `size: 50 → 100` 변경 시에도 현재 페이지가 범위 밖일 수 있음. `setParams({ size, page: 1 })`.
4. **`useSearchParams()`는 client-only**: 사용 컴포넌트에 `'use client';` 필수. 안 그러면 빌드 실패.
5. **scroll 이슈**: 훅은 `{ scroll: false }`로 호출 — 페이지 변경 시 *맨 위로 스크롤되는 것*을 막습니다. 페이지네이션처럼 _스크롤이 필요하면_ 도메인이 직접 `window.scrollTo`.
6. **default 값 URL 미제거**: `value === default`이면 URL에서 자동 제거됩니다. 도메인이 `?page=1`을 기대하면 안 됨 — `params.page === 1`을 보고 판단.
7. **filters 값이 빈 문자열**: 빈 문자열은 *필터 해제*로 간주돼 URL에서 제거됩니다. 빈 문자열을 *명시적 값*으로 쓰지 마세요.

---

## 📑 다음 단계 (Phase 5-J 후속)

이 가이드는 5-J가 진행되면서 아래 섹션이 추가됩니다:

- **무한스크롤** (`useInfiniteList`) — 페이지네이션 대안
- **Empty / Error / Skeleton 프리미티브** — 표시 상태별 표준 컴포넌트 (slot 패턴)
- **토스트 사용 패턴** — sonner 호출 시점, 낙관적 업데이트 회복

---

## 📎 관련 문서

- **baseline 경계 정책**: [`../PRD.md`](../PRD.md) `🎨 baseline 경계 정책`
- **API 통신 패턴**: [`./api-pattern.md`](./api-pattern.md)
- **클라이언트 상태 관리**: [`./state-client.md`](./state-client.md)
