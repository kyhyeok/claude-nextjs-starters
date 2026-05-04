# 🔗 백엔드 API 스펙 통합 가이드

이 문서는 **외부 백엔드(Kotlin + Spring 등)가 어떤 방식으로 API 문서를 제공하든 프론트엔드는 동일한 흐름으로 코드를 생성**하는 방법을 정의합니다.

---

## 🧭 핵심 원칙 — "openapi.yaml 한 장"

백엔드가 어떤 방식으로 문서화하든, **프론트엔드 입장에서는 항상 단일 OpenAPI yaml/json**만 다룹니다.

```
[백엔드 측 — 다양한 방식]              [프론트엔드 측 — 항상 동일]
                                                 ▼
SpringDoc 어노테이션 ─┐
                     ├─→ openapi.yaml ─→ orval ─→ generated/* + features/*
restDocs 테스트     ─┘
```

orval은 OpenAPI 3.x yaml/json만 입력으로 받습니다. **다른 형식(`.adoc`, Postman, custom JSON)은 미리 OpenAPI로 변환되어야** 합니다.

---

## 🅰️ 시나리오 A — SpringDoc(OpenAPI 어노테이션)만 사용

가장 흔한 시나리오. 우리 baseline의 기본 가정입니다.

### 백엔드 측 (참고용)

```kotlin
// build.gradle.kts
implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.x")

// 컨트롤러
@Operation(summary = "사용자 조회")
@GetMapping("/users/{id}")
fun getUser(@PathVariable id: String): User { ... }
```

- 산출물: `http://backend:8080/v3/api-docs` (JSON) 또는 `/swagger-ui.html` (UI)

### 프론트엔드 측

```typescript
// orval.config.ts
input: {
  target: 'http://localhost:8080/v3/api-docs',
}
```

또는 yaml 파일을 받아 저장:

```bash
curl http://localhost:8080/v3/api-docs.yaml > openapi/example.yaml
```

```typescript
input: {
  target: './openapi/example.yaml',
}
```

> ⚠️ **위험**: 어노테이션이 정확하다는 *전제*에 의존. 컨트롤러 변경 시 어노테이션 누락이 빌드를 깨지 않으므로 _문서가 거짓말이 될 수 있음_.

---

## 🅱️ 시나리오 B — Spring restDocs만 사용

테스트가 통과해야만 문서가 생성되므로 *문서의 정확성이 강제*됩니다. 단, orval 입력으로 사용하려면 **추가 변환 단계**가 필요합니다.

### 백엔드 팀에 요청할 작업

`build.gradle.kts`에 `restdocs-api-spec` 플러그인 추가:

```kotlin
plugins {
  id("com.epages.restdocs-api-spec") version "0.19.x"
}

dependencies {
  testImplementation("com.epages:restdocs-api-spec-mockmvc:0.19.x")
  // 또는 WebTestClient 사용 시:
  // testImplementation("com.epages:restdocs-api-spec-webtestclient:0.19.x")
}

openapi3 {
  setServer("http://localhost:8080")
  title = "API"
  version = "1.0.0"
  format = "yaml"
  outputDirectory = "build/api-spec"
}
```

테스트 작성 패턴 (`MockMvcRestDocumentationWrapper` 사용):

```kotlin
import com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document
import com.epages.restdocs.apispec.ResourceDocumentation.resource
import com.epages.restdocs.apispec.ResourceSnippetParameters.builder

@Test fun `사용자 조회`() {
  mockMvc.perform(get("/users/{id}", "u1"))
    .andExpect(status().isOk)
    .andDo(document("get-user", resource(
      builder()
        .description("사용자 단건 조회")
        .responseSchema(Schema("User"))
        .build()
    )))
}
```

### 빌드 명령

```bash
./gradlew openapi3
# 산출물: build/api-spec/openapi3.yaml
```

### 프론트엔드 측

빌드된 yaml을 받아 사용:

```bash
# 1) 백엔드 빌드 산출물 복사
cp ../backend/build/api-spec/openapi3.yaml openapi/example.yaml

# 또는 CI 아티팩트 다운로드:
gh run download <run-id> -n openapi-spec -D openapi/

# 2) 코드 생성
npm run gen:api
```

