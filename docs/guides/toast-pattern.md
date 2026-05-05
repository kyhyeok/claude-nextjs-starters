# 토스트 사용 패턴 (sonner)

이 문서는 baseline에서 *언제 토스트를 띄우고 / 띄우지 말지*와 *어떻게 호출할지*의 표준 패턴을 정의합니다.

> 이 가이드는 PRD `🎨 baseline 경계 정책`의 **Layer 1 (behavior)** 영역입니다. 토스트 _라이브러리_(sonner)와 *Toaster 위치*는 baseline이, *메시지 / 톤 / 액션*은 도메인이 결정합니다.

---

## 🎯 한 줄 요약

**사용자가 _명시적으로 일으킨_ 비동기 액션의 결과**만 토스트로 알립니다. 백그라운드 자동 갱신, 폼 검증 오류, 페이지 진입 시 자동 fetch 결과는 토스트 X.

---

## 🛠 baseline 설정 (이미 동봉)

- `src/components/ui/sonner.tsx` — shadcn `<Toaster/>` (next-themes와 자동 동기화)
- `src/app/layout.tsx`에 `<Toaster/>` 등록 — 모든 페이지에서 호출 가능
- 호출 API: `import { toast } from 'sonner';`

도메인이 별도 설치 / 등록할 작업 없음.

---

## 🧭 언제 토스트인가 — 호출 시점 의사결정

| 상황                                  | 토스트?          | 이유                                           |
| ------------------------------------- | ---------------- | ---------------------------------------------- |
| mutation 성공 (사용자 명시 액션)      | ✅               | "내가 한 일이 되었구나" 확인                   |
| 4xx 비즈니스 오류 (폼 필드 매핑 가능) | ❌ → 인라인      | `applyApiErrorToForm` 헬퍼가 폼 에러로 매핑    |
| 4xx 비즈니스 오류 (필드 매핑 불가)    | ✅ (폴백)        | 예: 401 잘못된 자격증명, 403 권한 없음         |
| 5xx 서버 오류 / 네트워크 오류         | ✅               | 사용자가 *재시도*를 결정해야 함                |
| 폼 클라이언트 검증 오류 (Zod)         | ❌               | 인라인 `<FormMessage/>`로 충분, 위치도 더 명확 |
| 백그라운드 자동 갱신 성공             | ❌               | 사용자가 *요청한 적*이 없음                    |
| 백그라운드 자동 갱신 실패             | ❌ (또는 조용히) | 다음 시도에서 회복되면 됨                      |
| 낙관적 업데이트 _롤백_                | ✅               | 사용자가 본 *즉각 변경*이 되돌려졌음을 알림    |

> **인라인 우선 원칙**: 폼 / 카드 / 버튼 옆에 *인라인*으로 표시할 수 있다면 토스트보다 *그게 먼저*입니다. 토스트는 _컨텍스트가 멀거나 화면 전체에 영향을 미치는_ 결과에 사용.

---

## 📐 표준 패턴 — mutation 훅 + RHF 결합

baseline의 `login-form.tsx`가 표준입니다 (그대로 복사·변형):

```tsx
const onSubmit = (values: LoginFormValues) => {
  login(
    { email: values.email, password: values.password },
    {
      onSuccess: () => {
        toast.success('로그인되었습니다')
        router.replace(returnTo)
      },
      onError: error => {
        // 1) 4xx 필드 매핑 가능 → 인라인
        const mapped = applyApiErrorToForm(error, form.setError)
        // 2) 매핑 불가 / 5xx → 토스트 폴백
        if (!mapped) toast.error(error.message)
      },
    }
  )
}
```

이 3단계 우선순위가 baseline 표준:

1. **성공 → `toast.success`** (사용자 액션 결과 확인)
2. **4xx 매핑 가능 → 인라인 폼 에러** (`applyApiErrorToForm`)
3. **그 외 (4xx 매핑 불가 / 5xx / 네트워크) → `toast.error` 폴백**

> 자세한 ApiError 매핑 흐름은 [`./forms-react-hook-form.md`](./forms-react-hook-form.md) 참조.

---

## ✍️ 메시지 작성 가이드

### 톤

- **간결**: 1줄, 30자 이내가 권장. 토스트는 사라지므로 *읽는 시간*이 짧음.
- **결과 중심**: "저장 중..." X → "저장되었습니다" O. 진행 중은 *버튼 spinner*가 더 적합.
- **사용자 언어**: "PUT 200 OK" 같은 기술 용어 X. "저장되었습니다" O.

### 길이

- 30자 초과 → 토스트가 부적절. 모달이나 인라인으로 옮길 것을 검토.
- 다국어 환경이라면 i18n 키로 (i18n 가이드 참조).

