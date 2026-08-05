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
triggers: [spec-coverage.sh, 체크포인트, 중간 체크포인트, --tests, 구조적으로 통과 불가]
status: verified
scope: this-repo (scripts/spec-coverage.sh --tests, 여러 Task에 걸친 체크포인트)
date: 2026-08-05
---
## 체크포인트가 여러 Task에 걸친 ID를 담당할 때 `--tests`는 마지막 담당 Task 완료 후에만 의미가 있다

**지시문**: plan.md의 중간 체크포인트(예: "Tasks 1~2 이후")가 아직 실행되지 않은 뒤쪽 Task들이 담당하는 ID까지 spec.md에 존재하면, `scripts/spec-coverage.sh <feature> --tests`는 그 시점에 구조적으로 통과할 수 없다(위 항목의 ID 충돌 오탐과 별개로, 진짜 미구현 ID도 있다). 이런 중간 체크포인트에서는 `--tests` 없이 `scripts/spec-coverage.sh <feature>`(plan 배정 확인)만 돌리고, 그 체크포인트가 담당하는 Task들의 ID만 별도로 `grep`해 인용을 확인한다. `--tests` 풀 검사는 관련 ID의 소유 Task가 전부 끝난 체크포인트(이 plan의 경우 "Tasks 3~5 이후", "Task 6 이후", 최종 체크포인트)에서만 의미가 있다.

**에피소드**: plan.md의 "Checkpoint: Tasks 1~2 이후" 항목을 템플릿 그대로 `scripts/spec-coverage.sh map-provider-choice --tests`로 작성했는데, Task 1·2가 담당하는 ID(S5-1, S5-2, INV-1, 그리고 지원 Task라 ID 없음)를 빼면 나머지 전부(S1-1, S1-2, S2-1, S2-2, S3, S4-1, S4-2, S6, INV-2)가 아직 미구현이라 `--tests`가 구조적으로 못 지나간다. 위 ID 충돌 항목 덕에 대부분은 오탐으로 가려졌지만 `INV-2`/`S2-1`/`S2-2`는 진짜로 남았다. Task 1·2가 담당한 ID(S5-1, S5-2, INV-1)만 자체 grep으로 인용 확인하고 이 체크포인트를 통과 처리했다.

**증거**: 2026-08-05, `grep -rE "\[S5-1|\[S5-2|\[INV-1" --include='*.test.ts' --include='*.test.tsx' app components lib services hooks types config e2e` → `components/gas/naver-map-view.test.tsx`의 3개 인용 확인.

---
triggers: [map-view.tsx, 디스패처, dispatcher, prop 시그니처 변경, typecheck 깨짐, vertical slice]
status: verified
scope: this-repo (map-provider-choice Task 4)
date: 2026-08-05
---
## 공유 컴포넌트의 prop 시그니처를 바꾸는 Task는 호출부도 같이 고쳐야 그 Task 혼자 빌드가 선다

**지시문**: plan.md가 "컴포넌트 A의 시그니처를 바꾼다"를 Task X에, "컴포넌트 A를 실제로 쓰는 화면 배선"을 Task Y(X 이후)에 나눠 배정했다면, X를 구현하는 시점에 A의 기존 호출부가 이미 프로젝트에 있는지 먼저 확인한다. 있다면 X 안에서 그 호출부도 새 시그니처에 맞게 최소한으로 고쳐야 한다 — 그러지 않으면 X 완료 시점에 `bun run typecheck`/`bun run build`가 깨져 "각 Task는 시스템을 동작 가능한 상태로 둔다" 원칙을 어긴다. 최소 수정은 Y가 나중에 더 다듬을 자리(예: 하드코딩된 기본값)를 남겨도 된다.

