---
triggers: [Cannot find module 'next/server', authjs.session-token, next-auth vitest, next/server exports map, ERR_MODULE_NOT_FOUND next/server, "Did you mean to import next/server.js"]
status: verified
scope: this-repo (Next.js 16.1.6 / next-auth@5.0.0-beta.32 / vitest 4.x + vite SSR module resolution)
date: 2026-08-09
---
## Importing "next-auth" in vitest fails unless you alias "next/server" AND inline next-auth/@auth/core

**지시문**: vitest에서 `next-auth`(또는 그 콜백 등)를 직접 import하는 테스트가 `Cannot find module '.../next/server' ... Did you mean to import "next/server.js"?`로 실패하면, 두 가지를 함께 해야 한다 — 하나만으로는 고쳐지지 않는다: (1) `vitest.config.ts`의 `resolve.alias`에 `"next/server": path.resolve(__dirname, "node_modules/next/server.js")`를 추가한다(Next.js의 `package.json`에 `exports` 필드가 없어 Vite의 ESM 리졸버가 확장자 없는 서브패스 import를 못 찾는 알려진 한계). (2) 그것만으로는 안 고쳐진다 — vitest는 기본적으로 `node_modules`의 의존성을 externalize해서 Node의 네이티브 ESM 로더로 바로 로드하므로 (1)의 alias가 적용되지 않는다. `test.server.deps.inline: [/next-auth/, /@auth\/core/]`를 추가해 Vite 리졸버를 타게 해야 alias가 먹는다.

**에피소드**: Task 2에서 `lib/auth.test.ts`가 `authConfig`를 직접 import(next-auth 콜백을 단위 테스트하려고)하자 이 에러가 났다. next-auth 자체가 아니라 `next-auth/lib/env.js`가 (Next.js 웹팩/터보팩 특수 처리를 전제한) `import { NextRequest } from "next/server"`를 정적으로 갖고 있어서 발생 — Next.js 빌드에서는 문제없이 동작하지만 vitest에서는 그 특수 처리가 없다. alias만 추가했을 때는 여전히 실패했고, `server.deps.inline`을 추가로 넣은 뒤에야 통과했다.
**증거**: commit 417c94e의 `vitest.config.ts` diff(`resolve.alias["next/server"]` + `test.server.deps.inline`), `bun run test -- user-key auth` → 6 tests passed.

