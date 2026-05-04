# 스타일링 가이드

이 문서는 TailwindCSS v4 + shadcn/ui를 활용한 스타일링 규칙과 모범 사례를 제공합니다.

---

## 📱 Mobile-First 원칙 (★ 필독)

이 baseline은 **모바일 우선(mobile-first)** 작성 방식을 채택합니다. Tailwind / shadcn / next-themes 모두 이 방식과 자연스럽게 맞물립니다.

### 핵심 컨벤션

| 항목                        | 규칙                                           |
| --------------------------- | ---------------------------------------------- |
| **베이스 클래스**           | 모바일 스타일 (375px 기준)                     |
| **`sm:` `md:` `lg:` `xl:`** | *그 너비 이상*에서 적용 — 모바일 위에 _덧붙임_ |
| **터치 타겟**               | 모바일 최소 44px (Apple HIG) — 버튼/링크 크기  |
| **폰트 베이스**             | 16px 이상 (iOS 자동 줌인 방지)                 |
| **가로 스크롤**             | **절대 금지** — 모든 viewport에서              |

### 단계별 작업 흐름

#### Step 1 — 디자인/와이어프레임 확보

- 모바일 + PC 시안 _둘 다_ 받기. 하나만 있으면 충돌 발생
- 디자인 부재 시 와이어프레임을 **모바일부터** 그림

#### Step 2 — 브레이크포인트 합의

- Tailwind 기본: `sm:640 / md:768 / lg:1024 / xl:1280 / 2xl:1536`
- 4개로 충분: 모바일 / 태블릿 / PC / 와이드

#### Step 3 — HTML 구조 설계

- **같은 HTML로 모바일/PC 모두 표현** 가능하게
- 모바일은 _세로 선형_, PC는 *가로 분할*이 가장 흔한 변형

#### Step 4 — 모바일 스타일 먼저 작성

- viewport 375px 기준
- 터치 타겟 44px+, 폰트 16px+, 가로 스크롤 0

#### Step 5 — `md:` `lg:`로 _덧붙임_ (override 아님)

- 레이아웃: `flex-col md:flex-row`, `grid-cols-1 lg:grid-cols-3`
- 폰트/간격: `text-base lg:text-xl`, `p-4 lg:p-8`
- 노출 토글: `<MobileNav className="md:hidden" />` + `<DesktopNav className="hidden md:flex" />`

#### Step 6 — 검증

- DevTools 디바이스 모드: 360 / 375 / 414 / 768 / 1024 / 1280 / 1920
- **실제 디바이스 1회 이상** (Mobile Safari/Chrome은 가상 디바이스와 미묘하게 다름)
- Playwright E2E의 `mobile-ios` / `mobile-android` 프로젝트 활용 (자동 회귀 방지)

---

## 🧩 자주 쓰는 Mobile-First 패턴 6선

```tsx
// 1) 컨테이너 패딩
<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">

// 2) 그리드 컬럼 변환
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">

// 3) flex 방향 전환 (모바일=세로, PC=가로)
<div className="flex flex-col md:flex-row md:items-center md:gap-8">

// 4) 폰트 스케일
<h1 className="text-2xl md:text-3xl lg:text-5xl">

// 5) 사이드바: 모바일=Drawer/Sheet, PC=고정
<aside className="hidden lg:block lg:w-64">  {/* PC만 */}
<Sheet>...</Sheet>                            {/* 모바일 햄버거 */}

// 6) 터치 타겟 (모바일 48px, PC 40px)
<Button className="h-12 md:h-10">
```

---

## ⚠️ 흔한 함정 5선

### 1) `max-width` 미디어 쿼리(데스크톱 우선)와 섞기

```tsx
❌ 'lg:p-8 max-md:p-2'   // mobile-first와 desktop-first 혼용 — 멘탈 모델 깨짐
✅ 'p-2 lg:p-8'           // mobile-first로 통일
```

### 2) `sm:hidden`만 사용

```tsx
❌ <Foo className="sm:hidden" />  // 'sm 이상에서 숨김' = 의도 모호
✅ <Foo className="hidden md:block" />  // 모바일에서 숨김, 태블릿+ 표시
✅ <Foo className="md:hidden" />        // 모바일에서 표시, 태블릿+ 숨김
```

