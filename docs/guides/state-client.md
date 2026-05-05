# 클라이언트 상태 관리 가이드 (Zustand)

이 문서는 baseline에서 *서버 상태*와 *클라이언트 상태*를 어떻게 분리하고, 클라이언트 UI 상태를 Zustand로 어떻게 다루는지 정의합니다.

> 이 가이드는 PRD `🎨 baseline 경계 정책`의 **Layer 1 (behavior)** 영역입니다. *훅과 데이터 구조*만 baseline이 제공하고, *UI 컴포넌트*는 도메인이 자유롭게 결정합니다.

---

## 🎯 한 줄 요약

서버에서 가져오는 데이터는 **TanStack Query**, 클라이언트에서만 살아있는 UI 상태는 **Zustand**. 둘을 절대 섞지 않습니다.

---

## 🧭 상태의 종류와 도구 매핑

| 상태 종류                   | 도구                            | 예시                                      |
| --------------------------- | ------------------------------- | ----------------------------------------- |
| 서버에서 fetch한 데이터     | TanStack Query (`@/features/*`) | 사용자 목록, 상품, 게시글, 알림 데이터    |
| 폼 입력값                   | React Hook Form (`useForm`)     | 로그인 폼, 가입 폼                        |
| 다크모드 / 테마             | `next-themes`                   | 라이트/다크 토글                          |
| URL 동기 상태               | URL search params               | 검색어, 필터, 페이지 번호                 |
| 컴포넌트 로컬 상태          | `useState` / `useReducer`       | 펼침 상태, 호버, 입력 임시값              |
| **트리 가로지르는 UI 상태** | **Zustand** (`@/stores/*`)      | sidebar 토글, command palette, 모달 stack |

> **분리 원칙**: *다른 도구로 충분히 표현되는 상태*는 Zustand에 넣지 않습니다. Zustand는 *다른 도구가 어색해지는 시점*부터 사용합니다.

---

## 🤔 왜 Zustand인가 (vs Jotai / Redux)

| 라이브러리    | 강점                              | 약점                             | baseline 적합도       |
| ------------- | --------------------------------- | -------------------------------- | --------------------- |
| Zustand       | 단순 / 학습 곡선 낮음 / 작은 번들 | 복잡한 atom 그래프엔 어색        | ✅ baseline 채택      |
| Jotai         | atom 단위 세밀 제어 / RSC 친화    | 학습 곡선 / 보일러플레이트 많음  | 도메인이 필요 시 교체 |
| Redux Toolkit | 복잡한 도메인 / DevTools 강력     | 외부 백엔드 통신 baseline엔 과함 | ❌ 권장 X             |

> **교체 신호**: store가 5개를 넘고 store 간 의존이 생기면 Jotai 검토. baseline 단계에선 Zustand 1~2개로 충분합니다.

---

## 📐 표준 store 패턴

baseline은 _도메인 무관 UI 토글_ store 1개를 동봉합니다 — `src/stores/ui-store.ts`.

```typescript
// src/stores/ui-store.ts (baseline 동봉)
import { create } from 'zustand'

interface UIState {
  isSidebarOpen: boolean
  isCommandPaletteOpen: boolean
}

interface UIActions {
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
}

export const useUIStore = create<UIState & UIActions>(set => ({
  isSidebarOpen: false,
  isCommandPaletteOpen: false,
  toggleSidebar: () => set(s => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: open => set({ isSidebarOpen: open }),
  toggleCommandPalette: () =>
    set(s => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen })),
  setCommandPaletteOpen: open => set({ isCommandPaletteOpen: open }),
}))
```

### 작성 컨벤션

1. **State / Actions 분리** — `interface State` + `interface Actions`로 타입 가독성 확보
2. **set은 함수형** — 이전 상태 의존 시 `set((s) => ...)` 패턴
3. **얕은 비교 가능한 값만** — 깊게 중첩된 객체는 `immer` 미들웨어 검토
4. **셀렉터로 구독** — 컴포넌트는 _필요한 필드만_ 셀렉터로 구독 (아래 참조)

---

## 🔍 셀렉터 패턴 (re-render 최적화)

```typescript
// ✅ 좋음 — 필요한 값만 구독
const isSidebarOpen = useUIStore(s => s.isSidebarOpen)
const setSidebarOpen = useUIStore(s => s.setSidebarOpen)

// ❌ 나쁨 — 전체 store 구독, 다른 필드 변경에도 re-render
const { isSidebarOpen, setSidebarOpen } = useUIStore()
```