> ✅ **이점**: 테스트가 통과해야만 yaml이 생성되므로 _컨트롤러와 문서가 어긋날 수 없음_.

---

## 🆎 시나리오 C — 둘 다 사용 (Swagger UI 탐색 + restDocs 생성)

엔터프라이즈 환경에서 흔한 운용. **각 도구를 *서로 다른 목적*으로 사용**합니다.

| 용도                     | 도구                   | 이유                                          |
| ------------------------ | ---------------------- | --------------------------------------------- |
| **사람의 탐색·디버깅**   | Swagger UI (SpringDoc) | 브라우저에서 클릭으로 시뮬레이션, 한눈에 보기 |
| **프론트엔드 코드 생성** | restDocs 변환 yaml     | 테스트로 검증된 _공식 계약서_                 |

### 운용 원칙

```
[백엔드]
  ┌── SpringDoc 어노테이션 ──→ Swagger UI ─────→ 개발자 브라우저 (탐색)
  │
  └── restDocs 테스트 + restdocs-api-spec ─→ openapi.yaml ─→ 프론트 orval (코드 생성) ⭐
```

**두 곳의 정의가 어긋나면 _restDocs 쪽이 진실_** — 테스트로 검증된 쪽이기 때문입니다.

### 프론트엔드 측 — 두 입력을 모두 사용하기

**(1) 일상 개발**: openapi.yaml(restDocs 변환본)을 사용하여 typed 코드 생성

```typescript
// orval.config.ts
input: {
  target: './openapi/example.yaml',  // restDocs 변환본
}
```

**(2) 새 엔드포인트 처음 접할 때**: Swagger UI를 브라우저로 열어 시뮬레이션, curl 예시 확인

**(3) 백엔드 작업 진행 중**: 아직 restDocs가 안 만들어진 _작업 중_ 엔드포인트는 Swagger UI URL을 임시로 사용 가능

```typescript
// orval.config.ts (개발 단계 임시)
input: {
  target: 'http://localhost:8080/v3/api-docs',
}
```

---

## 📋 백엔드 팀에 요청할 항목 체크리스트

새 baseline을 백엔드와 통합할 때 다음을 명확히 합의하세요:

### 공통

- [ ] 어떤 도구를 쓰는가? **SpringDoc / restDocs / 둘 다**
- [ ] OpenAPI 산출물 위치/접근 방법 (URL? CI artifact? 레포 commit?)
- [ ] OpenAPI 버전 (3.0 / 3.1)
- [ ] 응답 필드 네이밍 (camelCase / snake_case)
- [ ] 에러 응답 표준 스키마 (`ErrorResponse` 형태 통일)
- [ ] 페이지네이션 응답 형식 (`{items, page, size, total}` 등)

### restDocs 사용 시

- [ ] `restdocs-api-spec` 플러그인 적용 가능한가
- [ ] 산출물 자동 export 파이프라인 (CI에서 yaml을 git/artifact로 publish)
- [ ] 빌드 명령어 (`./gradlew openapi3`)와 산출물 경로

### 인증

- [ ] JWT 발급 응답 스키마 (`{accessToken, refreshToken, expiresIn}` 형태?)
- [ ] OAuth provider 통합 흐름 (콜백 후 백엔드가 직접 `Set-Cookie` 발급?)

---

## ⚙️ orval.config.ts 입력 옵션별 사용법

### 1) 로컬 yaml 파일 (가장 안정적)

```typescript
input: {
  target: './openapi/example.yaml',
}
```

### 2) 원격 URL (개발 단계 / 신규 엔드포인트 빠르게 보기)

```typescript
input: {
  target: 'http://localhost:8080/v3/api-docs',
}
```

### 3) Multi-config (여러 백엔드 / 여러 스펙)