### 3) 데이터 테이블을 모바일에서 그대로

- 가로 스크롤 발생 → UX 최악
- 해결: 모바일은 _카드_, PC는 _테이블_

```tsx
<div className="hidden md:block"><DataTable .../></div>
<div className="md:hidden">{rows.map(r => <Card>{r}</Card>)}</div>
```

### 4) viewport 메타 태그 누락

- Next.js 16에서는 `viewport` export 사용 (이 baseline의 `app/layout.tsx`에 이미 박혀 있음)

```typescript
export const viewport = {
  width: 'device-width',
  initialScale: 1,
}
```

### 5) `next/image`의 `sizes` 누락

- 모바일에서 데스크톱 크기의 이미지를 다운로드하게 됨 → 대역폭 낭비

```tsx
<Image
  src={...}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>
```

---

## ✅ 새 컴포넌트/페이지 작성 체크리스트

- [ ] 모바일(375px)에서 가로 스크롤 없음
- [ ] 모든 버튼/링크가 터치 친화적 (h-11 이상 권장)
- [ ] 베이스 클래스가 _모바일_ 스타일, `md:`/`lg:`로 PC 덧붙임
- [ ] 노출 토글은 `hidden md:block` / `md:hidden` 명시적 패턴
- [ ] 데이터 테이블은 모바일 카드 fallback 제공
- [ ] `next/image`의 `sizes` 속성 명시
- [ ] (선택) Playwright E2E에 `mobile-ios` / `mobile-android` 프로젝트로 회귀 검증

---

## 🎨 기술 스택 개요

### 핵심 스타일링 도구

- **TailwindCSS v4**: 유틸리티 기반 CSS 프레임워크
- **shadcn/ui**: Radix UI 기반 컴포넌트 라이브러리 (new-york style)
- **next-themes**: 다크모드 지원
- **tw-animate-css**: 애니메이션 라이브러리
- **CSS Variables**: 동적 테마 시스템
- **prettier-plugin-tailwindcss**: 자동 클래스 정렬

## 🚀 TailwindCSS v4 사용 규칙

### 기본 원칙

```tsx
// ✅ 올바른 Tailwind 클래스 사용
<div className="flex items-center justify-between rounded-lg bg-background p-4 shadow-md">
  <h2 className="text-lg font-semibold text-foreground">제목</h2>
  <Button variant="outline" size="sm">버튼</Button>
</div>

// ❌ 인라인 스타일 사용 금지
<div style={{ display: 'flex', padding: '16px' }}>
  <h2 style={{ fontSize: '18px' }}>제목</h2>
</div>
```

### 클래스 작성 순서

Prettier 플러그인이 자동으로 정렬하지만, 수동 작성 시 다음 순서를 따르세요:

```tsx
<div className={cn(
  // 1. 레이아웃 (display, position)
  "flex absolute",

  // 2. 크기 (width, height, padding, margin)
  "w-full h-auto p-4 m-2",

  // 3. 타이포그래피 (font, text)
  "text-lg font-medium text-center",

  // 4. 배경 및 테두리
  "bg-background border border-border rounded-md",

  // 5. 효과 (shadow, opacity, transform)
  "shadow-lg opacity-90 hover:scale-105",

  // 6. 상호작용 (hover, focus, active)
  "hover:bg-accent focus:ring-2 active:scale-95",

  // 조건부 클래스
  isActive && "bg-primary text-primary-foreground",
  className
)}>
```

### 반응형 디자인

```tsx
// ✅ 모바일 우선 접근법
<div className={cn(
  // 기본 (모바일)
  "flex flex-col space-y-4 p-4",

  // 태블릿 (768px+)
  "md:flex-row md:space-y-0 md:space-x-6 md:p-6",

  // 데스크톱 (1024px+)
  "lg:max-w-6xl lg:mx-auto lg:p-8",

  // 대형 화면 (1280px+)
  "xl:max-w-7xl"
)}>

// ❌ 데스크톱 우선 접근법 지양
<div className="hidden lg:block md:hidden">
```

### 커스텀 클래스 최소화

