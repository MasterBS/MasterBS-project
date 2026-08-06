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