---
triggers: [authjs.session-token, next-auth v5 e2e, playwright inject session cookie, encode next-auth/jwt, salt cookie name, sessionToken.name, JWE session]
status: verified
scope: this-repo (next-auth@5.0.0-beta.32 / @auth/core, http://localhost 비보안 컨텍스트)
date: 2026-08-09
---
## next-auth v5 세션 쿠키는 이름="authjs.session-token"(http에서는 무접두어), salt도 같은 문자열 — `next-auth/jwt`의 encode()로 직접 발급 가능

**지시문**: next-auth v5(JWT 세션 전략)의 세션 쿠키를 Playwright에서 실 OAuth 없이 주입하려면, `next-auth/jwt`의 `encode({ token, secret, salt })`를 쓰고 `salt`에 쿠키 이름과 정확히 같은 문자열을 넣는다. 로컬 `http://localhost`(비보안 컨텍스트)에서는 쿠키 이름이 `authjs.session-token`(접두어 없음), 배포된 https에서는 `__Secure-authjs.session-token`이다. `secret`은 앱이 실제로 쓰는 `NEXTAUTH_SECRET`과 반드시 동일해야 decode가 성공한다(playwright.config.ts의 webServer가 같은 shell env를 상속하므로, `NEXTAUTH_SECRET`을 `.env.local`에 고정해두면 dev 서버와 e2e 스크립트가 항상 같은 값을 본다). 토큰 payload는 세션 콜백이 실제로 읽는 필드(이 저장소는 `{ userKey }`)만 있으면 충분하다 — `exp`/`sub`는 없어도 session action이 알아서 `sessionMaxAge`로 새 만료시간을 계산하고 `callbacks.jwt`를 계정 없이(`account: undefined`) 다시 통과시킨다.
**에피소드**: authjs.dev/getting-started 문서 페이지들이 이 환경의 egress 정책에서 전부 403(`EGRESS_BLOCKED`)이라 WebFetch로 직접 읽을 수 없었다(tmap SDK 때 겪은 `skopenapi.readme.io` 403과 같은 패턴). 대신 `raw.githubusercontent.com`으로 next-auth/@auth/core 소스(`packages/core/src/lib/utils/cookie.ts`의 `defaultCookies()`, `packages/core/src/lib/actions/session.js`의 `salt = options.cookies.sessionToken.name`)를 직접 읽어 쿠키 이름·salt 파생 규칙을 1차 소스로 확인한 뒤 `e2e/auth-helpers.ts`(`loginAs`)를 작성했다. 티맵 SDK를 웹서치 요약만으로 3번 잘못 짠 전례(`tmap-provider-integration/learnings.md`) 때문에, 이번엔 실제 설치된 `node_modules/@auth/core`의 컴파일된 소스까지 대조해 이중 확인했다.
**증거**: `e2e/auth-helpers.ts`의 `loginAs()`(salt/cookie name 하드코딩 + 주석에 출처 명시), `e2e/sso-login.spec.ts` 3개 테스트 모두 실 Chromium에서 통과(`bun run test:e2e -- sso-login`, PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers).

---
triggers: [로그인 게이트, 기존 e2e 전부 깨짐, page.goto("/") 로그인 화면만 보임, cheap-gas-finder.spec.ts context 없음, map-provider-selection.spec.ts 회귀]
status: verified
scope: this-repo (sso-login이 처음으로 로그인을 필수 게이트로 만든 시점의 회귀)
date: 2026-08-09
---
## 로그인을 필수 게이트로 만들면 이전 feature들의 기존 e2e 스펙 전부가 회귀한다 — plan.md의 "영향 받는 파일"에는 없었다

**지시문**: 이 저장소처럼 무상태·익명이던 앱에 로그인 게이트를 도입하는 plan을 실행할 때는, "영향 받는 파일" 표에 신규 e2e 스펙만 적혀 있어도 **기존 e2e 스펙 전체**(이 경우 `e2e/cheap-gas-finder.spec.ts`, `e2e/map-provider-selection.spec.ts`)가 `page.goto("/")` 직후 로그인 화면만 보게 되어 전부 깨진다는 것을 Task 완료 조건에 포함해야 한다. 각 `test()`에 `context` 파라미터를 추가하고(없으면 추가) `page.goto("/")` 직전에 세션 주입 헬퍼를 호출해야 한다. 공용 헬퍼(`e2e/auth-helpers.ts`)를 만들어 재사용한다.
**에피소드**: Task 4에서 로그인 게이트를 붙인 뒤 `bun run test:e2e -- map-provider-selection`/`cheap-gas-finder`를 돌리기 전에 먼저 실행했다면 전부 실패했을 것 — plan.md Task 4의 "구현 대상"은 `e2e/sso-login.spec.ts` 신규 작성만 언급했다. 두 기존 스펙 파일의 모든 `test()`에 `await loginAs(context, "kakao:e2e-test")`를 `page.goto("/")` 앞에 추가(일부는 `context` 파라미터 자체가 없어서 시그니처도 같이 고침)한 뒤에야 그린으로 돌아왔다.
**증거**: commit(Task 4)의 `e2e/cheap-gas-finder.spec.ts`/`e2e/map-provider-selection.spec.ts` diff, `bun run test:e2e -- map-provider-selection` 7개 중 6개 통과(1개는 아래 별도 항목의 egress 이슈), `bun run test:e2e -- cheap-gas-finder` 9개 중 7개 통과 + 1 skipped(기존 test.fixme) + 1개는 아래 별도 항목의 egress 이슈.

---
triggers: [map.naver.com 403, map.kakao.com 403, chrome-error://chromewebdata, connect_rejected, kakao.com 길찾기 e2e 실패]
status: hypothesis
scope: this-sandbox-session (egress 정책이 세션마다 다를 수 있음 - map-provider-selection/tmap-provider-integration의 기존 항목과 동일 패턴)
date: 2026-08-09
---
## 이번 세션은 map.naver.com에 더해 map.kakao.com/m.map.kakao.com도 403으로 막혀 있다 - sso-login과 무관한 기존 e2e 실패

**지시문**: `e2e/map-provider-selection.spec.ts`의 "[네이버지도 길찾기 웹 폴백]"이나 `e2e/cheap-gas-finder.spec.ts`의 "[S6] 길찾기 버튼을 클릭하면 새 탭에 카카오맵 길찾기가 열린다"가 실패하면(`chrome-error://chromewebdata` 또는 waitForURL 타임아웃), sso-login 변경을 의심하기 전에 `$HTTPS_PROXY/__agentproxy/status`의 `recentRelayFailures`와 `curl -sS -o /dev/null -w "%{http_code}" https://map.kakao.com`/`https://map.naver.com/...`을 먼저 확인한다. 이 두 도메인 모두 CONNECT 403이면 세션 egress 정책 문제이지 코드 회귀가 아니다.
**에피소드**: `tmap-provider-integration/learnings.md`(2026-08-06)는 `map.naver.com`만 403이었다고 기록했는데, 이번 세션(2026-08-09)은 `map.kakao.com`도 403이었다 - egress 정책이 세션마다(또는 날짜마다) 달라질 수 있다는 기존 hypothesis가 다시 확인됐다. sso-login의 diff는 두 파일 모두 `loginAs()` 호출 추가뿐이고 `lib/directions.ts`는 건드리지 않았으므로 회귀가 아니라고 판단했다.
**증거**: `curl -sS -o /dev/null -w "HTTP %{http_code}" https://map.kakao.com` → tunnel 403, 같은 명령의 `https://map.naver.com/...` → tunnel 403, `bun run test:e2e -- cheap-gas-finder`(7 passed, 1 skipped, 1 failed - kakao.com), `bun run test:e2e -- map-provider-selection`(6 passed, 1 failed - naver.com).

---
triggers: [SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다, /api/user-settings 500, use-map-provider stuck loading, e2e 검색 화면 안 뜸, page.route api/user-settings]
status: verified
scope: this-repo (실 Supabase 프로젝트 없는 sandbox 전용 - 실 배포에서는 무관)
date: 2026-08-09
---
## 로그인 이후 화면을 다루는 e2e는 /api/user-settings도 스텁해야 한다 - 실 Supabase가 없으면 500이 나서 useMapProvider가 영원히 loading에 머문다

**지시문**: `hooks/use-map-provider.ts`가 마운트 시 `GET /api/user-settings`를 부르고, 이 sandbox에는 `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`가 없어 그 라우트가 항상 500(HTML 에러 페이지)을 반환한다. `res.json()`이 그 HTML을 파싱하려다 실패해 `useMapProvider`의 상태가 `"loading"`에서 영원히 못 벗어난다 - 로그인 이후 화면(검색 화면, provider 선택 화면, 이후 즐겨찾기 등)을 다루는 모든 e2e 테스트는 `loginAs()`와 함께 `stubUserSettings(page, { mapProvider })`도 반드시 호출해야 한다. `e2e/auth-helpers.ts`의 `stubUserSettings`는 GET/PUT을 상태 있게(stateful) 다뤄서, provider를 바꾸는 테스트가 새로고침 후에도 바뀐 값을 보게 해준다(map-provider-selection의 "새로고침해도 유지" 시나리오가 실제로 그렇다).
**에피소드**: Task 5에서 `hooks/use-map-provider.ts`를 계정 fetch 기반으로 바꾼 뒤 `e2e/sso-login.spec.ts`의 S13 테스트("계정에 provider가 이미 있으면 곧장 검색 화면")를 `loginAs()`만 호출해 짰더니 검색 화면이 전혀 뜨지 않았다(spinner에 계속 머묾) - 브라우저 콘솔에는 `/api/user-settings` 500과 `res.json()`의 JSON 파싱 에러가 함께 찍혔다. Task 4에서 이미 "로그인 게이트가 기존 e2e를 깨뜨린다"는 교훈을 남겼는데, Task 5는 그 위에 한 겹 더(계정 설정 fetch) 깨뜨린 것 - 같은 종류의 함정이 계층마다 반복될 수 있다는 뜻으로 기록해둔다.
**증거**: `e2e/auth-helpers.ts`의 `stubUserSettings()`, `e2e/cheap-gas-finder.spec.ts`/`e2e/map-provider-selection.spec.ts`/`e2e/sso-login.spec.ts` 전체에 배선, `bun run test:e2e -- sso-login`(6/6 통과), `bun run test:e2e -- map-provider-selection`(6/7, 1개는 위 egress 항목과 동일한 무관 실패).

---
triggers: [기존 유종·브랜드 필터 상태 관리 훅, use-account-filters, plan.md Modify 존재하지 않는 파일, page.tsx useState fuel brands]
status: verified
scope: this-repo (sso-login plan.md Task 7의 "영향 받는 파일" 표 부정확)
date: 2026-08-09
---
## plan.md가 "기존 유종·브랜드 필터 상태 관리 훅(Modify)"이라 부른 파일은 실제로 존재하지 않았다 - 신규 훅으로 추출

**지시문**: plan.md의 "영향 받는 파일" 표가 특정 파일을 "Modify"로 지정했는데 실제 코드베이스에 그런 파일이 없다면(이번 경우 fuel/brands는 `app/page.tsx` 안 `useState` 두 줄이 전부였고 별도 훅이 없었다), 억지로 기존 파일을 찾지 말고 plan의 의도(계정 동기화 책임을 캡슐화)에 맞는 신규 파일을 만들되 그 판단을 기록한다. `hooks/use-account-filters.ts`를 새로 만들어 `app/page.tsx`의 로컬 `useState<FuelType>`/`useState<BrandKey[]>`를 대체했다.
**에피소드**: Task 5의 `hooks/use-map-provider.ts`와 거의 동일한 모양(마운트 시 GET, 로컬 낙관적 업데이트 + PUT)으로 설계했다 - 계정에 값이 없으면(S5) 기기 기본값을 유지하며 변경 시 PUT, 값이 있으면(S6) 그 값을 그대로 적용. 다만 `useMapProvider`와 `useAccountFilters`가 각각 독립적으로 `GET /api/user-settings`를 호출해 마운트 시 요청이 중복된다(기능적으로는 무해 - idempotent GET) - 나중에 두 훅을 하나의 `useAccountSettings()`로 합쳐 fetch를 공유할 여지가 있다. 이번 Task 범위에서는 plan의 파일 경계(Task 5=use-map-provider.ts, Task 7=필터 훅)를 그대로 지키기 위해 합치지 않았다.
**증거**: `hooks/use-account-filters.ts`, `hooks/use-account-filters.test.ts`의 `[sso-login S5][S5]`/`[sso-login S6][S6]` 테스트, `app/page.tsx`의 `useAccountFilters()` 배선.

---
triggers: [Task 8, settings-sheet 계정 저장, 이미 구현됨, 프로덕션 코드 변경 없음]
status: verified
scope: this-repo (sso-login Task 5의 설계가 Task 8 요구사항을 미리 충족한 경우)
date: 2026-08-09
---
## Task 8("설정에서 provider 재선택 시 계정 저장")은 Task 5의 설계 때문에 이미 완료돼 있었다 - 코드 변경 없이 e2e로 증명만 추가

**지시문**: 어떤 Task가 이전 Task의 설계(여기서는 `hooks/use-map-provider.ts`의 `setProvider`가 낙관적 업데이트 + PUT을 항상 함께 수행)로 인해 이미 저절로 충족돼 있다면, 억지로 코드를 다시 건드리지 않는다. 대신 그 사실을 실행 증거(테스트)로 명시적으로 증명하는 새 테스트를 추가해 "우연이 아니라 의도된 재사용"임을 남긴다.
**에피소드**: `components/gas/settings-sheet.tsx`는 `onProviderChange` prop만 호출하는 순수 프레젠테이션 컴포넌트이고, `app/page.tsx`가 여기에 넘기는 함수는 Task 5에서 만든 `useMapProvider()`의 `setProvider`(계정 PUT 포함) 그 자체다 - `MapProviderPicker`(최초 선택)와 `SettingsSheet`(재선택)가 정확히 같은 함수를 공유한다. 그래서 Task 8은 프로덕션 코드를 전혀 바꾸지 않고, `e2e/sso-login.spec.ts`에 "설정 화면에서 지도 provider를 다시 고르면 그 변경도 계정에 저장된다" 테스트 하나만 추가해 실 브라우저에서 PUT 요청 바디를 직접 확인했다.
**증거**: `e2e/sso-login.spec.ts`의 해당 테스트(PUT 바디가 `{ mapProvider: "kakao" }`인지 `expect.poll`로 확인), `bun run test:e2e -- sso-login`(8/8 통과).

---
triggers: [setState 함수형 업데이터, useState updater 타이밍, previous state race, "expected null to be", 낙관적 업데이트 되돌리기, optimistic update revert 실패, 이미 resolve된 Promise 테스트]
status: verified
scope: this-repo (React 19, vitest + @testing-library/react — 이미 resolve된 mock Promise를 쓰는 테스트에서 재현)
date: 2026-08-09
---
## setState(updaterFn) 안에서 부수효과로 값을 캡처하면, 이미 resolve된 mock Promise의 .then/.catch가 그 업데이터보다 먼저 실행될 수 있다

**지시문**: "현재 상태를 나중에 쓰려고 `setState((s) => { capturedVar = s.x; return {...}; })`처럼 클로저 변수에 부수효과로 담아두는" 패턴을 async 흐름(특히 즉시 resolve되는 mock Promise를 쓰는 테스트)과 섞지 않는다. React는 그 업데이터 함수를 호출 시점에 동기적으로 실행한다고 보장하지 않는다 — 실제 다음 렌더 커밋 시점에 호출될 수 있고, 이미 resolve된 Promise의 `.then()/.catch()`가 microtask 큐에서 그보다 먼저 실행되는 경우가 있다(관찰됨: 콘솔 로그 순서가 "setState 호출" → "`.then`/`.catch` 실행(capturedVar 아직 초기값)" → "업데이터 함수 실행(뒤늦게 capturedVar 대입)"). 대신 캡처가 필요한 이전 값은 **호출 시점에 동기적으로 직접 읽는다**: 훅의 클로저에 있는 `state.x`를 그대로 읽고(예: `const previous = state.x;`), 그 값이 최신이 되도록 해당 콜백을 `useCallback(fn, [state.x])`처럼 관련 state를 deps에 넣어 매 렌더마다 재생성한다. `[]` deps로 고정한 채 함수형 업데이터의 부수효과에 의존하지 않는다.
**에피소드**: `hooks/use-map-provider.ts`의 `setProvider`에 "PUT 실패 시 이전 provider로 되돌리기"(code-review Step 4 finding)를 추가하면서 `let previous; setState(s => { previous = s.provider; return {...}; })` 패턴을 썼는데, `hooks/use-map-provider.test.ts`의 revert 테스트가 계속 `expected null to be 'naver'`로 실패했다. 각 단계에 `console.log`를 심어 실행 순서를 직접 관찰하고 나서야("optimistic updater ran"이 "catch handler running, previous= null"보다 **늦게** 찍힘) 원인을 확정했다 — 테스트의 `fetchMock.mockResolvedValueOnce(...)`가 이미 resolve된 Promise라 `.then/.catch` 체인이 React의 실제 커밋 스케줄보다 먼저 도는 경우가 있었다. `previous`를 `state.provider`에서 직접 읽고 `setProvider`를 `[state.provider]` deps로 바꾸자 즉시 해결됐다(`hooks/use-map-provider.test.ts`의 "reverts to the previous provider when the PUT fails" 통과).
**증거**: commit(Step 4 code-review fixes)의 `hooks/use-map-provider.ts` diff(`useCallback([], ...)` → `useCallback([state.provider], ...)`, 클로저 부수효과 제거), `hooks/use-map-provider.test.ts`의 revert 테스트, 디버그 세션의 `console.log` 순서 증거(재현 스크립트는 남기지 않음 — 원인 확정 후 제거).

---
triggers: [code-review Step 4, findings 판정, FavoriteButton 초기 즐겨찾기 상태, 하트 상태 재로드]
status: verified
scope: this-repo (execute-plan Step 4 — /code-review 실행 결과 판정)
date: 2026-08-09
---
## Step 4 /code-review 실행 결과와 판정(Critical/Important/Suggestion)

**지시문**: 이 feature에 다시 손댈 때, 아래 findings 중 미반영 항목(#1)을 먼저 검토한다.

`/code-review --high`로 `origin/main`부터의 전체 diff를 검토했다(단일 패스, Agent 서브에이전트 팬아웃 없음). 5개 finding, 판정:

1. **Important, 의도적으로 기각(scope-reject)**: `FavoriteButton`이 항상 `useState(false)`로 시작해 계정에 이미 저장된 즐겨찾기 상태를 반영하지 않는다(새로고침 후 실제로는 즐겨찾음인데 하트가 빈 채로 보임 → 다시 누르면 오히려 해제됨). plan.md Task 9의 구현 대상은 `favorite-button.tsx`(New)와 `station-list.tsx`(Modify)만 명시했고 초기 상태 하이드레이션(예: 목록 렌더 시 `GET /api/favorites`와 대조)은 범위에 없었다 — 이번 실행에서는 고치지 않고 다음 세션/feature의 할 일로 남긴다. 재발 시 `station-list.tsx`가 `favoritedStationIds: Set<string>` 같은 걸 상위(`app/page.tsx`)에서 받아 각 `FavoriteButton`의 초기값으로 넘기는 방식을 검토할 것.
2. **Important, 반영**: `hooks/use-map-provider.ts`/`hooks/use-account-filters.ts`/`components/gas/favorites-list.tsx`의 `GET /api/user-settings`·`GET /api/favorites` fetch 체인에 `res.ok` 체크나 `.catch`가 없어 실패 시 영원히 로딩 상태에 머물거나(useMapProvider — 앱 전체가 멈춤) unhandled rejection이 남았다(useAccountFilters — UI는 기본값으로 계속 동작하지만 정리 안 된 rejection). `useMapProvider`/`FavoritesList`에 `"error"` 상태 + `retry()` + `AccountErrorMessage`(신규, `components/gas/status-message.tsx`)를 추가했고, `useAccountFilters`는 UI를 막지 않으므로 실패해도 기기 기본값으로 조용히 `"loaded"`로 전환하도록만 고쳤다(에러 UI 없음, rejection만 정리).
3. **Important, 반영**: `setProvider`가 낙관적으로 업데이트한 뒤 PUT 실패를 검사하지 않아 계정에 반영 안 된 값을 UI가 계속 보여줄 수 있었다(다음 로그인 시 provider가 사라진 것처럼 보임). PUT 실패 시 되돌리도록 고쳤다(위 항목의 setState 타이밍 버그를 여기서 발견·수정).
4. **Important, 반영**: `PUT /api/user-settings`가 body를 런타임 검증 없이 그대로 저장해 잘못된 `mapProvider`/`fuelType`/`brands` 값이 계정에 저장될 수 있었다. `app/api/user-settings/route.ts`에 검증을 추가해 알 수 없는 값은 400을 반환하도록 고쳤다(`app/api/stations/route.ts`의 기존 검증 패턴과 동일한 스타일).
5. **Important, 부분 반영**: `services/favorites.ts`의 `toggleFavorite`가 select-then-insert/delete로 원자적이지 않아 동시 요청(연속 더블클릭)이 unique 제약을 건드릴 수 있었다. 가장 흔한 경우(같은 버튼 더블클릭)는 `FavoriteButton`에 `pending` 상태로 버튼을 막아 방지했다 — 여러 탭/기기에서 동시에 같은 항목을 토글하는 진짜 레이스는 여전히 남아있다(서버 쪽 원자적 upsert로 근본 해결 가능하지만 이번 실행에서는 범위 밖으로 판단해 손대지 않음).

**증거**: 위 5개 항목에 대응하는 각 파일의 diff와 신규/수정 테스트(`hooks/use-map-provider.test.ts`, `hooks/use-account-filters.test.ts`, `components/gas/favorites-list.test.tsx`, `components/gas/favorite-button.test.tsx`, `app/api/user-settings/route.test.ts`, `app/page.test.tsx`), `bun run test`(168 tests 통과), `bun run typecheck`, `bun run build`, `scripts/spec-coverage.sh sso-login --tests`(커버리지 OK 유지).
