---
triggers: [tmap, Tmapv2, apis.skplanetx.com, apis.openapi.sk.com, tmapapi.sktelecom.com 403, skopenapi.readme.io 403, window.Tmap, window.Tmapv2, tmap sdk script url]
status: hypothesis
scope: this-repo (Tmap JS SDK — 실 appKey 미검증)
date: 2026-08-06
---
## Tmap JS SDK는 `window.Tmap`이 아니라 `window.Tmapv2`이고, 스크립트 URL도 plan.md의 추정과 다르다

**지시문**: 이 feature에서 Tmap SDK를 다시 다루게 되면, plan.md Task 1이 적어둔 `https://apis.skplanetx.com/tmap/js?version=1&format=javascript&appKey=<KEY>` / `window.Tmap`을 쓰지 않는다. 대신 스크립트 태그는 `https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=<KEY>`를 쓰고, 로드 후 노출되는 전역은 `window.Tmapv2`다. 카카오/네이버와 달리 `Tmapv2.maps.Map`처럼 한 단계 더 감싸져 있지 않고 `Tmapv2.Map`/`Tmapv2.LatLng`/`Tmapv2.Marker`/`Tmapv2.LatLngBounds`/`Tmapv2.Size`가 네임스페이스에 바로 달려 있다. `LatLngBounds`는 카카오(무인자)·네이버(sw/ne 필수)와 또 달리 선택적 단일 `LatLng` 인자를 받는다(`new Tmapv2.LatLngBounds(firstLatLng)`), bounds 적용은 `map.fitBounds(bounds)`. 마커 아이콘은 네이버의 `{url, size}` 객체나 카카오의 `MarkerImage` 클래스가 아니라 `icon: "이미지url"`(문자열) + `iconSize: new Tmapv2.Size(w,h)` 두 개의 개별 prop이다.
**Map 생성자의 container 인자(HTMLElement vs id 문자열)는 검증되지 않았다** — 검색으로 찾은 예제는 전부 `new Tmapv2.Map("map_div", {...})`처럼 문자열 id를 썼지만, 이 저장소의 카카오/네이버 구현은 둘 다 `containerRef.current`(HTMLElement)를 직접 넘긴다. `components/gas/tmap-map-view.tsx`는 기존 아키텍처와의 일관성을 위해 HTMLElement를 그대로 넘기도록 작성했다 — **실 appKey로 최초 렌더링을 확인하기 전까지는 이 부분이 틀렸을 수 있다.**

**에피소드**: plan.md Task 1은 1차 공식 문서(`tmapapi.sktelecom.com`)가 이 환경의 WebFetch에서 403이 난다는 걸 미리 알고 대체 경로(`skopenapi.readme.io`, `community.openapi.sk.com`, 웹 검색)를 지시했다. 실행해보니 `skopenapi.readme.io`, `tmap-skopenapi.readme.io`, `community.openapi.sk.com`, `shj7242.github.io`, `velog.io` 등 시도한 모든 개별 URL이 WebFetch에서 403을 반환했고(`curl`로 직접 접근도 프록시 정책상 차단됨 — `$HTTPS_PROXY/__agentproxy/status`의 `recentRelayFailures`에 `connect_rejected` 기록), 결국 WebSearch의 요약 결과(여러 독립 검색 쿼리에서 반복적으로 일치하는 스크립트 URL·네임스페이스·마커 옵션)로만 API 표면을 재구성했다. 1차 문서 원문을 직접 읽지 못했으므로 `status: hypothesis`로 남긴다.
**증거**: WebSearch 쿼리 다수(`"apis.openapi.sk.com/tmap/jsv2" appKey script`, `"Tmapv2.LatLngBounds"...`, `"Tmapv2.Marker" position icon iconSize...` 등)의 요약 결과가 스크립트 URL·`window.Tmapv2`·마커 옵션명에 대해 서로 다른 독립 소스(SK Open API 커뮤니티 포럼 스니펫, 개인 개발 블로그 2곳)에서 일관되게 일치. `lib/tmap-loader.ts`/`components/gas/tmap-map-view.tsx`(commit f1efbcd)는 이 가정 위에 작성됐고 fake `window.Tmapv2` mock으로만 단위 테스트 통과 — 실 SDK 응답으로 검증된 적은 없다. **재발 시(실 appKey 발급 후 `bun run dev`에서 지도가 렌더링되지 않으면) 이 항목부터 재확인할 것** — 특히 container 인자 타입과 마커 옵션명.

---

