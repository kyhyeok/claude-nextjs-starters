# 📎 파일 업로드 패턴 가이드

이 baseline은 **파일 업로드 코드를 _기본 포함하지 않습니다_**. 빈도 5/10 — 60%+ 도메인이 업로드 없이 시작되고, 정작 업로드가 필요한 도메인은 *스토리지 선택 / 흐름 / 진행률 UX / 검증 정책*이 모두 달라 *공용 추상화 비용 > 효과*입니다. 이 가이드는 도입 시점에 _재작업 없이_ 표준 흐름을 따라가도록 절차를 정리합니다.

> 이 가이드는 PRD `🎨 baseline 경계 정책`의 **Layer 4 (workflow)** 영역입니다. baseline은 *흐름 결정 트리와 백엔드 합의 체크리스트*를, 도메인이 *실제 라이브러리·UX·진행률·미리보기 UI*를 자유롭게 결정합니다.

---

## 🎯 한 줄 요약

업로드는 *데이터*가 아니라 *바이트 스트림*입니다. _어디로 가느냐_(스토리지)와 _누가 책임지느냐_(presigned vs 백엔드 경유)에 따라 흐름이 갈라집니다. _크기·빈도·후처리 필요 여부_ 세 변수로 흐름 A/B/C 중 하나를 선택하세요.

---

## 🧭 흐름 결정 — A / B / C 한눈에

| 흐름                                 | 클라이언트 → 어디로?                     | 적합 상황                                                                        | Vercel 본체 트래픽 |
| ------------------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------- | ------------------ |
| **A. presigned URL ⭐ (권장)**       | 클라이언트 → _스토리지 직접_ (S3/R2/GCS) | 큰 파일(>4MB) / 빈번한 업로드 / 후처리는 webhook 또는 비동기 큐                  | ❌ 통과 안 함      |
| **B. 백엔드 다이렉트 multipart**     | 클라이언트 → _백엔드 도메인 직접_        | 백엔드가 즉시 후처리(리사이즈/OCR/AV 스캔), 백엔드가 별도 도메인이라 CORS만 합의 | ❌ 통과 안 함      |
| **C. `/api/proxy/*` 경유 multipart** | 클라이언트 → Vercel 함수 → 백엔드        | 작은 파일(<4MB) / 인증 쿠키 흐름 그대로 / 백엔드와 same-origin이 필요한 경우     | ✅ 함수 본체 통과  |

### 결정 트리

```
파일이 4MB 넘을 가능성 있나? ── YES ──> A (presigned) 또는 B (직접)
       │
       NO
       │
       ▼
백엔드가 별도 도메인(예: api.example.com)인가?
       │
       ├── YES & 후처리 즉시 필요 ──> B (직접 multipart + CORS)
       │
       └── NO 또는 same-origin 유지 ──> C (proxy 경유)
```

> **빈도 차이가 결정한다**: 같은 4MB 이미지여도 *프로필 사진 1회*면 C로 충분. *피드 게시물처럼 *빈번한* 업로드*면 A로 가야 Vercel 함수 본체 트래픽이 폭주하지 않음.

---

## ⚠️ 결정 전에 알아야 할 함정 3가지

### 1) Vercel 함수 본체 요청 크기 한도

Vercel Serverless Functions는 _기본 요청 본문 4.5MB_ 제한이 있습니다. 흐름 C(`/api/proxy/*`)는 이 제한을 _그대로 받습니다_. Edge Runtime은 더 보수적입니다.

- 우회 1: 흐름 A (presigned)로 본체 우회
- 우회 2: 흐름 B로 백엔드 직접 (Vercel 미경유)
- 회피 X: Vercel _Pro 플랜에서도_ 단일 요청 한도가 무제한이 아님 — 큰 파일은 *근본 흐름 변경*이 답

### 2) CORS preflight

흐름 A/B는 _스토리지/백엔드 도메인이 다르므로_ CORS 설정 필수.