여러 값을 동시에 가져올 땐 `useShallow`로 얕은 비교:

```typescript
import { useShallow } from 'zustand/react/shallow'

const { isSidebarOpen, isCommandPaletteOpen } = useUIStore(
  useShallow(s => ({
    isSidebarOpen: s.isSidebarOpen,
    isCommandPaletteOpen: s.isCommandPaletteOpen,
  }))
)
```

---

## 🧩 도메인 store 추가 절차

도메인이 필요로 하는 store는 baseline에 두지 않고 *도메인 영역*에 추가합니다 (PRD `🎨 baseline 경계 정책` _No Domain Nouns_).

### 위치

```
src/stores/
├── ui-store.ts          # baseline (도메인 무관)
├── cart-store.ts        # ← e커머스 도메인 시점에 추가
├── chat-store.ts        # ← 커뮤니티 도메인 시점에 추가
└── pet-profile-store.ts # ← 반려 도메인 시점에 추가
```

### 패턴 — 장바구니 store 예시 (e커머스 도메인)

```typescript
// src/stores/cart-store.ts (도메인 추가 시)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  productId: string
  quantity: number
  optionId?: string
}

interface CartState {
  items: CartItem[]
}

interface CartActions {
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  clear: () => void
}

export const useCartStore = create<CartState & CartActions>()(
  persist(
    set => ({
      items: [],
      addItem: item => set(s => ({ items: [...s.items, item] })),
      removeItem: productId =>
        set(s => ({ items: s.items.filter(i => i.productId !== productId) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'cart-storage' }
  )
)
```

> **주의**: 장바구니 *데이터*는 클라이언트 상태이지만, 결제 시 서버로 보낸 *주문*은 다시 TanStack Query 영역입니다. 둘을 헷갈리지 마세요.

---

## 💾 persist 미들웨어 (옵션)

브라우저 새로고침 후에도 살아남아야 하는 상태는 `persist`로 localStorage 저장.

```typescript
import { persist, createJSONStorage } from 'zustand/middleware';

export const useCartStore = create<...>()(
  persist(
    (set) => ({ ... }),
    {
      name: 'cart-storage',                       // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }), // 저장할 필드만
      version: 1,                                  // 스키마 변경 시 increment
    },
  ),
);
```

### SSR 함정 — Hydration 불일치

서버 렌더링 시점엔 localStorage가 없으므로 *초기값*이 다를 수 있습니다. Next.js App Router에서:

```typescript
'use client'; // persist 사용 store는 client 컴포넌트에서만 호출

const isCartReady = useCartStore.persist?.hasHydrated() ?? false;
if (!isCartReady) return <Skeleton />; // hydration 완료까지 대기
```

또는 `onRehydrateStorage` 콜백으로 hydration 시점을 캐치.

---

## 🚫 함정 모음

1. **서버 데이터를 store에 복사**: TanStack Query 캐시가 _이미_ 진실의 원천. Zustand에 또 넣으면 동기화 지옥.
2. **폼 입력값을 store에**: React Hook Form으로 충분. store는 _제출 후_ 영속이 필요할 때만.
3. **selector 없이 전체 구독**: 모든 필드 변경에 re-render. 항상 selector 사용.
4. **set 안에서 비동기 호출**: Zustand store에서 fetch는 _절대 X_. 비동기는 TanStack Query mutation/query에서.
5. **store 간 직접 import**: store가 다른 store에 의존하기 시작하면 *atom 그래프*가 필요한 신호 → Jotai 검토.
6. **persist 키 충돌**: 여러 도메인 프로젝트가 같은 도메인에서 돌면 `cart-storage` 같은 키가 충돌. _프로젝트 prefix_ 권장 (`myshop:cart-storage`).
7. **devtools 미들웨어 prod 노출**: `devtools` 미들웨어는 dev 전용 — 프로덕션 빌드에서 분기.

---

## 📎 관련 문서

- **baseline 경계 정책**: [`../PRD.md`](../PRD.md) `🎨 baseline 경계 정책`
- **API 통신 패턴 (서버 상태)**: [`./api-pattern.md`](./api-pattern.md)
- **폼 처리 (React Hook Form)**: [`./forms-react-hook-form.md`](./forms-react-hook-form.md)