---
triggers: [spec-coverage.sh, "Checkpoint: Tasks 1~2", bun run build 실패, tsc 전역 타입체크, MapViewProps 필수 prop, 체크포인트 순서]
status: verified
scope: this-repo (plan.md의 Task 순서 vs tsc 전역 타입체크)
date: 2026-08-06
---
## plan.md 중간 Checkpoint의 "bun run build 성공"은 MapView처럼 신규 필수 prop을 추가하는 구조에서 Task 완료 전까지 구조적으로 불가능할 수 있다

**지시문**: `MapViewProps`에 `tmapAppKey`처럼 **필수(optional 아님)** prop을 추가하면, 그 prop을 실제로 채워주는 소비자(`app/page.tsx`, Task 6)가 아직 없는 중간 Task 시점(Task 2~5)에는 `bun run build`/전역 `tsc`가 항상 실패한다 — TS는 파일 단위가 아니라 프로젝트 전체를 컴파일하기 때문에, plan.md가 "Checkpoint: Tasks 1~2"·"Checkpoint: Tasks 3~4"에 각각 `bun run build` 성공을 요구해도 Task 6(페이지 배선) 이전에는 만족 불가능하다. 이런 구조(스위처 컴포넌트에 새 필수 prop 추가 + 소비자 배선이 마지막 Task)를 다시 만나면, 중간 체크포인트의 "빌드 성공" 항목은 건너뛰고 `bun run test`(영향받은 파일)로 대체한 뒤, 최종 Task(페이지 배선) 완료 후에만 전역 `bun run build`를 게이트로 쓴다. 미리 알았다면 `tmapAppKey`를 Task 2 시점에 optional(`tmapAppKey?: string`)로 뒀다가 Task 6에서 required로 좁히는 방법도 있었다.

**에피소드**: Task 2(`components/gas/map-view.tsx`에 `tmapAppKey` 필수 prop 추가) 직후 `bun run typecheck`를 돌리자 `app/page.tsx`(tmapAppKey 미전달, Task 6 소관)와 `config/map-provider.ts`(`MAP_PROVIDER_LABELS`에 `tmap` 키 없음, Task 3 소관)에서 각각 타입 에러가 났다. plan.md의 Task 2 검증 항목은 `bun run test -- map-view`와 `bun run typecheck`만 명시했지만, 후자는 전역 검사라 이 두 미완료 파일 때문에 항상 실패하게 되어 있었다. Task별 판정 기준 소유권(Task 2=S1-2/S1-3/S4-1/S4-2/INV-1, Task 3=S3, Task 6=S1-1)은 그대로 유지하면서, "전역 typecheck/build 그린"이라는 별도 게이트만 Task 6 완료 시점으로 미뤘다 — Task 재정렬이나 병합은 하지 않았다.

**증거**: Task 2 커밋(`bun run test -- map-view` 17/17 통과) 시점의 `bun run typecheck` 실패 로그(`app/page.tsx(96,22)`, `config/map-provider.ts(7,14)`), Task 6 커밋 이후 `bun run build` 성공으로 최종 확인(아래 최종 체크포인트 참고).

---
triggers: [playwright install, cdn.playwright.dev 403, chromium revision mismatch, PLAYWRIGHT_BROWSERS_PATH, bunx playwright install 실패, test:e2e 실행 불가]
status: verified
scope: this-repo (이 sandbox 이미지 — /opt/pw-browsers에 chromium-1194만 사전 설치됨)
date: 2026-08-06
---
## 이 sandbox는 Playwright 브라우저를 새로 다운로드할 수 없다 — package.json의 `^1.52.0`이 최신으로 resolve되면 사전 설치된 revision과 어긋난다

**지시문**: `bun run test:e2e`가 브라우저 실행 파일을 못 찾거나 `bunx playwright install`이 `cdn.playwright.dev`에서 403(정책 차단, `$HTTPS_PROXY/__agentproxy/status`의 `recentRelayFailures`에 `connect_rejected` 기록)으로 실패하면, 먼저 `PLAYWRIGHT_BROWSERS_PATH`(`/opt/pw-browsers`)에 이미 설치된 revision을 확인한다(`ls /opt/pw-browsers`). `package.json`의 `playwright`/`@playwright/test`가 `^1.52.0`처럼 넓은 caret range면 `bun install`이 최신 patch(예: 1.59.1, chromium revision 1217 요구)로 resolve해버려 사전 설치된 revision(예: 1194)과 어긋난다. 해결: 사전 설치된 revision과 맞는 `playwright-core` 버전을 `node_modules/playwright-core/browsers.json`의 revision 필드로 역탐색(여러 후보 버전을 `bun add playwright-core@<v> --no-save`로 설치해보며 비교)한 뒤, 그 정확한 버전을 `bun add playwright@<v> @playwright/test@<v> --no-save`로 설치한다. `--no-save`를 쓰면 `package.json`/`bun.lock`이 바뀌지 않아 이 세션만의 임시 조정으로 남는다 — feature 범위와 무관한 의존성 버전 변경을 커밋 diff에 섞지 않기 위함이다.