- `Access-Control-Allow-Origin: <Vercel 배포 도메인>` (와일드카드 X — 인증 쿠키와 충돌)
- `Access-Control-Allow-Methods: PUT, POST` (presigned는 보통 PUT)
- `Access-Control-Allow-Headers: Content-Type, x-amz-*` (presigned는 서명 헤더 통과)
- `Access-Control-Expose-Headers: ETag` (멀티파트 업로드에서 ETag 회수가 필요할 때)

### 3) presigned URL 만료

S3/R2/GCS의 presigned URL은 _짧은 만료_(보통 5~15분)가 표준. UX가 _업로드 시작까지 시간이 걸리는 흐름_(파일 선택 → 미리보기 → 사용자가 한참 보다가 제출)이라면 _제출 시점에 발급_ 또는 *재발급 흐름*을 둬야 합니다.

---

## ✍️ 흐름 A — presigned URL (권장)

### 단계 도식

```
1. 클라이언트 → 백엔드: "이 파일 업로드할게, presigned URL 줘"
   POST /api/proxy/uploads/presign  { filename, contentType, size }
   ↓
2. 백엔드 → 스토리지: presigned PUT URL 발급 (만료 10분)
   ↓ {url, key, headers}
3. 클라이언트 → 스토리지: PUT (multipart 아님, raw 바이트)
   PUT <presigned-url>
   Content-Type: image/jpeg
   <body: File 객체>
   ↓
4. 클라이언트 → 백엔드: "업로드 완료, 메타 등록해줘"
   POST /api/proxy/uploads/commit  { key, originalName, ... }
   ↓
5. 백엔드: DB에 레코드 + (선택) 백엔드/큐가 후처리
```

### 1단계 — 백엔드 합의 (presign 엔드포인트)

```http
POST /uploads/presign
Content-Type: application/json

{
  "filename": "photo.jpg",
  "contentType": "image/jpeg",
  "size": 2457600
}

→ 200 OK
{
  "url": "https://bucket.s3.amazonaws.com/...?X-Amz-Signature=...",
  "key": "uploads/2026/05/abc123.jpg",
  "headers": { "Content-Type": "image/jpeg" },
  "expiresAt": "2026-05-04T12:10:00Z"
}
```

**합의 포인트**:

- 백엔드가 `key`를 _랜덤 생성_(클라이언트가 `filename` 그대로 사용 X — 충돌·악성 경로)
- 백엔드가 _크기·MIME 화이트리스트_ 검증 후 발급 (클라이언트 검증은 UX, 백엔드 검증이 진실)
- 만료는 _업로드 동작 가능한 최소_(보통 10분)

### 2단계 — 프론트엔드 흐름

```ts
// 1) presign 요청
const { url, key, headers } = await fetch('/api/proxy/uploads/presign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filename: file.name,
    contentType: file.type,
    size: file.size,
  }),
}).then(r => r.json())

// 2) 스토리지 직접 PUT (XHR로 진행률 측정)
await new Promise<void>((resolve, reject) => {
  const xhr = new XMLHttpRequest()
  xhr.open('PUT', url)
  Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v))

  xhr.upload.onprogress = e => {
    if (e.lengthComputable) {
      setProgress(Math.round((e.loaded / e.total) * 100))
    }
  }
  xhr.onload = () =>
    xhr.status >= 200 && xhr.status < 300
      ? resolve()
      : reject(new Error(`Upload failed: ${xhr.status}`))
  xhr.onerror = () => reject(new Error('Network error'))
  xhr.send(file)
})

// 3) commit
await apiClient.post('uploads/commit', {
  json: { key, originalName: file.name },
})
```

> **왜 fetch가 아니라 XHR?** `fetch`는 _업로드 진행률 이벤트 표준이 없음_. 진행률이 필요하면 XHR이 사실상 표준 (또는 Streams API 폴리필).

### 3단계 — TanStack Query 통합

`features/uploads/mutations.ts`에 단일 `useUploadFileMutation`을 두고 *3단계를 한 mutation으로 합성*하는 패턴이 무난합니다.

```ts
export function useUploadFileMutation() {
  return useMutation({
    mutationFn: async ({ file, onProgress }: { file: File; onProgress?: (p: number) => void }) => {
      const presign = await apiClient.post('uploads/presign', { json: { ... } }).json<PresignResponse>()
      await uploadToStorage(file, presign, onProgress) // 위 XHR 함수
      return apiClient.post('uploads/commit', { json: { key: presign.key, ... } }).json<UploadRecord>()
    },
  })
}
```