```typescript
export default defineConfig({
  // 메인 백엔드 (restDocs 변환본)
  api: {
    input: { target: './openapi/main.yaml' },
    output: {
      target: './src/lib/api/generated/index.ts',
      // ...
    },
  },
  // 외부 partner API
  partner: {
    input: { target: 'https://partner.example.com/openapi.json' },
    output: {
      target: './src/lib/api/partner/index.ts',
      // ...
    },
  },
})
```

### 4) 인증 헤더가 필요한 URL

```typescript
input: {
  target: 'https://staging.example.com/v3/api-docs',
  override: {
    transformer: './openapi/transformer.js',  // 필요 시 spec 후처리
  },
},
// 또는 직접 fetch 후 yaml로 저장하는 사전 단계 사용 권장
```

---

## ⚠️ 흔한 함정과 해결

### 1) OpenAPI 3.0 vs 3.1 차이

- 3.1은 JSON Schema 2020-12 호환, `nullable` 키워드 제거 → `type: ['string', 'null']` 사용
- orval은 둘 다 지원하나, _백엔드 산출물 버전을 일치시키는 게 안전_
- 백엔드 SpringDoc/restDocs-api-spec의 출력 OpenAPI 버전 확인

### 2) snake_case vs camelCase

- Spring 백엔드가 `Jackson`의 `PropertyNamingStrategies.SnakeCaseStrategy` 사용 시 응답이 `access_token` 형태
- 우리 baseline은 camelCase(`accessToken`) 가정 — `src/app/api/auth/*/route.ts`의 매핑 수정 필요
- 또는 백엔드를 camelCase로 통일

### 3) generated 코드와 features 레이어 동기화

- spec 변경 → `npm run gen:api` 후 features의 훅이 컴파일 에러 → 매핑 수정
- 이 컴파일 에러가 _깨진 곳을 알려주는 안전망_. 끄지 마세요.

### 4) 백엔드 미배포 상태에서 진행

- restDocs 산출물이 아직 없을 때: `openapi/example.yaml`에 *예상 스키마*를 임시로 작성 → MSW로 mock 개발 → 백엔드 완성 후 실제 yaml로 교체
- 자세한 흐름: [`./mocking-msw.md`](./mocking-msw.md)

### 5) Swagger UI에서는 보이는데 yaml에는 없는 엔드포인트

- restDocs 테스트가 _없는_ 엔드포인트는 변환 yaml에서도 누락됨
- 백엔드 팀에 _해당 엔드포인트의 restDocs 테스트 추가_ 요청

### 6) 스펙 파일이 너무 큼

- orval `mode: 'tags-split'`로 태그별 분리 (기본 설정)
- 도메인이 매우 많으면 multi-config로 분할

---

## ✅ 통합 체크리스트

새 백엔드와 통합 시:

- [ ] 백엔드 팀과 *어떤 시나리오(A/B/C)*인지 합의
- [ ] OpenAPI yaml 산출 경로/접근 방법 합의 (URL / CI artifact / 직접 commit)
- [ ] 응답 네이밍(camelCase/snake_case), 페이지네이션, 에러 형식 합의
- [ ] 인증 응답 스키마(`{accessToken, refreshToken, expiresIn}`) 합의
- [ ] `orval.config.ts`의 `input.target` 설정
- [ ] `npm run gen:api` 실행 후 `npm run check-all` 통과 확인
- [ ] (시나리오 B/C) 백엔드 빌드에서 yaml 자동 export 파이프라인 구성

---

## 📎 관련 문서

- API 통신 패턴 (생성된 코드를 어떻게 쓰는가): [`api-pattern.md`](./api-pattern.md)
- 인증 패턴 (백엔드 인증 응답 매핑): [`auth-pattern.md`](./auth-pattern.md)
- MSW 모킹 (백엔드 미완성 시 선행 개발): [`mocking-msw.md`](./mocking-msw.md)
- 외부 도구:
  - [SpringDoc](https://springdoc.org/)
  - [Spring restDocs](https://docs.spring.io/spring-restdocs/docs/current/reference/htmlsingle/)
  - [restdocs-api-spec](https://github.com/ePages-de/restdocs-api-spec)
  - [orval](https://orval.dev/)