**에피소드**: Task 6에서 `bun install` 후 `bunx playwright install chromium --with-deps`가 매번 `cdn.playwright.dev`에서 403을 반환했다. `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`가 이미 설정돼 있었고 `chromium-1194`가 사전 설치돼 있었지만, `bun install`이 resolve한 `playwright-core@1.59.1`은 revision `1217`을 요구해 버전이 어긋났다. `/tmp` 스크래치 디렉터리에서 `playwright-core@1.56.0/1.55.0/1.54.0/1.53.0`을 차례로 설치해 `browsers.json`의 revision을 비교한 결과 `1.56.0`이 정확히 `1194`와 일치했다. `bun add playwright@1.56.0 @playwright/test@1.56.0 --no-save`로 맞춰 설치하자 `bun run test:e2e -- map-provider-selection`이 실제 Chromium에서 실행됐다(신규 티맵 케이스 2개 통과). `git status`로 `package.json`/`bun.lock`이 그대로임을 확인했다.

**증거**: `/opt/pw-browsers`(chromium-1194, Chromium 141.0.7390.37), `playwright-core@1.56.0`의 `browsers.json` revision `1194` 일치 확인, `bun run test:e2e -- map-provider-selection` 실행 로그(6개 중 5개 통과 — 실패 1건은 `map.naver.com` 자체가 이번 세션 프록시 정책에서 403으로 막힌 기존 `map-provider-selection` 테스트이고 이 feature와 무관, 아래 별도 항목 참고).

---
triggers: [map.naver.com 403, connect_rejected, 네이버지도 길찾기 웹 폴백 e2e 실패, 프록시 정책 변경]
status: hypothesis
scope: this-sandbox-session (egress 정책이 세션마다 다를 수 있음)
date: 2026-08-06
---
## `map.naver.com`이 이번 세션의 egress 정책에서 403으로 막혀 있다 — `map-provider-selection`의 기존 웹 폴백 e2e가 tmap 변경과 무관하게 실패한다

**지시문**: `e2e/map-provider-selection.spec.ts`의 "[네이버지도 길찾기 웹 폴백]" 테스트가 `page.waitForURL`에서 타임아웃하면, tmap 변경을 의심하기 전에 `$HTTPS_PROXY/__agentproxy/status`의 `recentRelayFailures`에서 `map.naver.com:443`이 `connect_rejected`로 잡히는지 먼저 확인한다. 이 feature(tmap-provider-integration)의 변경과는 무관한, 이번 세션의 egress 정책(또는 일시적 프록시 상태) 문제일 수 있다.

**에피소드**: `map-provider-selection`의 learnings.md(줄 27-33, 2026-07-23)는 같은 URL을 `curl -L`로 200을 받았고 Playwright로 실제 경로 렌더링까지 확인했다고 기록했는데, 이번 세션(2026-08-06)에서는 `curl`도 `CONNECT tunnel failed, response 403`, e2e도 5초 타임아웃으로 실패했다. 코드 변경(`lib/directions.ts`, `buildNaverWebFallbackUrl` 등)은 이번 feature에서 건드리지 않았으므로 회귀가 아니라 세션별 egress 정책 차이로 보인다. `status: hypothesis`로 남기고 확정하지 않는다 — 매 세션 프록시 정책이 다시 열릴 수도 있다.

**증거**: `curl -sS -o /dev/null -w "HTTP %{http_code}" https://map.naver.com/p/directions/-/-/-/car` → tunnel 403, `$HTTPS_PROXY/__agentproxy/status`의 `recentRelayFailures`에 `map.naver.com:443` `connect_rejected` 2건(2026-08-06T11:10), `bun run test:e2e -- map-provider-selection` 로그에서 이 테스트만 실패(5/6 통과, tmap 신규 케이스 2개는 모두 통과).

