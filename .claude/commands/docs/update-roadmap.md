---
description: 'ROADMAP.md에서 완료된 작업을 체크하고 진행 상황을 업데이트합니다'
allowed-tools: ['Read(docs/ROADMAP.md:*)', 'Edit(docs/ROADMAP.md:*)']
---

# Claude 명령어: Update Roadmap

`docs/ROADMAP.md`의 _향후 개선 옵션_ 항목을 완료 처리하거나, _완료된 Phase_ 내 체크박스를 갱신합니다.

## 사용법

```
/update-roadmap
```

## 대화형 프로세스

1. `docs/ROADMAP.md` 읽기
2. 미완료 체크박스(`- [ ]`)와 후보 Phase 목록 표시
3. 사용자에게 어떤 항목을 완료했는지 질문
   - 후보: `Phase 5-A` 같은 Phase 단위 또는 개별 체크박스 텍스트
4. 해당 항목을 다음 규칙으로 갱신
5. 상단 _최종 업데이트_ 날짜를 오늘로 자동 갱신
6. 변경 요약 출력

## 업데이트 규칙

### 개별 체크박스 완료

- Before: `- [ ] Vitest + @testing-library/react 설치`
- After: `- [x] Vitest + @testing-library/react 설치`

### Phase 단위 완료

Phase 내부 모든 체크박스를 `[x]`로 갱신하고, Phase 제목 뒤에 `✅`를 붙입니다.

- Before: `### Phase 5-A: 테스트 베이스라인 (추천도 ⭐⭐⭐)`
- After: `### Phase 5-A: 테스트 베이스라인 ✅`

### 후보 → 완료 이동

_향후 개선 옵션_ 섹션에 있던 Phase가 모두 완료되면, _완료된 Phase_ 섹션 끝으로 이동시킵니다.
완료된 항목의 체크박스는 `- ✅`로 표시(완료된 Phase 1~4 형식과 동일).

### 날짜 갱신

문서 상단의 다음 라인을 오늘 날짜(YYYY-MM-DD)로 갱신:

```markdown
**📅 최종 업데이트**: YYYY-MM-DD
```

### 진행 상황 라인 갱신

`**📊 진행 상황**:` 라인을 현재 상태에 맞게 갱신.
예: `Phase 1~4 완료 ✅ / Phase 5-A 진행 중`

## 입력 예시

```
완료한 항목을 알려주세요:
- 전체 Phase: "Phase 5-A"
- 개별 체크박스: "Vitest 설치, MSW node server 통합"
- 여러 개: "Phase 5-A, Storybook 도입"
```

## 주의사항

- 이미 완료된(`✅` 또는 `[x]`) 항목은 건너뜀
- Phase 단위 완료 시 _향후 개선 옵션_ → *완료된 Phase*로 이동 (별도 확인 받음)
- ROADMAP.md 형식이 크게 바뀌었다면 이 명령어를 먼저 갱신할 것

## 관련 문서

- 로드맵 형식: `docs/ROADMAP.md`
- 새 Phase 추가 규칙: ROADMAP.md 하단 _Phase 추가 시 작성 규칙_ 섹션