- 컴포넌트에서 `mutation.mutate({ file, onProgress: setProgress })`로 호출
- `mutation.isPending` = _세 단계 통합_ 진행 상태

---

## ✍️ 흐름 B — 백엔드 다이렉트 multipart

백엔드가 _별도 도메인_(예: `api.example.com`)이고 *즉시 후처리*가 필요한 케이스. 클라이언트가 Vercel을 거치지 않고 백엔드에 _직접_ multipart 전송.

### 백엔드 CORS 합의

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Credentials: true   # 쿠키 전송이 필요하면
```

### 인증 흐름의 변화

- baseline의 _httpOnly 쿠키_ 흐름은 _same-origin_ 전제 — 별도 도메인으로 직접 보내면 _쿠키 자동 첨부 안 됨_.
- 해결 1: 백엔드가 *업로드 직전에 짧은 토큰*을 발급(POST /uploads/token), 클라이언트가 `Authorization: Bearer <token>`로 첨부 — 흐름 A의 presign 토큰화 패턴과 유사
- 해결 2: 쿠키를 cross-site로 풀고 `SameSite=None; Secure` + 백엔드 CORS `credentials: true` — _보안 등급이 떨어지므로 권장하지 않음_

### 클라이언트 코드

```ts
const formData = new FormData()
formData.append('file', file)
formData.append('caption', caption) // 메타와 함께 전송 가능