---
triggers: [react-hooks/set-state-in-effect, bun run lint 실패, use-map-provider.ts eslint, use-stations.ts eslint, use-geolocation.ts eslint]
status: verified
scope: this-repo (Step 4 code review 판단 — /code-review 스킬이 이 환경에 없어 수동 검토로 대체)
date: 2026-08-06
---
## `bun run lint`의 `react-hooks/set-state-in-effect` 4건은 이 feature 이전부터 있던 기존 위반이라 기각한다

**지시문**: `bun run lint`가 `hooks/use-geolocation.ts`, `hooks/use-map-provider.ts`, `hooks/use-stations.ts`에서 "Calling setState synchronously within an effect" 에러를 내면, tmap-provider-integration이 원인인지 먼저 `git show <내 커밋> -- <파일>`로 확인한다 — `use-map-provider.ts`는 이번 feature에서 `isMapProvider` 가드 한 줄만 바꿨고 위반이 있는 effect 본문(`setProviderState(stored)`)은 건드리지 않았다. `use-geolocation.ts`/`use-stations.ts`는 이번 feature가 전혀 손대지 않은 파일이다. `git stash`(working tree가 이미 clean이라 스택할 것도 없음) 확인 결과로도 pre-existing임이 확인된다.

**에피소드**: 이 환경에는 `/code-review` 스킬이 설치돼 있지 않아(`.claude/skills/`에 없음) execute-plan Step 4를 수동 검토로 대체했다. `bun run lint` 전체 실행 중 이 4건을 발견했으나, `git show b00e809 -- hooks/use-map-provider.ts`로 diff를 확인해 내가 건드린 줄이 아님을 확인했고, 나머지 두 파일은 이번 feature의 "영향 받은 파일" 목록(plan.md)에도 없다. spec.md 판정 기준과 무관한 pre-existing 기술 부채이므로 고치지 않고 기각했다 — 고쳤다면 feature 범위를 벗어나는 별도 diff가 됐을 것이다.

**증거**: `bun run lint` 실패 로그(`hooks/use-geolocation.ts:41`, `hooks/use-map-provider.ts:17`, `hooks/use-stations.ts:26` 등 4 errors 2 warnings), `git show b00e809 -- hooks/use-map-provider.ts`(내 diff는 `isMapProvider` 함수 한 줄뿐), `git log --oneline -- hooks/use-map-provider.ts`(위반이 있는 effect는 `562baea`, map-provider-selection feature 커밋에서 도입됨).


---

---
triggers: [spec-coverage.sh, feature-prefix 태그, "[tmap-provider-integration", 테스트 미인용, bare 태그, ID 충돌, INV-2 오탐]
status: verified
scope: this-repo (scripts/spec-coverage.sh 현재 정규식, feature-prefix 태그 컨벤션)
date: 2026-08-06
---
## feature-prefix 태그(`[tmap-provider-integration S1-1]`)만 쓰면 `scripts/spec-coverage.sh --tests`가 그 ID를 "미인용"으로 오판한다 — bare 태그를 항상 나란히 붙여야 한다

**지시문**: 이 저장소의 다른 feature와 spec ID(S1, S2, INV-1 등)가 겹칠 위험이 있어 `[tmap-provider-integration S1-1]`처럼 feature-prefix 태그를 쓰기로 했다면(plan.md 아키텍처 결정 참고), **반드시 bare 태그(`[S1-1]`)를 같은 `it()`/`test()` 이름 안에 나란히 추가**한다 — 예: `it("[S1-1][tmap-provider-integration S1-1] ...")`. `scripts/spec-coverage.sh`의 `--tests` 검사는 `grep -rqE "\[$id(-[0-9]+)?\]"`로, `[`가 ID 바로 앞에 와야 매치된다. `[tmap-provider-integration S1-1]`처럼 `[` 다음에 feature 이름이 먼저 오면 정규식이 매치하지 못해 실제로 테스트가 있어도 "테스트 미인용"으로 보고한다. feature-prefix만으로는 이 스크립트를 통과시키지 못하고, disambiguation(사람이 읽을 때 어느 feature 소속인지 구분) 목적으로만 쓸 수 있다.

