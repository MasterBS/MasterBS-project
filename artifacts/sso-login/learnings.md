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
