# 낙관적 업데이트 패턴

이 문서는 baseline에서 _좋아요 / 즐겨찾기 / 장바구니 / 투표_ 등 _빈도 9~10/10_ 횡단 패턴을 TanStack Query로 일관되게 처리하는 표준을 정의합니다.

> 이 가이드는 PRD `🎨 baseline 경계 정책`의 **Layer 1 (behavior)** 영역입니다. baseline이 *캐시 갱신 흐름과 롤백 안전성*을, 도메인이 *사용자에게 보이는 메시지와 시각 피드백*을 결정합니다.

---

## 🎯 한 줄 요약

**서버 응답을 기다리지 않고 _즉시_ UI에 변경 결과를 반영**한 뒤, 실패 시 자동 롤백합니다. 사용자 인지 지연(타이핑 → 좋아요 → 색깔 바뀜)이 *0ms*가 되어 *내 것이 즉시 반응*하는 인터랙션이 됩니다.

baseline은 `applyOptimisticUpdate` 헬퍼 1개만 제공 — 표준 4단계 중 *빠뜨리기 쉬운 cancel 단계를 자동화*하고 *rollback 클로저*를 반환합니다.

---

## 🛠 baseline 설정 (이미 동봉)

- `src/lib/query/optimistic.ts` — `applyOptimisticUpdate<TData>()` 함수 1개

```ts
import { applyOptimisticUpdate } from '@/lib/query/optimistic'
```

도메인이 별도 설치 / 등록할 작업 없음.

---

## 🧭 언제 낙관적 업데이트인가

| 상황                                                | 낙관적? | 이유                                                                                         |
| --------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| 좋아요 / 북마크 / 즐겨찾기 / 관심 (불리언 토글)     | ✅      | 결과 _확실히 예측 가능_ — 실패 확률 낮음, UX 가치 높음                                       |
| 장바구니 수량 +/-                                   | ✅      | 사용자가 *기대하는 결과*가 자명                                                              |
| 투표 / 별점 클릭                                    | ✅      | 즉시 피드백이 _상호작용 본질_                                                                |
| 댓글 / 게시물 _작성_                                | ⚠️      | 임시 ID 처리 필요 — *간단*하지만 _일관성_ 주의 (리스트에 _임시 항목_ 표시 후 서버 ID로 교체) |
| 정렬 / 필터 변경                                    | ❌      | 결과를 _예측 불가_ — 서버 응답이 진실                                                        |
| 결제 / 환불 / 권한 변경                             | ❌      | 실패 비용이 큼 — _서버 응답 후_ 표시가 안전                                                  |
| 비동기 검증이 필요한 액션 (이메일 중복 체크 등)     | ❌      | 서버가 _권위_                                                                                |
| 페이지네이션 / 무한스크롤로 _보이지 않는_ 항목 변경 | ❌      | 캐시 갱신 비용 > UX 효과                                                                     |

**결정 기준 한 줄**: *결과를 사용자가 90%+ 확률로 예측 가능*하고 _실패 비용이 작은_ 액션만 낙관적.

---

## 🧱 TanStack Query 표준 4단계

```
사용자 클릭
  │
  ▼
1. cancelQueries     ← 진행 중 refetch가 낙관적 결과를 덮어쓰지 못하게
  │
  ▼
2. snapshot          ← 롤백용 이전 데이터 보관
  │
  ▼
3. setQueryData      ← 캐시 즉시 업데이트 (UI 반영)
  │
  ▼
4. mutation 실행
  │
  ├─ 성공 → onSettled에서 invalidateQueries (서버 진실로 정렬)
  │
  └─ 실패 → onError에서 setQueryData(이전 데이터) (롤백)
```

`applyOptimisticUpdate`는 1~3단계를 _한 호출로_ 캡슐화하고 4번 분기에 쓸 *rollback 클로저*를 반환합니다.

---

## ✍️ 사용 패턴

### 패턴 1 — 단순 토글 (좋아요)

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyOptimisticUpdate } from '@/lib/query/optimistic'
import { postKeys } from '@/features/posts'

type Post = { id: string; liked: boolean; likeCount: number }

