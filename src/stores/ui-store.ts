import { create } from 'zustand'

/**
 * 도메인 무관 UI 토글 상태를 다루는 표준 store.
 *
 * baseline 경계 정책 (PRD `🎨 baseline 경계 정책` 참조):
 * - Layer 1 (behavior) — UI 컴포넌트 자체는 도메인이 자유롭게 결정
 * - 도메인 명사가 들어간 store(`cart`, `chat`, `pet`, `restaurant` 등)는
 *   baseline에 두지 않음. 도메인 시점에 `src/stores/<도메인>-store.ts`로 추가.
 *
 * 무엇을 여기에 둘 수 있나:
 * - 어디서나 토글 가능한 UI 상태 (sidebar, command palette 등)
 * - 컴포넌트 트리를 가로지르는 임시 UI 플래그
 *
 * 무엇을 두지 말아야 하나:
 * - 서버에서 가져오는 데이터 → TanStack Query (`@/features/<도메인>`)
 * - 다크모드 → `next-themes` (이미 동봉)
 * - 폼 입력 상태 → React Hook Form (이미 동봉)
 */
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