const xhr = new XMLHttpRequest()
xhr.open('POST', `${BACKEND_DIRECT_BASE_URL}/uploads`)
xhr.setRequestHeader('Authorization', `Bearer ${uploadToken}`)
xhr.upload.onprogress = e => setProgress(Math.round((e.loaded / e.total) * 100))
xhr.send(formData)
```

> `Content-Type`을 _수동 지정 X_. 브라우저가 `multipart/form-data; boundary=...`를 자동 생성합니다.

---

## ✍️ 흐름 C — `/api/proxy/*` 경유 multipart

baseline의 인증/프록시 흐름을 _그대로 활용_. 작은 파일(<4MB)에 한해 단순함.

### proxy 통과는 가능한가? ✅ 가능

baseline의 `src/app/api/proxy/[...path]/route.ts`는 `body: request.body` + `duplex: 'half'`로 *스트리밍 통과*합니다. multipart도 그대로 통과합니다. 단,

- Vercel 함수 본체 4.5MB 제한 적용
- 함수 실행 시간(Hobby 10s / Pro 60s) 동안 업로드 완료 필요

### 클라이언트 코드

```ts
const formData = new FormData()
formData.append('file', file)
formData.append('caption', caption)

await apiClient.post('uploads', { body: formData })
```

> `apiClient`는 ky 인스턴스 — `body: FormData`를 그대로 받고, `Content-Type` 자동 설정됨. **`headers: { 'Content-Type': ... }`을 직접 지정하지 마세요** — boundary가 깨집니다.

### 진행률 측정의 한계

ky/fetch는 _업로드 진행률 표준 이벤트가 없습니다_. 필요하면 _XHR로 우회_(흐름 B 예시)하거나 _Streams API + ReadableStream 가공_(브라우저 호환성 매트릭스 확인). 진행률이 *필수*라면 흐름 A/B로 가는 편이 단순합니다.

---

## 📚 UI 라이브러리 비교

| 라이브러리                | 크기  | 강점                                                         | 약점                                             | 권장 사용                       |
| ------------------------- | ----- | ------------------------------------------------------------ | ------------------------------------------------ | ------------------------------- |
| **`<input type="file">`** | 0KB   | 의존성 0, 모바일 카메라 직결(`accept="image/*"` + `capture`) | 드래그&드롭 X, 미리보기 직접 구현                | 단일/작은 업로드, MVP           |
| **react-dropzone** ⭐     | ~12KB | 드래그&드롭 + 검증 + accept 매처 + 훅 1개(`useDropzone`)     | 진행률/멀티파트 X (별도 구현)                    | 대부분의 도메인 — _가장 가성비_ |
| **uppy**                  | ~80KB | 진행률 / 멀티파트 / 재시도 / S3 어댑터 / Dashboard UI 통합   | 큰 번들, UI 색깔이 강함 (자체 컴포넌트 의존)     | 복잡한 업로드 흐름, 관리자/CMS  |
| **filepond**              | ~50KB | 미려한 UI, 이미지 변환 플러그인 풍부, 다국어                 | React 어댑터가 별개, 진행률은 백엔드 형식에 의존 | 미디어 중심 도메인              |

### 권장 조합

- 흐름 A + react-dropzone + 자체 XHR 진행률 → _80%의 케이스_
- 흐름 A + uppy AwsS3 플러그인 → _CMS / 다중 파일 / 재시도가 필수인 케이스_
- 흐름 C + native input → _프로필 사진 한 장 같은 단순 케이스_

---

## ✅ 클라이언트 검증 (UX) vs 백엔드 검증 (진실)

```ts
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024 // 5MB

if (!ALLOWED_MIME.includes(file.type))
  throw new Error('지원하지 않는 형식입니다')
if (file.size > MAX_BYTES) throw new Error('5MB 이하 파일만 업로드 가능합니다')
```

### 함정: `file.type`은 *브라우저가 추정*한 MIME

확장자만 바꾼 `.exe`도 `image/jpeg`로 보고될 수 있습니다. *보안 검증은 백엔드의 magic byte 검사*가 진실. 클라이언트 검증은 _오용 방지가 아니라 UX_(잘못 고른 사용자 즉시 알림)입니다.

### 백엔드가 받아야 할 것 (합의)

- magic byte 검사 (Spring `Tika` / Node `file-type` 등)
- 크기 재검증 (Content-Length는 위조 가능)
- 파일명 정규화 (`../`, NUL byte, 너무 긴 이름)
- 안티바이러스 스캔(선택, 사용자 업로드를 다시 사용자에게 노출하는 도메인은 필수)
- presigned 흐름이라면 _commit 단계에서_ 위 검증 일괄 수행 (스토리지에는 일단 들어감 — 검증 실패 시 삭제)

---

## 🎨 UX 패턴

### 미리보기 (이미지)

```ts
const [previewUrl, setPreviewUrl] = useState<string | null>(null)

useEffect(() => {
  if (!file) return
  const url = URL.createObjectURL(file)
  setPreviewUrl(url)
  return () => URL.revokeObjectURL(url) // ⚠ 필수 — 메모리 누수
}, [file])
```

### 진행률 + 취소

XHR이라면 `xhr.abort()`로 취소. 진행률은 mutation 상태와 _분리된 클라이언트 상태_(`useState<number>`)로 관리 — TanStack Query 캐시에 _바이트 진행률을 넣지 마세요_(빈번한 캐시 무효화 비용).

### 재시도

- 흐름 A: presign → PUT → commit 중 *PUT만 실패*했다면 _같은 URL로 재시도_(만료 전까지). 만료 후엔 presign부터 다시.
- 흐름 B/C: 멱등성 보장이 어려우면 백엔드가 _idempotency-key_ 합의 (`Idempotency-Key: <uuid>` 헤더)

### 다중 파일

- 라이브러리(uppy/dropzone)에 위임 또는 _Promise.all_ + 동시성 제한(p-limit, 보통 3~5개) — 무제한 동시 업로드는 네트워크/메모리 모두 망가짐

---

## 🗃 도입 절차 (흐름 A 기준 권장 경로)

### Step 1 — 백엔드와 합의

`presign` / `commit` 엔드포인트 + 스토리지 선택 (S3 / R2 / GCS / 자체) + presigned 만료 + 검증 정책

### Step 2 — OpenAPI 스펙 추가 → `npm run gen:api`

```yaml
paths:
  /uploads/presign:
    post:
      requestBody: ...
      responses: { '200': ... }
  /uploads/commit:
    post: ...
```

### Step 3 — `src/features/uploads/` 생성

`keys.ts` / `mutations.ts` / `index.ts` (queries는 보통 불필요 — 업로드 결과는 도메인 리스트 invalidate로 처리)

### Step 4 — UI 라이브러리 선택 + 컴포넌트 작성

`react-dropzone`이 1순위. `npm i react-dropzone`

### Step 5 — Object URL 정리 / 진행률 UI 컴포넌트

`@/components/ui/progress` (shadcn) 사용 — 도메인이 시각 디자인 결정.

### Step 6 — 검증 추가

- 클라이언트 Zod 스키마: `file: z.instanceof(File).refine(f => f.size < MAX, ...)`
- 백엔드와 동일 정책 (양쪽 동기화 — _숫자는 한 곳에 두고 둘 다 import_)

### Step 7 — 에러 처리 통합 (`toast-pattern.md` 따름)

- 4xx (검증 실패) → 인라인 (FormMessage)
- 5xx / 네트워크 → 토스트 폴백
- 진행 중 취소 → 사용자 의도라 _토스트 없음_

---

## 📋 백엔드 합의 체크리스트

### presigned 흐름 (흐름 A)

- [ ] 엔드포인트: `POST /uploads/presign` 요청/응답 스키마
- [ ] `key` 생성 규칙 (랜덤 / 디렉터리 / 충돌 방지)
- [ ] presigned 만료 (분 단위)
- [ ] commit 엔드포인트 (`POST /uploads/commit`) — DB 레코드 생성 + 검증
- [ ] 검증 실패 시 _스토리지 객체 삭제_ 책임 (백엔드)
- [ ] 스토리지 CORS — Origin / Method / Headers / ExposeHeaders(`ETag`)
- [ ] 비동기 후처리(리사이즈/AV 스캔) 흐름 — webhook? 큐?

### 다이렉트 multipart (흐름 B/C)

- [ ] 인증 방식: 쿠키 same-origin (C) / 단기 토큰 (B)
- [ ] 최대 크기 (백엔드 / Spring `multipart.max-file-size`)
- [ ] MIME 화이트리스트 + magic byte 검증
- [ ] 응답 형식: `{ id, url }` / `{ id, key }` / 도메인 리소스 객체
- [ ] 에러 코드 카탈로그: `FILE_TOO_LARGE` / `INVALID_FORMAT` / `UPLOAD_FAILED`
- [ ] _Idempotency-Key_ 사용 여부

### 공통

- [ ] 프로덕션 보관 정책 (영구 / 만료 / 콜드스토리지 이동)
- [ ] 사용자가 *같은 파일을 다시 받을 때*의 URL 발급 (다시 presigned GET? CDN? 영구 URL?)
- [ ] 권한 — 다른 사용자가 URL을 알면 접근 가능한가?

---

## ⚠️ 함정 7선

### 함정 1 — `Content-Type` 직접 지정

```ts
// ❌ FormData에 Content-Type을 수동으로 지정
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'multipart/form-data' }, // boundary가 빠져 백엔드 파싱 실패
  body: formData,
})

// ✅ 헤더를 비우면 브라우저가 boundary 포함해 자동 설정
fetch(url, { method: 'POST', body: formData })
```

baseline의 `apiClient`(ky)도 동일 — `body: FormData`만 넘기세요.

---

### 함정 2 — Object URL 메모리 누수

`URL.createObjectURL(file)`로 만든 URL은 `revokeObjectURL` 명시 호출 전까지 _블롭이 메모리에 남습니다_. 큰 이미지 N장이면 누수 폭발.

```ts
useEffect(() => {
  const url = URL.createObjectURL(file)
  return () => URL.revokeObjectURL(url) // 클린업 필수
}, [file])
```

---

### 함정 3 — Vercel 4.5MB 한도를 흐름 C로 우회 시도

`/api/proxy/*`로 큰 파일을 넘기면 _함수 진입 단계에서_ 413/timeout이 납니다. 우회 X — 흐름 A/B로 _근본 변경_.

---

### 함정 4 — presigned URL 만료 후 재시도

만료된 URL로 PUT → 403. _동일 URL로 무한 재시도하지 말고_ presign부터 다시.

```ts
async function uploadWithRetry(file: File, getPresign: () => Promise<Presign>) {
  let presign = await getPresign()
  try {
    return await putToStorage(file, presign)
  } catch (e) {
    if (isExpiredError(e)) {
      presign = await getPresign() // 재발급
      return await putToStorage(file, presign)
    }
    throw e
  }
}
```

---

### 함정 5 — EXIF 회전 무시

iOS/Android에서 찍은 JPEG는 EXIF의 Orientation 태그로 _브라우저는 회전해 보여주지만 raw 바이트는 그대로_. 백엔드가 raw로 처리하면 가로/세로가 뒤집힙니다.

- 해결 1: 백엔드(또는 비동기 큐)가 EXIF 정규화
- 해결 2: 클라이언트가 업로드 전 canvas로 정규화 (`createImageBitmap` + `imageOrientation: 'from-image'`)

---

### 함정 6 — `accept` 속성만으로 파일 형식 신뢰

```html
<input type="file" accept="image/*" />
<!-- ⚠ 사용자가 다이얼로그에서 "모든 파일"로 바꿀 수 있고, 모바일에서는 동작이 다름 -->
```

`accept`는 *다이얼로그 필터*일 뿐. _선택 후 `file.type` 검증_ 필수, 그것도 백엔드 magic byte 검사를 _대체하지 않음_.

---

### 함정 7 — multipart 중간 실패 시 부분 업로드 유실

큰 파일(>5MB)은 _S3 멀티파트 업로드_(여러 part로 나눠 PUT) 흐름이 표준. 단일 PUT으로 50MB를 보내면 *마지막 1%에서 끊겨도 처음부터 다시*입니다.

- 단일 PUT: <5MB 권장 (S3 single-part 한도는 5GB지만 *재시도 비용*이 큼)
- 멀티파트 PUT: uppy AwsS3Multipart 플러그인 또는 백엔드가 part별 presigned URL 발급 + 클라이언트가 ETag 수집 → CompleteMultipartUpload 호출

---

## ✅ 도입 체크리스트

- [ ] *흐름 결정 트리*로 A/B/C 중 하나 선택
- [ ] 백엔드 합의 체크리스트 (위) 합의
- [ ] OpenAPI 스펙 추가 + `npm run gen:api`
- [ ] `src/features/uploads/` 작성 (keys/mutations/index)
- [ ] UI 라이브러리 선택 (`react-dropzone` 1순위)
- [ ] 진행률/취소/재시도 정책 결정
- [ ] 검증 정책 클라이언트/백엔드 양쪽 동기화
- [ ] `toast-pattern.md`에 따라 4xx 인라인 / 5xx 토스트 적용
- [ ] (흐름 A/B) CORS 설정 검증 — Origin / Method / Expose-Headers
- [ ] Object URL 클린업 검증 (대량 미리보기 메모리 테스트)
- [ ] E2E: 정상 + 너무 큰 파일 + 잘못된 형식 + 네트워크 끊김 4종 시나리오

---

## 📎 관련 문서

- API 통신 패턴: [`./api-pattern.md`](./api-pattern.md) — `apiClient` / `/api/proxy/*` / mutation 훅
- 인증 패턴: [`./auth-pattern.md`](./auth-pattern.md) — httpOnly 쿠키 흐름 (흐름 C가 그대로 활용)
- 토스트 패턴: [`./toast-pattern.md`](./toast-pattern.md) — 업로드 실패 메시지 분기
- 폼 처리: [`./forms-react-hook-form.md`](./forms-react-hook-form.md) — File 필드 검증 (Zod `instanceof(File)`)
- 보안 헤더: [`./security-headers.md`](./security-headers.md) — CSP `connect-src`에 스토리지 도메인 추가
- Vercel 배포: [`./deploy-vercel.md`](./deploy-vercel.md) — 함수 한도 / 환경변수
- 외부 자료:
  - [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
  - [Cloudflare R2 Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
  - [react-dropzone](https://react-dropzone.js.org/)
  - [Uppy AwsS3](https://uppy.io/docs/aws-s3/)
  - [Vercel Functions Limits](https://vercel.com/docs/functions/limitations)