export function useToggleLikeMutation(postId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.post(`posts/${postId}/like`).json<void>(),

    onMutate: async () => {
      return await applyOptimisticUpdate<Post>(
        qc,
        postKeys.detail(postId),
        old =>
          old
            ? {
                ...old,
                liked: !old.liked,
                likeCount: old.likeCount + (old.liked ? -1 : 1),
              }
            : (old as Post)
      )
    },

    onError: (_err, _input, ctx) => {
      ctx?.rollback()
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: postKeys.detail(postId) })
    },
  })
}
```

**주의**: `onMutate`의 *반환값*이 `onError` / `onSettled`의 `ctx` 매개변수로 전달됩니다. TanStack Query 표준 흐름.

---

### 패턴 2 — 리스트 항목 추가/삭제 (즐겨찾기 추가)

```tsx
type FavoriteItem = { id: string; name: string }
type FavoriteList = { items: FavoriteItem[] }

export function useAddFavoriteMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (item: FavoriteItem) =>
      apiClient.post('favorites', { json: item }).json<void>(),

    onMutate: async newItem => {
      return await applyOptimisticUpdate<FavoriteList>(
        qc,
        favoriteKeys.list(),
        old => ({ items: [...(old?.items ?? []), newItem] })
      )
    },

    onError: (_err, _input, ctx) => ctx?.rollback(),
    onSettled: () => qc.invalidateQueries({ queryKey: favoriteKeys.list() }),
  })
}
```

---

### 패턴 3 — 다중 쿼리 동시 갱신 (목록 + 상세)

좋아요 토글이 *상세 페이지*와 _리스트의 같은 항목_ 두 곳에 영향을 주는 경우, 헬퍼를 *여러 번 호출*하고 rollback을 모두 실행합니다.

```ts
onMutate: async ({ postId }) => {
  const detailRollback = await applyOptimisticUpdate<Post>(
    qc, postKeys.detail(postId),
    (old) => old ? { ...old, liked: !old.liked } : (old as Post),
  )
  const listRollback = await applyOptimisticUpdate<PostList>(
    qc, postKeys.list(),
    (old) => old ? {
      ...old,
      items: old.items.map(p => p.id === postId ? { ...p, liked: !p.liked } : p),
    } : (old as PostList),
  )
  return { detailRollback, listRollback }
},
onError: (_err, _input, ctx) => {
  ctx?.detailRollback.rollback()
  ctx?.listRollback.rollback()
},
onSettled: ({ postId } = {}) => {
  if (postId) {
    qc.invalidateQueries({ queryKey: postKeys.detail(postId) })
    qc.invalidateQueries({ queryKey: postKeys.list() })
  }
},
```

> 영향 받는 *쿼리 키 패턴*을 한 번에 무효화하려면 `qc.invalidateQueries({ queryKey: postKeys.all })`처럼 *상위 키*를 무효화 — Query Key Factory의 hierarchical 구조가 여기서 빛납니다 (`api-pattern.md` 참조).

---

## 🍞 토스트 통합 (`toast-pattern.md`와 연결)

낙관적 업데이트 *자체*는 *성공이 기본 가정*이라 `toast.success`가 *과함*입니다. _실패 시에만_ 토스트를 띄우는 게 표준.

```ts
import { toast } from 'sonner'
import { isApiError } from '@/lib/api/errors'

onError: (err, _input, ctx) => {
  ctx?.rollback()

  // 4xx 비즈니스 오류 → 메시지 매핑 후 인라인이 1순위, 토스트는 폴백
  if (isApiError(err) && err.status >= 400 && err.status < 500) {
    return // 도메인이 인라인 처리 (예: tooltip)
  }

  // 5xx / 네트워크 → 토스트로 알림 (사용자가 명시적으로 한 액션이라 OK)
  toast.error('잠시 후 다시 시도해 주세요', {
    description: '서버에 일시적인 문제가 있습니다.',
  })
},
```

`toast-pattern.md`의 _4xx 인라인 / 5xx 폴백_ 정책 그대로 적용.

---

## ⚠️ 함정 6선

### 함정 1 — `cancelQueries`를 빠뜨리고 setQueryData만 호출

```ts
// ❌ 진행 중 refetch가 낙관적 결과를 덮어쓰는 race condition 발생
qc.setQueryData(key, updater)
```

**해결**: `applyOptimisticUpdate` 헬퍼를 통해 cancel을 자동화. 직접 작성 시 반드시 `await qc.cancelQueries({ queryKey })` 먼저.

---

### 함정 2 — `setQueryData`에 mutation 객체 전달

```ts
// ❌ TanStack Query는 객체 참조 동일성으로 변경 감지 — 같은 참조면 리렌더링 안 됨
qc.setQueryData(key, old => {
  old.liked = true // 직접 변이
  return old
})

