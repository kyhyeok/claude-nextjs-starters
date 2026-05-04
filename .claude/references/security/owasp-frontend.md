# OWASP 프론트엔드 Top 10 참조 (스텁)

> **상태**: TBD — 추후 작성 예정.
> 현재는 `security-reviewer` 에이전트가 `docs/guides/security-headers.md` 와 `docs/guides/auth-pattern.md` 를 직접 인용합니다.

## 채워질 내용 (예정)

- A01 Broken Access Control: `src/proxy.ts` matcher 누락 사례
- A02 Cryptographic Failures: 토큰 저장소 위반 (localStorage 등)
- A03 Injection (XSS): `dangerouslySetInnerHTML` 안전 사용 패턴
- A05 Security Misconfiguration: CSP / 보안 헤더 약화 사례
- A07 Identification and Authentication Failures: httpOnly 쿠키 우회 시도
- A08 Software and Data Integrity Failures: SRI 누락, npm 의존성 무결성
- baseline 고유: `BACKEND_API_BASE_URL` 노출 / Route Handler 프록시 우회

> 채워지기 전까지는 일반론으로 채우지 _말 것_ — `security-reviewer`가 "주참조 없음"을 보고하도록 비워둔다.