**에피소드**: plan.md Task 4는 `components/gas/map-view.tsx`를 카카오 전용 컴포넌트에서 `provider`/`kakaoAppKey`/`naverAppKey`를 받는 디스패처로 재작성하는 일이었고, "영향 받는 파일"에는 `app/page.tsx`가 없었다(그건 Task 5 담당). 하지만 `app/page.tsx`는 이미 Task 3에서 옛 시그니처(`appKey` 단일 prop)로 `MapView`를 호출하고 있어서, Task 4만 구현하면 그 호출부가 타입 에러를 낸다. `app/page.tsx`의 해당 호출부만 `provider="kakao"`(하드코딩, Task 5에서 실제 상태로 교체 예정)로 최소 수정해 `bun run typecheck`·`bun run build`를 다시 통과시켰다. plan.md의 Task 4 제목 옆에 "✅ 완료"만 표시하고 "영향 받는 파일"은 고치지 않았다 — 실제 변경 사항은 diff와 커밋 메시지로 충분히 읽힌다.

**증거**: commit d0d6544, `app/page.tsx`의 `MapView` 호출부(`provider="kakao"` 추가) — 수정 전 `bun run typecheck`가 `Property 'appKey' does not exist on type 'MapViewProps'` 계열 에러로 실패했음(로컬 확인, 커밋에는 포함 안 함).