```tsx
// ✅ Tailwind 유틸리티 클래스 우선 사용
<button className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">

// ❌ 커스텀 CSS 클래스 지양
<button className="custom-button">
```

## 🎭 shadcn/ui 컴포넌트 활용

### 기본 사용법

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ✅ shadcn/ui 컴포넌트 활용
export function UserCard({ user }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline">프로필 보기</Button>
      </CardContent>
    </Card>
  )
}
```

### 컴포넌트 변형 (Variants)

```tsx
// Button 컴포넌트 변형
<Button variant="default">기본 버튼</Button>
<Button variant="destructive">삭제 버튼</Button>
<Button variant="outline">아웃라인 버튼</Button>
<Button variant="secondary">보조 버튼</Button>
<Button variant="ghost">고스트 버튼</Button>
<Button variant="link">링크 버튼</Button>

// 크기 변형
<Button size="default">기본 크기</Button>
<Button size="sm">작은 크기</Button>
<Button size="lg">큰 크기</Button>
<Button size="icon">아이콘만</Button>
```

### 컴포넌트 커스터마이징

```tsx
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ✅ 기존 컴포넌트 확장
export function CustomButton({ className, ...props }) {
  return (
    <Button
      className={cn(
        'transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-lg',
        className
      )}
      {...props}
    />
  )
}

// ❌ 처음부터 새로 만들기
export function MyButton({ className, ...props }) {
  return (
    <button
      className="bg-blue-500... px-4 py-2" // 긴 클래스 나열
      {...props}
    />
  )
}
```

### 새 shadcn/ui 컴포넌트 추가

```bash
# 컴포넌트 추가
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog

# 모든 컴포넌트 확인
npx shadcn@latest add
```

## 🌓 다크모드 구현

### next-themes 활용

```tsx
// providers/theme-provider.tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children, ...props }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
```

### 테마 토글 컴포넌트

```tsx
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span className="sr-only">테마 전환</span>
    </Button>
  )
}
```

### 다크모드 대응 스타일링

```tsx
// ✅ 시맨틱 색상 변수 사용
<div className="bg-background text-foreground">
  <h1 className="text-primary">제목</h1>
  <p className="text-muted-foreground">설명</p>
</div>

// ❌ 하드코딩된 색상 사용
<div className="bg-white text-black dark:bg-black dark:text-white">
  <h1 className="text-blue-600 dark:text-blue-400">제목</h1>
</div>
```

## 🎨 색상 시스템

### CSS 변수 기반 색상

`src/app/globals.css`에 정의된 색상 변수:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 224 71.4% 4.1%;
  --primary: 220.9 39.3% 11%;
  --primary-foreground: 210 20% 98%;
  --secondary: 220 14.3% 95.9%;
  --secondary-foreground: 220.9 39.3% 11%;
  --muted: 220 14.3% 95.9%;
  --muted-foreground: 220 8.9% 46.1%;
  --accent: 220 14.3% 95.9%;
  --accent-foreground: 220.9 39.3% 11%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 20% 98%;
  --border: 220 13% 91%;
  --input: 220 13% 91%;
  --ring: 224 71.4% 4.1%;
}
```

### 색상 사용 예시

```tsx
// ✅ 시맨틱 색상 클래스 사용
<div className="bg-background border-border">
  <h1 className="text-foreground">메인 텍스트</h1>
  <p className="text-muted-foreground">보조 텍스트</p>
  <Button className="bg-primary text-primary-foreground">버튼</Button>
</div>

// ❌ 직접 색상 지정
<div className="bg-white border-gray-200">
  <h1 className="text-gray-900">메인 텍스트</h1>
  <p className="text-gray-600">보조 텍스트</p>
</div>
```

## ✨ 애니메이션 가이드

### tw-animate-css 활용

```tsx
import 'tw-animate-css'

// ✅ 내장 애니메이션 사용
<div className="animate-fadeIn">페이드 인</div>
<div className="animate-slideUp">슬라이드 업</div>
<div className="animate-bounce">바운스</div>

// ✅ Tailwind transition 활용
<button className="transition-all duration-200 hover:scale-105 hover:shadow-lg">
  호버 효과
</button>

// ✅ 복합 애니메이션
<div className="transform transition-transform duration-300 hover:scale-110 hover:rotate-3">
  복합 효과
</div>
```