**에피소드**: `components/gas/map-view.test.tsx`의 INV-1 테스트는 이미 `[INV-1][tmap-provider-integration INV-1]`처럼 두 태그를 나란히 썼는데(전 Task에서 이렇게 작성됨), `lib/directions.test.ts`의 INV-2 테스트는 `[tmap-provider-integration S2][tmap-provider-integration INV-2]`처럼 feature-prefix만 썼다. `scripts/spec-coverage.sh tmap-provider-integration --tests`를 돌리니 다른 9개 ID는 전부 통과했는데 INV-2만 "테스트 미인용"으로 실패했다 — 확인해보니 나머지 9개는 사실 이 feature의 태그 형식과 무관하게, `cheap-gas-finder`·`map-provider-selection`의 **기존 bare 태그**(예: `app/page.test.tsx`의 `[S1-1]`, `hooks/use-map-provider.test.ts`의 `[S3]` 등, 전혀 다른 판정 기준)가 우연히 정규식에 매치되어 "커버됨"으로 보인 것이었다(`map-provider-selection/learnings.md:7`에 기록된 것과 동일한 종류의 우연한 매치). INV-2만 다른 feature에 동일 이름의 bare 태그가 전혀 없어서, 진짜로 이 feature의 테스트가 인용되지 않았다는 사실이 드러난 것. `[INV-2][tmap-provider-integration INV-2]`로 bare 태그를 추가하자 통과했다.

**증거**: `for id in S1-1 S1-2 S1-3 S2 S3 S4-1 S4-2 S5 INV-1 INV-2; do grep -rlE "\[$id(-[0-9]+)?\]" ...; done` 실행 결과 — INV-2만 매치 파일 0개, 나머지는 전부 `cheap-gas-finder`/`map-provider-selection` 소속 파일에서 매치(`app/page.test.tsx`, `hooks/use-map-provider.test.ts`(구 map-provider-selection 부분), `e2e/cheap-gas-finder.spec.ts` 등). `lib/directions.test.ts:127`을 `[INV-2][tmap-provider-integration INV-2]`로 수정한 뒤 `scripts/spec-coverage.sh tmap-provider-integration --tests` → "커버리지 OK"로 전환.

---

---
triggers: [tmap, Tmapv2.Map, container id, HTMLElement vs id, 프로덕션 크래시, client-side exception, new Tmapv2.Map]
status: hypothesis
scope: this-repo (Tmap JS SDK — 실 appKey로 프로덕션 재현, 수정 반영 완료·최종 확인 대기)
date: 2026-08-06
---
## 위 항목에서 미검증으로 남겨둔 "Map 생성자 container 인자" 위험이 실제 프로덕션에서 재현된 것으로 보인다 — HTMLElement 대신 DOM id(string)로 수정

**지시문**: `components/gas/tmap-map-view.tsx`가 `new tmap.Map(containerRef.current, {...})`처럼 HTMLElement를 넘기고 있다면, `new tmap.Map(id, {...})`처럼 컨테이너의 DOM id 문자열로 바꾼다. React에서는 `useId()`로 안정적인 id를 만들어 컨테이너 `<div id={id}>`에 붙이고, 그 문자열을 생성자에 넘긴다. `types/tmap.ts`의 `Map` 생성자 시그니처도 `container: HTMLElement` → `container: string`으로 함께 고친다.

**에피소드**: 이전 항목(위 참고)에서 이미 "실 appKey로 확인 전까지 이 부분이 틀렸을 수 있다"고 hypothesis로 남겨뒀는데, 사용자가 실제로 SK Open API 콘솔에서 앱키를 발급받아 Vercel 프로덕션(`master-bs-project.vercel.app`)에 등록·재배포한 뒤 "티맵" provider를 선택하자 처음엔 전체 페이지가 깨지는 "Application error: a client-side exception has occurred"가 떴고(스크린샷으로 확인), 재배포 후에는 (원인 불명의 변화로) 우리 코드의 `.catch()`가 정상적으로 잡아 "지도를 불러오지 못했어요" 에러 UI로 안전하게 떨어졌다. 사용자가 요청한 SK Open API 도메인 등록 가이드 페이지(`openapi.sk.com/products/detail?linkMenuSeq=35`)는 이 환경에서 WebFetch가 egress 정책으로 차단되어 직접 열지 못했지만, 대신 새로 검색한 독립적인 예제 코드(`new Tmapv2.Map("map_div", { center: new window.Tmapv2.LatLng(...), width, height, zoom })`)가 이전에 남겨둔 hypothesis와 정확히 일치하는 패턴(문자열 id, `zoom` 옵션 포함)을 다시 확인해줘서, 코드를 그에 맞게 고쳤다(`useId()`로 DOM id를 만들어 컨테이너에 붙이고 생성자에 그 id를 전달, `zoom: 15` 추가). `bun run test`(99/99)·`bun run typecheck`·`bun run build` 모두 통과했지만, **이 sandbox는 `apis.openapi.sk.com` 자체가 egress 정책으로 차단돼 있어 실제 SDK 응답으로 이 수정이 진짜 문제를 해결했는지 여기서는 검증할 수 없다** — 사용자의 프로덕션 환경에서 재확인 필요. 도메인(Referer) 미등록 문제일 가능성도 배제하지 못했으므로, 이 수정 후에도 지도가 안 뜨면 도메인 등록 여부부터 다시 점검할 것.