### 톤 매핑 (sonner API)

| API             | 사용                                  |
| --------------- | ------------------------------------- |
| `toast.success` | 명시 액션 성공                        |
| `toast.error`   | 명시 액션 실패 / 5xx                  |
| `toast.info`    | 사용자가 _요청한_ 정보 제공           |
| `toast.warning` | 위험 액션 직전 / 데이터 손실 가능성   |
| `toast`         | 무톤 — 톤 결정이 어색한 경우만        |
| `toast.loading` | _긴_ 비동기 작업의 진행 상태 (드물게) |

> `toast.loading`은 _3초+_ 비동기에만. 일반 mutation은 *버튼 spinner*가 더 명확합니다.

### 한국어 메시지 예시

| 상황                 | 권장 메시지                           |
| -------------------- | ------------------------------------- |
| 일반 저장 성공       | `저장되었습니다`                      |
| 게시글 작성 성공     | `게시글이 등록되었습니다`             |
| 삭제 성공            | `삭제되었습니다`                      |
| 인증 실패            | `이메일 또는 비밀번호를 확인해주세요` |
| 5xx                  | `잠시 후 다시 시도해주세요`           |
| 네트워크 오류        | `네트워크 연결을 확인해주세요`        |
| 권한 없음            | `이 작업을 수행할 권한이 없습니다`    |
| 낙관적 업데이트 롤백 | `변경 사항을 저장하지 못했습니다`     |

---

## 🔘 토스트 액션 (실행 취소 등)

```tsx
toast.success('게시글이 삭제되었습니다', {
  action: {
    label: '실행 취소',
    onClick: () => restorePost(postId),
  },
})
```

> **사용 시점**: 되돌릴 수 있는 _파괴적 액션_(삭제, 보관처리, 차단 등). 단순 저장에는 _과한_ UX.

---

## 🌗 다크모드 / 테마

baseline의 `<Toaster/>`가 `next-themes`와 자동 동기화되어 라이트/다크에서 일관되게 표시됩니다. 도메인이 추가 설정 X.

색을 브랜드에 맞추려면 `globals.css`의 다음 변수만 갈아끼우면 됩니다 (PRD `🎨 baseline 경계 정책` _디자인 토큰 분리_):

- `--popover` / `--popover-foreground` — 토스트 배경/글자
- `--destructive` / `--destructive-foreground` — `toast.error` 강조

---

## 🚫 함정

1. **`isLoading` 상태에 토스트**: 진행 상태는 *버튼 spinner / Skeleton*으로. 토스트는 *완료된 결과*만.
2. **검증 오류를 토스트로**: 폼 검증은 인라인 `<FormMessage/>`. 토스트는 *필드 위치*를 알려주지 못함 — 사용자가 어디를 고쳐야 할지 모름.
3. **너무 많은 토스트 동시 띄움**: sonner는 자동 stacking 하지만 *3개 이상*은 정보 과부하. mutation 묶음의 *마지막 결과*만 띄울 것.
4. **sensitive 정보 노출**: API key / token / 사용자 ID 등을 메시지에 _절대_ 노출 X. 백엔드 `error.message`를 그대로 띄울 때도 검토 필요.
5. **`toast.dismiss()` 남용**: 사용자 직전 토스트를 _임의로_ 닫지 마세요. 다음 메시지가 즉시 떠야 한다면 sonner가 알아서 stack 처리.
6. **mutation `onSuccess` 없이 토스트**: TanStack Query의 `onSuccess` *콜백*에 토스트를 두세요. 컴포넌트 본문에 두면 _재렌더 때마다_ 토스트가 뜸.
7. **prettier 의존 메시지**: 메시지에 \\n을 넣지 마세요. 한 줄로. 두 줄 이상이면 *description*으로 분리: `toast.success('저장됨', { description: '잠시 후 반영됩니다' })`.

---

## 📑 다음 단계 (Phase 5-K 후속)

- **낙관적 업데이트 + 토스트 회복 패턴** — `useFavoriteMutation` 가이드(5-K)에서 _롤백 시 토스트로 사용자에게 알리는_ 전체 패턴 다룸

---

## 📎 관련 문서

- **baseline 경계 정책**: [`../PRD.md`](../PRD.md) `🎨 baseline 경계 정책`
- **API 통신 패턴 (ApiError 흐름)**: [`./api-pattern.md`](./api-pattern.md)
- **폼 처리 (`applyApiErrorToForm` 헬퍼)**: [`./forms-react-hook-form.md`](./forms-react-hook-form.md)
- **클라이언트 상태**: [`./state-client.md`](./state-client.md)
- **리스트 패턴**: [`./list-pattern.md`](./list-pattern.md)