### 성능 고려사항

```tsx
// ✅ will-change 사용으로 성능 최적화
<div className="will-change-transform transition-transform hover:scale-105">

// ✅ 애니메이션 종료 후 will-change 제거
<div className="hover:will-change-transform transition-transform hover:scale-105">
```

## 📱 반응형 디자인 패턴

### 컨테이너 패턴

```tsx
// ✅ 반응형 컨테이너
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  <div className="max-w-7xl mx-auto">
    {/* 컨텐츠 */}
  </div>
</div>

// ✅ 그리드 레이아웃
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {items.map(item => (
    <Card key={item.id}>...</Card>
  ))}
</div>
```

### 네비게이션 패턴

```tsx
// ✅ 반응형 네비게이션
<nav className="flex items-center justify-between p-4">
  <div className="flex items-center space-x-4">
    <Logo />
    <div className="hidden md:flex md:space-x-6">
      <NavLink href="/about">소개</NavLink>
      <NavLink href="/contact">연락처</NavLink>
    </div>
  </div>

  {/* 모바일 메뉴 */}
  <div className="md:hidden">
    <MobileMenu />
  </div>
</nav>
```

## 🛠️ 유틸리티 함수

### cn() 헬퍼 함수

```tsx
import { cn } from '@/lib/utils'

// ✅ cn() 함수로 클래스 조합
<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  variant === 'primary' && "primary-classes",
  className // props에서 받은 추가 클래스
)}>

// ❌ 수동 문자열 조합
<div className={`base-classes ${condition ? 'conditional-classes' : ''} ${className || ''}`}>
```

### 조건부 스타일링

```tsx
// ✅ 조건부 클래스 적용
<Button
  className={cn(
    "base-button-styles",
    isLoading && "opacity-50 cursor-not-allowed",
    variant === 'destructive' && "bg-destructive text-destructive-foreground",
    size === 'sm' && "px-2 py-1 text-sm"
  )}
  disabled={isLoading}
>

// ❌ 복잡한 삼항 연산자
<Button
  className={
    isLoading
      ? "opacity-50 cursor-not-allowed"
      : variant === 'destructive'
        ? "bg-red-500 text-white"
        : "bg-blue-500 text-white"
  }
>
```

## 🚫 금지사항

### ❌ 피해야 할 패턴

```tsx
// 인라인 스타일 사용
<div style={{ backgroundColor: 'red' }}>

// 긴 클래스명 하드코딩
<div className="w-full h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold text-2xl shadow-2xl rounded-lg border-4 border-white">

// 중복된 스타일 정의
<div className="p-4 padding-4 pt-4 pb-4 pl-4 pr-4">

// !important 남용
<div className="!text-red-500 !bg-blue-500">

// Tailwind와 CSS 모듈 혼재
<div className={`${styles.customClass} flex items-center`}>
```

### ❌ 잘못된 색상 사용

```tsx
// 하드코딩된 색상
<div className="bg-gray-100 text-gray-900">

// 다크모드 미고려
<div className="bg-white text-black">

// 접근성 미고려
<button className="bg-red-200 text-red-300">저대비 버튼</button>
```

## ✅ 스타일링 체크리스트

새 컴포넌트 작성 시 확인사항:

### 기본 사항

- [ ] TailwindCSS 유틸리티 클래스 우선 사용
- [ ] cn() 함수로 클래스 조합
- [ ] 시맨틱 색상 변수 사용
- [ ] 반응형 디자인 적용

### 다크모드

- [ ] 다크모드 대응 색상 사용
- [ ] 하드코딩된 색상 없음
- [ ] 테마 전환 시 깨짐 없음

### 성능

- [ ] 불필요한 애니메이션 없음
- [ ] will-change 적절히 사용
- [ ] 인라인 스타일 없음

### 접근성

- [ ] 충분한 색상 대비
- [ ] 포커스 상태 스타일링
- [ ] 스크린 리더 고려

### 유지보수

- [ ] 일관된 클래스 순서
- [ ] 재사용 가능한 컴포넌트 활용
- [ ] 의미있는 클래스 조합

이 가이드를 따라 일관성 있고 아름다운 UI를 구현해보세요!