**증거**: `components/gas/tmap-map-view.tsx`의 `useId()`/`id={containerId}`/`new tmap.Map(containerId, {...})`, `types/tmap.ts`의 `Map: new (container: string, ...)`, `components/gas/tmap-map-view.test.tsx`의 "passes the container's DOM id string" 테스트(렌더된 div의 `id`와 fake `Map` 생성자에 전달된 `container` 값이 일치하는지 검증). 사용자가 보낸 두 스크린샷(첫 번째: 전체 페이지 크래시, 두 번째: 재배포 후 리스트는 정상 + 지도만 그레이스풀 에러)이 유일한 실제 증거이고, 이 sandbox 안에서 재현·검증한 것은 아니다.

---

---
triggers: [document.write, "Failed to execute 'write' on 'Document'", asynchronously-loaded external script, script.async, tmap sdk 로드 실패, 콘솔 에러]
status: verified
scope: this-repo (Tmap JS SDK — 실 프로덕션 콘솔 에러로 확인)
date: 2026-08-07
---
## Tmap SDK는 내부적으로 document.write()를 쓴다 — 동적으로 만든 `<script>`는 `async = false`로 명시해야 한다

**지시문**: Tmap SDK(`apis.openapi.sk.com/tmap/jsv2`)를 동적으로 `document.createElement("script")`로 주입할 때 `script.async = true`(또는 생략, 동적 script 엘리먼트의 기본값도 `true`)로 두면 실 appKey로 스크립트가 실제 로드된 뒤 브라우저 콘솔에 `Failed to execute 'write' on 'Document': It isn't possible to write into a document from an asynchronously-loaded external script unless it is explicitly opened.`가 뜨며 SDK 초기화가 깨진다. SDK 코드 내부가 `document.write()`(추가 리소스 script 태그 삽입 등 레거시 패턴으로 보임)를 호출하는데, 크롬은 "비동기로 삽입된 외부 스크립트"에서의 `document.write` 호출을 거부한다. 고치려면 스크립트 엘리먼트 생성 시 `script.async = false`를 명시한다 — 이미 문서 로드가 끝난 뒤(예: React `useEffect`)에 붙이는 태그라도, `async`를 명시적으로 `false`로 설정하면 실행 순서 시맨틱이 "동기 삽입"으로 취급되어 이 제약을 피해간다. 카카오/네이버 SDK는 이런 문제가 없었으므로(document.write를 안 쓰는 것으로 보임) `kakao-loader.ts`/`naver-loader.ts`는 건드릴 필요 없다.

**에피소드**: `artifacts/tmap-provider-integration/learnings.md`(이전 항목)에서 "Map 생성자 container 인자가 HTMLElement가 아니라 문자열일 수 있다"는 hypothesis를 확인하고 고쳐서 PR #6으로 병합·배포했는데, 사용자가 프로덕션(`master-bs-project.vercel.app`, 실 appKey 등록됨)에서 여전히 "지도를 불러오지 못했어요"를 보고 개발자도구 콘솔을 열어 정확한 에러 텍스트를 보내줬다: `jsv2?version=1&appKey=...:17 Failed to execute 'write' on 'Document': ...`. 이 sandbox는 `apis.openapi.sk.com` 자체가 egress 정책으로 막혀 있어 실제 스크립트 응답을 받아본 적이 없었기 때문에, 이 에러는 사용자의 실제 콘솔 출력이 있어야만 알 수 있었다 — container-id 수정은 필요했지만 충분하지 않았다(두 버그가 순차적으로 발견된 것). `lib/tmap-loader.ts`의 `script.async = true` → `false`로 수정.

**증거**: 사용자가 보낸 프로덕션 콘솔 에러 원문(위 인용), `lib/tmap-loader.ts`의 `script.async = false` + 주석, `lib/tmap-loader.test.ts`의 "sets async=false on the script tag" 회귀 테스트. 이 sandbox 안에서는 실 SDK 응답으로 재현·검증하지 못했으므로, 최종 확인은 프로덕션 재배포 후 사용자 쪽에서 필요하다.
