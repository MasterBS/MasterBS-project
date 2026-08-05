---
triggers: [spec-coverage.sh, 테스트 미인용, 판정 기준 ID 충돌, cross-feature, S1-1, S3, S6]
status: verified
scope: this-repo (scripts/spec-coverage.sh --tests)
date: 2026-08-05
---
## spec-coverage.sh --tests는 feature 간 판정 기준 ID가 겹치면 미구현 기준도 "커버됨"으로 오판한다

**지시문**: 여러 feature의 spec.md가 `S1-1`, `S3`, `S4-1`, `S6`처럼 작은 번호를 재사용하는 건 흔하다. `scripts/spec-coverage.sh <feature> --tests`는 `\[$id\]` 패턴을 프로젝트 전체 테스트 파일에서 codebase-wide로 grep하고 feature로 범위를 좁히지 않으므로, 다른 feature가 이미 같은 문자열(`[S1-1]`, `[S3]`, `[S6]` 등)을 자기 기준으로 인용해뒀다면 이번 feature에서 아직 테스트를 안 짠 동일 번호 ID도 "인용됨"으로 잘못 통과 처리된다. 중간 체크포인트에서 이 스크립트의 "커버리지 OK"를 그대로 신뢰하지 말고, 이번 feature가 직접 만든 테스트 파일에 실제로 해당 ID가 있는지 별도로 확인한다(예: `grep -rn "\[S1-1\]" artifacts/<feature>가 건드린 파일들`). 최종 체크포인트에서도 마찬가지로 교차 검증이 필요하다.

**에피소드**: map-provider-choice의 Checkpoint(Tasks 1~2 이후)에서 `scripts/spec-coverage.sh map-provider-choice --tests`를 돌리자 `INV-2`, `S2-1`, `S2-2`만 "테스트 미인용"으로 나오고 `S1-1`, `S1-2`, `S3`, `S4-1`, `S4-2`, `S6`은 아직 Task 3·5·6이 실행 전인데도 통과로 표시됐다. 원인을 `grep -rnE "\[S1-1\]|\[S3\]|\[S4-1\]|\[S6\]" --include='*.test.ts*' app components lib ...`로 직접 재현: `cheap-gas-finder`의 `app/page.test.tsx`, `filters.test.tsx`, `station-list.test.tsx`, `directions.test.ts`가 자기 spec의 같은 번호 ID를 이미 인용하고 있어 문자열이 그대로 매치됐다. 도구 버그라기보단 codebase-wide grep의 알려진 한계이므로, 남은 Task(3, 5, 6)를 구현할 때도 "커버리지 OK"만 보고 넘어가지 않고 이번 feature가 만든 파일에 실제 인용이 있는지 직접 확인한다.

**증거**: 2026-08-05, `bash scripts/spec-coverage.sh map-provider-choice --tests` 출력(`INV-2`/`S2-1`/`S2-2`만 미인용) vs `grep -rnE "\[S1-1\]|\[S1-2\]|\[S3\]|\[S4-1\]|\[S4-2\]|\[S6\]" --include='*.test.ts' --include='*.test.tsx' app components lib services hooks types config e2e`로 확인한 `cheap-gas-finder` 소유 히트(`app/page.test.tsx`, `components/gas/filters.test.tsx`, `components/gas/station-list.test.tsx`, `lib/directions.test.ts`).

---

## 체크포인트가 여러 Task에 걸친 ID를 담당할 때 `--tests`는 마지막 담당 Task 완료 후에만 의미가 있다

**지시문**: plan.md의 중간 체크포인트(예: "Tasks 1~2 이후")가 아직 실행되지 않은 뒤쪽 Task들이 담당하는 ID까지 spec.md에 존재하면, `scripts/spec-coverage.sh <feature> --tests`는 그 시점에 구조적으로 통과할 수 없다(위 항목의 ID 충돌 오탐과 별개로, 진짜 미구현 ID도 있다). 이런 중간 체크포인트에서는 `--tests` 없이 `scripts/spec-coverage.sh <feature>`(plan 배정 확인)만 돌리고, 그 체크포인트가 담당하는 Task들의 ID만 별도로 `grep`해 인용을 확인한다. `--tests` 풀 검사는 관련 ID의 소유 Task가 전부 끝난 체크포인트(이 plan의 경우 "Tasks 3~5 이후", "Task 6 이후", 최종 체크포인트)에서만 의미가 있다.

**에피소드**: plan.md의 "Checkpoint: Tasks 1~2 이후" 항목을 템플릿 그대로 `scripts/spec-coverage.sh map-provider-choice --tests`로 작성했는데, Task 1·2가 담당하는 ID(S5-1, S5-2, INV-1, 그리고 지원 Task라 ID 없음)를 빼면 나머지 전부(S1-1, S1-2, S2-1, S2-2, S3, S4-1, S4-2, S6, INV-2)가 아직 미구현이라 `--tests`가 구조적으로 못 지나간다. 위 ID 충돌 항목 덕에 대부분은 오탐으로 가려졌지만 `INV-2`/`S2-1`/`S2-2`는 진짜로 남았다. Task 1·2가 담당한 ID(S5-1, S5-2, INV-1)만 자체 grep으로 인용 확인하고 이 체크포인트를 통과 처리했다.

**증거**: 2026-08-05, `grep -rE "\[S5-1|\[S5-2|\[INV-1" --include='*.test.ts' --include='*.test.tsx' app components lib services hooks types config e2e` → `components/gas/naver-map-view.test.tsx`의 3개 인용 확인.