---
triggers: [playwright test:e2e, browserType.launch, Executable doesn't exist, chrome-headless-shell, pw-browsers]
status: verified
scope: this-session (이 클라우드 세션의 /opt/pw-browsers 사전 설치 버전과 package.json의 @playwright/test 버전 불일치)
date: 2026-08-05
---
## `bun run test:e2e`가 이 세션에서 바로는 안 돈다 — 사전 설치된 chromium 리비전과 package.json의 playwright 버전이 어긋난다

**지시문**: `bunx eslint`가 처음부터 실패했던 것과 같은 원인 계열 — 이 세션은 `bun install`을 방금 실행해서 `@playwright/test`가 `^1.52.0` 범위의 최신(1.59.1, chromium 리비전 1217 기대)으로 설치되지만, `/opt/pw-browsers/`에는 더 오래된 리비전(1194)만 미리 받아져 있다. `bun run test:e2e`를 그대로 돌리면 `Executable doesn't exist at .../chromium_headless_shell-1217/...`로 즉시 실패한다. 세션 시스템 프롬프트가 이미 안내한 대로, `playwright install`은 절대 돌리지 말고 `playwright.config.ts`의 `projects[].use.launchOptions.executablePath`에 `/opt/pw-browsers/chromium`(1194용 실행 파일 심볼릭 링크)을 **임시로** 넣어야 실행된다. **이 변경은 세션 로컬 우회이므로 절대 커밋하지 않는다** — 다른 개발자·CI 환경의 `/opt/pw-browsers` 경로는 다르거나 아예 없다. e2e를 로컬에서 확인한 뒤에는 `git checkout -- playwright.config.ts`로 되돌린다.

**에피소드**: map-provider-choice 최종 체크포인트에서 `bun run test:e2e -- map-provider-choice`를 처음 돌렸을 때 4개 테스트 전부 `browserType.launch: Executable doesn't exist at /opt/pw-browsers/chromium_headless_shell-1217/...`로 실패했다. `ls /opt/pw-browsers/`로 실제 설치된 리비전이 `chromium-1194`뿐임을 확인하고, `/opt/pw-browsers/chromium`이 그 실행 파일을 가리키는 심볼릭 링크임을 확인해 `executablePath`로 지정하니 정상 실행됐다. 확인이 끝난 뒤 `git checkout -- playwright.config.ts`로 되돌렸다.

**증거**: 2026-08-05, `ls -la /opt/pw-browsers/chromium` → `-> /opt/pw-browsers/chromium-1194/chrome-linux/chrome`. `executablePath` 지정 전/후 동일 명령(`bun run test:e2e -- map-provider-choice`)의 실패/성공 대조.

---
triggers: [geolocation, getCurrentPosition, PERMISSION_DENIED, context.grantPermissions, playwright e2e hang, 위치 권한이 필요해요]
status: hypothesis
scope: this-session (headless chromium 1194 + @playwright/test 1.59.1 조합, geolocation 권한 미부여 상태)
date: 2026-08-05
---
## 이 세션에서는 geolocation 권한을 명시적으로 grant/deny하지 않으면 getCurrentPosition이 즉시 거부되지 않고 무한정 멈춘다

> `cheap-gas-finder/learnings.md`의 "이 sandbox Browser MCP 창에서는 geolocation이 항상 denied다" 항목과 겹쳐 보이지만 다른 도구다: 그 항목은 **Browser MCP**(즉시 거부), 이 항목은 **Playwright 헤드리스**(무한 대기)다. 모순 아님.

**지시문**: 이 세션의 Playwright(chromium 1194) 환경에서 `context.grantPermissions(["geolocation"])`를 호출하지 않은 채 실제 앱 페이지(`http://localhost:3000/`)에서 `navigator.geolocation.getCurrentPosition`을 호출하면 성공도 `PERMISSION_DENIED` 에러도 오지 않고 20초 넘게 아무 콜백도 오지 않는다(재현: `page.evaluate`로 직접 호출, 10초 타임아웃까지 관찰). `about:blank`(opaque origin)에서는 스펙대로 즉시 `ERROR:1`이 오므로, 이 현상은 "권한 프롬프트가 자동으로 거부되는" 게 아니라 "실제 origin에서 프롬프트가 뜬 채로 아무도 응답하지 않아 영원히 pending"인 것으로 보인다. cheap-gas-finder의 위치 거부 UI(S8)를 이 세션에서 재현하려면 `context.grantPermissions([])`(빈 배열로 명시적 거부) 또는 CDP로 권한을 명시적으로 deny하는 방법을 먼저 시도한다 — 안 되면 이 세션의 환경 한계로 문서화하고 실기기/다른 CI 환경에서 재확인을 요청한다. **map-provider-choice 자체의 버그가 아니다**: 새로 만든 e2e 테스트는 전부 `context.grantPermissions(["geolocation"])`를 먼저 호출해 이 경로를 피해간다.

**에피소드**: `e2e/cheap-gas-finder.spec.ts`의 `[S8][S1]` 테스트(권한 미부여 상태로 시작해 거부 UI를 확인하는 유일한 테스트)가 이 세션에서 `위치 권한이 필요해요` 텍스트를 5초 안에 찾지 못해 실패했다. map-provider-choice의 게이팅 로직 때문인지 의심해 페이지 스냅샷을 봤더니 `radio "카카오맵" [checked]`로 게이팅은 정확히 우회됐고 결과 화면(`ResultsPage`)까지 도달해 있었다 — 문제는 그 이후 순수 geolocation 타이밍이었다. `about:blank`에서의 raw API 호출(즉시 ERROR:1)과 실제 앱 페이지에서의 raw API 호출(10초 타임아웃)을 나란히 비교해 이 feature의 코드와 무관한 환경 차이임을 확인했다. 원인(권한 정책 헤더, chromium 1194의 자동거부 로직 차이 등)까지는 특정하지 못해 `hypothesis`로 남긴다.

**증거**: 2026-08-05, `/tmp/geo-raw.spec.ts`(about:blank, 결과 `ERROR:1`, 171ms) vs `/tmp/geo-app.spec.ts`(`http://localhost:3000/`, 결과 `TIMED_OUT_10S`) — 둘 다 이 대화의 임시 재현 스크립트, 저장소에는 커밋하지 않음. `e2e/cheap-gas-finder.spec.ts`의 `[S8][S1]` 테스트 실패 로그와 `error-context.md` 스냅샷(`근처 주유소를 찾는 중…` 상태로 멈춤).

---
triggers: [window.open, popup, chrome-error://chromewebdata, m.map.kakao.com, 프록시, 외부 도메인]
status: hypothesis
scope: this-session (아웃바운드 네트워크가 프록시를 통과하는 이 세션)
date: 2026-08-05
---
## 이 세션에서 m.map.kakao.com으로 실제 팝업 네비게이션이 chrome-error://chromewebdata로 끝난다

**지시문**: 이 세션에서 카카오맵 길찾기 e2e 테스트(`window.open`으로 연 새 탭이 `https://m.map.kakao.com/scheme/route`로 실제 리다이렉트되는지 확인하는 유형)를 돌리면 `popup.waitForLoadState()` 이후 `popup.url()`이 `chrome-error://chromewebdata/`가 될 수 있다 — 앱 코드나 URL 빌더 문제가 아니라 이 세션의 아웃바운드 네트워크(프록시 경유)가 `m.map.kakao.com` 같은 임의 외부 도메인으로의 실제 브라우저 네비게이션을 허용하지 않아서로 추정된다(원인 미확정이라 hypothesis). 이런 "실제 외부 도메인 도달"까지 확인하는 e2e 단언은 이 세션에서 신뢰할 수 없다 — URL 생성 자체는 단위 테스트(`lib/directions.test.ts`)로, 실제 네비게이션은 사용자 로컬 환경에서 재확인한다.

**에피소드**: `e2e/cheap-gas-finder.spec.ts`의 `[S6]` 테스트가 `expect(popup.url()).toMatch(/kakao\.com/)`에서 실제로는 `chrome-error://chromewebdata/`를 받아 실패했다. 같은 세션에서 `curl`로 일반 웹 요청은 프록시를 통해 정상 동작하는 걸 이미 알고 있어(system prompt의 `HTTPS_PROXY` 안내), 임의 외부 도메인으로의 브라우저 팝업 네비게이션만 막히는 것으로 추정했다. map-provider-choice가 새로 만든 네이버 버전(`nmap://`)은 애초에 팝업 이벤트 자체가 안 떠서(별도 항목 참고) 이 프록시 가설을 직접 재검증하지는 못했다.

**증거**: 2026-08-05, `bun run test:e2e -- cheap-gas-finder`의 `[S6]` 테스트 실패 로그(`Received string: "chrome-error://chromewebdata/"`).

---
triggers: [nmap://, window.open, popup event, custom scheme, 프로토콜 핸들러, waitForEvent timeout]
status: verified
scope: this-repo (Chromium 일반 — 커스텀 URL 스킴에 등록된 핸들러가 없는 모든 환경에 해당할 가능성 높음)
date: 2026-08-05
---
## `window.open("nmap://...")`은 Chromium에서 popup 페이지 이벤트 자체를 발생시키지 않는다

**지시문**: `https://` 같은 표준 스킴과 달리, 브라우저에 등록된 프로토콜 핸들러가 없는 커스텀 스킴(`nmap://`, `kakaomap://` 앱 딥링크 등)을 `window.open(url, "_blank")`으로 열면 Chromium이 새 `Page`/팝업 이벤트를 아예 만들지 않는다. Playwright e2e에서 `page.waitForEvent("popup")`으로 이런 딥링크 클릭을 검증하려 하면 새 탭이 열리지 않아 타임아웃(30초)으로 실패한다 — 코드 버그가 아니라 실기기(해당 앱이 설치된 모바일)에서만 실제로 열리는, 데스크톱 브라우저 자동화가 구조적으로 검증할 수 없는 경계다. URL 생성 자체(파라미터 정확성)는 단위 테스트로 증명하고, 실제 딥링크 오픈은 `test.fixme` + 사유 주석으로 남긴 뒤 실기기 확인으로 이월한다.

**에피소드**: map-provider-choice의 `e2e/map-provider-choice.spec.ts`에서 `[S6]`(네이버지도 길찾기) 테스트가 `page.waitForEvent("popup")`에서 30초 타임아웃으로 실패했다. `lib/directions.test.ts`·`station-list.test.tsx`의 단위 테스트는 이미 통과했으므로 URL 생성 로직 문제가 아님을 먼저 확인했고, `nmap://`이 미등록 커스텀 스킴이라는 데서 원인을 좁혔다. 카카오의 `S6` e2e 테스트가 `https://m.map.kakao.com/...`로 실제 팝업을 여는 데는 성공하는 것과 대조된다(단, 그 팝업의 최종 네비게이션은 별도 항목의 프록시 이슈로 실패). `test.fixme`로 전환하고 사유를 주석에 남겼다.

**증거**: 2026-08-05, `e2e/map-provider-choice.spec.ts`의 `[S6]` 테스트를 `test.fixme`로 전환(사유 주석 포함). 전환 전 실패 로그: `Error: page.waitForEvent: Test timeout of 30000ms exceeded. waiting for event "popup"`.