// ✅ 새 객체 반환
qc.setQueryData(key, old => (old ? { ...old, liked: true } : old))
```

**원칙**: TanStack Query의 `setQueryData`는 *immutable update*가 필수.

---

### 함정 3 — 빠른 연속 클릭 시 잘못된 스냅샷 캡처

좋아요 → (서버 응답 전) 다시 좋아요 클릭 → 두 번째 onMutate가 *첫 번째의 낙관적 결과*를 스냅샷으로 잡음 → 첫 번째 실패 시 *두 번째 결과로 롤백*되는 부정합.

**해결**:

- 버튼을 `disabled={mutation.isPending}`으로 잠금 (UI 1차 방어)
- 또는 `mutation.options.onMutate` 안에서 `await qc.cancelQueries`로 _진행 중 mutation도 차단되는지_ TanStack Query 동작 확인 (cancelQueries는 *쿼리*만 취소, mutation은 별도)
- 도메인 정책으로 *연속 토글 허용*이라면 *마지막 클릭의 의도*를 진실로 받아들이고 onSettled에서 invalidate로 정렬

---

### 함정 4 — `invalidateQueries`를 onSuccess에서 호출

```ts
// ❌ onSuccess는 성공 시에만 호출 — 실패 시 invalidate가 안 일어나
onSuccess: () => qc.invalidateQueries({ queryKey })

// ✅ 성공/실패 모두에서 invalidate (서버 진실로 정렬)
onSettled: () => qc.invalidateQueries({ queryKey })
```

**예외**: 실패 후 *캐시를 일부러 stale 상태로 유지*하고 싶다면 `onSuccess`만 사용 — 단 의도적 결정이어야 함.

---

### 함정 5 — `old`가 `undefined`일 때 처리 누락

쿼리가 _아직 fetch 안 된_ 상태에서 mutation을 일으키면 `old === undefined`. updater 안에서 분기 처리 필수.

```ts
// ❌ undefined 시 런타임 에러
old => ({ ...old, liked: true })

// ✅ undefined 보호 (또는 mutation을 페이지 로드 후로 미루는 UI 정책)
old => (old ? { ...old, liked: true } : (old as Post))
```

**원칙**: 낙관적 업데이트는 *쿼리가 적어도 한 번은 fetch된 후*에만 의미 있음. UI 단에서 `query.isSuccess` 가드 후 mutation 호출이 안전.

---

### 함정 6 — 페이지네이션 / 무한스크롤 캐시의 부분 갱신

`useInfiniteQuery`의 캐시는 `pages: Page[]` 구조라 *특정 페이지의 특정 항목*을 갱신하려면 `pages.map(page => page.items.map(...))` 중첩 변이가 필요. 실수가 흔함.

**해결**:

- _작은 영향_(좋아요 토글)이면 인 메모리 갱신 + onSettled에서 _전체_ invalidate
- _큰 영향_(아이템 자체 삭제)이면 _낙관적 X_ — 서버 응답 후 invalidate가 단순하고 안전

```ts
// 무한스크롤 페이지 구조 갱신 예시
qc.setQueryData<{ pages: { items: Post[] }[] }>(key, old =>
  old
    ? {
        ...old,
        pages: old.pages.map(page => ({
          ...page,
          items: page.items.map(p =>
            p.id === postId ? { ...p, liked: !p.liked } : p
          ),
        })),
      }
    : old
)
```

---

## 🧰 추가 패턴

### 임시 ID로 _작성_ 액션 처리 (댓글 / 게시물)

작성한 항목에 *서버가 발급할 ID*가 아직 없을 때:

```ts
const tempId = `temp-${Date.now()}`

onMutate: async (input) => {
  return await applyOptimisticUpdate<CommentList>(
    qc, commentKeys.list(),
    (old) => ({
      items: [...(old?.items ?? []), { id: tempId, ...input, pending: true }],
    }),
  )
},
onSuccess: (response) => {
  // 서버 ID로 교체 — invalidate가 단순한 경우 onSettled의 invalidate에 맡김
},
```

UI 측에서 `pending: true` 항목은 *회색 처리*나 *스피너*로 표시 — 도메인 자유.

---

## 📎 관련 문서

- [`./api-pattern.md`](./api-pattern.md) — Query Key Factory + mutation 훅 패턴
- [`./toast-pattern.md`](./toast-pattern.md) — 낙관적 업데이트 실패 시 토스트 정책
- [`./list-pattern.md`](./list-pattern.md) — 무한스크롤 / 페이지네이션 캐시 구조
