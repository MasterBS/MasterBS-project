---
triggers: [opinet, aroundAll.do, LPG, prodcd, K015, K027]
status: verified
scope: this-repo (오피넷 aroundAll.do API)
date: 2026-07-23
---
## 오피넷 LPG prodcd는 K015, K027 아님

**지시문**: 오피넷 aroundAll.do로 LPG(자동차용부탄) 가격을 조회할 때는 `prodcd=K015`를 쓴다. `K027`은 실호출 시 모든 반경에서 빈 배열만 돌아온다.

**에피소드**: plan.md는 LPG prodcd를 Task 2 실행 시 실호출로 확정하기로 미결정 상태였다. 서울 중구권 좌표(KATEC 311923, 551192)로 `K015`는 반경 10km에서 실제 LPG충전소 1곳(가격 1200원대)을 반환했고, `K027`은 반경 10km까지도 빈 배열이었다. 휘발유(B027)·경유(D047)는 기존에 검증된 대로 3km 내에서 바로 응답이 왔다.

**증거**: commit 4aa9d2c, `config/opinet.ts`의 `FUEL_PRODCD_MAP.lpg`

---

## vitest에서 fetch mock에 같은 Response 인스턴스를 재사용하면 "Body is unusable" 에러가 난다

**지시문**: 한 테스트에서 `fetch`가 여러 번 호출될 수 있는 코드(반경 확장 루프 등)를 테스트할 때는 `mockResolvedValue(response)`로 동일 Response 객체를 재사용하지 말고, `mockImplementation(() => new Response(...))`처럼 호출마다 새 Response를 만들어야 한다. Response body는 한 번만 읽을 수 있다.

**에피소드**: `services/stations.test.ts`에서 반경 확장이 여러 번 fetch를 호출하는 시나리오(S7-1: 3번 모두 호출, 필터 후 소수 결과)에서 `mockResolvedValue(jsonResponse(oil))`로 같은 Response를 매 호출에 반환하게 했더니 두 번째 `res.json()` 호출에서 `TypeError: Body is unusable: Body has already been read`가 났다. 서비스 코드 버그가 아니라 테스트 픽스처 문제였다 — `mockImplementation(async () => jsonResponse(oil))`로 바꿔 매번 새 Response를 생성하도록 고쳐서 해결했다.

**증거**: commit 4aa9d2c, `services/stations.test.ts`의 `[S7-1]`·`[stations] filters by brand...`·`[stations] builds request URL...` 테스트

---

## shadcn ToggleGroup(type="single")의 item은 role="radio"다, role="button" 아님

**지시문**: RTL로 shadcn `ToggleGroup`/`ToggleGroupItem`을 테스트할 때는 `screen.getByRole("radio", { name })`를 쓴다. `getByRole("button", ...)`는 실패한다 — 내부 `Toggle` primitive는 button 태그를 쓰지만, radix `ToggleGroup`이 single-select 모드에서 각 item에 `role="radio"`·`aria-checked`를 부여하는 roving-radiogroup 패턴이다.

**에피소드**: `app/page.test.tsx`의 [S2] 테스트에서 `getByRole("button", { name: "경유" })`가 `Unable to find role="button"` 에러로 실패했다. `components/ui/toggle.tsx` 소스만 보고 button 태그를 근거로 role을 추정했는데, 실제 렌더된 DOM은 `role="radio"`였다. role 추정은 소스 대신 렌더된 DOM(`screen.debug()` 또는 실패 메시지의 pretty-print)으로 확인해야 한다.

**증거**: commit 93d5c45, `app/page.test.tsx`의 `[S2] passes the newly selected fuel...` 테스트

---

## shadcn Badge를 순위 원형 배지로 재사용하지 않는다

**지시문**: 순위 숫자(1~5) 같은 커스텀 원형 인디케이터가 필요하면 shadcn `Badge`를 className으로 재단하지 말고 plain `<span>`에 Tailwind 유틸리티를 직접 쓴다. `Badge`는 `h-5 w-fit rounded-4xl px-2 py-0.5` 같은 상태-라벨용 치수를 갖고 있어 원형 배지로 쓰려면 대부분의 치수 클래스를 덮어써야 하는데, 이는 `.claude/rules/shadcn-guard.md`의 "컴포넌트 기본 스타일을 className으로 덮어쓰지 않는다" 규칙과 부딪힌다.

**에피소드**: `components/gas/station-list.tsx`의 순위 배지를 처음엔 `Badge`로 만들려다, variant는 색상만 다루고 크기·모양(원형)은 다루지 않는다는 걸 확인하고 plain `<span className="flex size-6 ... rounded-full bg-primary text-primary-foreground">`로 바꿨다. `bg-primary text-primary-foreground`처럼 semantic token은 그대로 재사용해 shadcn-guard의 우선순위 규칙(variant → semantic token → CSS 변수)은 지켰다.

**증거**: commit 93d5c45, `components/gas/station-list.tsx`

---

## 카카오맵 JS 키가 "NotAuthorizedError: disabled OPEN_MAP_AND_LOCAL service"로 막혀 있다

**지시문**: `.env.local`의 `NEXT_PUBLIC_KAKAO_MAP_KEY`(`7e7eb7ae093bdc9e385572119dbf67ff`)로 카카오맵 SDK(`dapi.kakao.com/v2/maps/sdk.js`)를 로드하면 실제로 `{"errorType":"NotAuthorizedError","message":"App(주유소알리미) disabled OPEN_MAP_AND_LOCAL service."}`를 반환한다. 이는 네트워크·CORS 문제가 아니라 **Kakao Developers 콘솔에서 해당 앱("주유소알리미")에 카카오맵(OPEN_MAP_AND_LOCAL) 제품이 활성화되어 있지 않다는 뜻**이다. 사용자가 developers.kakao.com → 해당 앱 → 제품 설정 → 지도에서 활성화해야 Task 4의 실제 지도 렌더링(S1-4, S5)이 어떤 환경에서도 동작한다. 이 학습이 재검색되면(같은 에러 문자열) 코드 문제로 오인해 디버깅하지 말고 바로 사용자에게 콘솔 설정을 확인하라고 안내한다.

**에피소드**: Task 4 체크포인트에서 Browser MCP로 실 브라우저 검증을 시도했다. 먼저 이 sandbox 브라우저가 geolocation 권한을 자동으로 "denied" 처리한다는 걸 확인했고(재시도 UI가 없는 Task 3~4 범위라 우회 불가), geolocation과 무관하게 카카오맵 자체가 동작하는지 확인하려고 실 키로 SDK 스크립트를 직접 로드했다. `<script>` 태그 삽입으로는 로드가 실패했고(sandbox의 스크립트 인젝션 제약으로 추정), `navigate()`로 SDK URL에 직접 이동해 응답 바디를 읽자 위 에러 메시지가 그대로 나왔다. 즉 sandbox 제약이 아니라 실제 API 키 설정 문제였다.

**증거**: 2026-07-23, `navigate` 후 `get_page_text`로 확인한 `https://dapi.kakao.com/v2/maps/sdk.js?appkey=7e7eb7ae093bdc9e385572119dbf67ff&autoload=false` 응답 본문. 코드(`lib/kakao-loader.ts`, `components/gas/map-view.tsx`)는 fake `window.kakao`로 단위 테스트 통과(commit bae3374)했다.

**후속(같은 날)**: 사용자가 Kakao Developers 콘솔에서 카카오맵 제품을 활성화한 뒤, 같은 URL이 정상 SDK 응답을 반환함을 재확인했다. 이어서 실 API 키 + Task 2 체크포인트의 실 좌표(`evidence/checkpoint-1.json`)로 브라우저에서 직접 마커·bounds 렌더링을 확인해 S1-4·S5를 증명했다. 증거: `evidence/task-4-map-render.md`.

---

## 이 sandbox Browser MCP 창에서는 geolocation이 항상 "denied"다 — happy path는 못 보지만 거부 상태 UI는 실제로 검증된다

**지시문**: 이 프로젝트에서 Browser MCP(`mcp__Claude_Browser__*`)로 위치 *허용* happy path(S1, S2 등)를 시각적으로 검증하려 하지 않는다 — `navigator.permissions.query({name:'geolocation'})`이 항상 `"denied"`를 반환하며, 프롬프트도 뜨지 않고 재시도로 우회할 수도 없다. 허용 흐름은 사용자에게 로컬 `bun run dev` + 본인 브라우저에서 확인해달라고 요청하거나, Playwright `context.grantPermissions(['geolocation'])`(최종 e2e 체크포인트에서 예정됨)로 대체한다. 반대로 위치 **거부** 상태 UI(S8 등)는 이 sandbox가 항상 거부하는 덕분에 오히려 실제 앱에서 그대로 재현·검증할 수 있다 — 별도 mock 없이 `bun run dev` 페이지를 열기만 하면 거부 분기가 실제로 렌더링된다.

**에피소드**: Task 3~4에서 처음 발견(빈 화면, 콘솔 에러 없음, `/api/stations` 호출도 없음) — 당시엔 거부 상태에 대한 UI 자체가 없어 "막힌 것"으로만 봤다. Task 7에서 위치 거부 UI(`LocationDeniedMessage`)를 구현한 뒤 같은 sandbox에서 `bun run dev`로 열어보니, 별도 조작 없이 실제로 "위치 권한이 필요해요" 화면이 렌더링되고 "다시 시도" 클릭도 콘솔 에러 없이 동작함을 확인했다 — 이 sandbox의 제약이 오히려 이 특정 시나리오의 무료 실 브라우저 증거가 됐다.

**증거**: 2026-07-23, Task 7 세션. `navigator.permissions.query({name:'geolocation'}).then(r => r.state)` → `"denied"`; `bun run dev` 페이지 스크린샷에서 S8 UI 확인.

**재발(Task 8)**: `beforeinstallprompt`도 같은 패턴이었다 — 리스너를 붙이고 재로드해도 캡처되지 않았다. geolocation 거부·이전 Kakao 스크립트 인젝션 실패까지 합쳐 이 sandbox Browser MCP는 **사용자 참여 휴리스틱에 의존하는 브라우저 이벤트/프롬프트(permission prompt, `beforeinstallprompt` 등)를 기술 조건 충족 여부와 무관하게 억제**하는 것으로 보인다. 이런 이벤트가 필요한 검증은 처음부터 시도하지 말고, 이벤트를 유발하는 근본 조건(manifest 내용, SW 등록 상태, 응답 코드 등)을 `fetch`/JS로 직접 확인하는 쪽으로 바로 넘어간다.

---

## next/dynamic(ssr:false) 컴포넌트는 테스트 파일 안에서 "처음 마운트되는 테스트"에서만 비동기로 나타난다

**지시문**: `next/dynamic(() => import(...), { ssr: false })`로 감싼 컴포넌트를 RTL로 테스트할 때, 같은 테스트 파일에서 그 컴포넌트가 실제로 렌더링 조건을 만족하는 **첫 번째** 테스트에서는 `render()` 직후 동기 `getByTestId`/`getByText` 대신 `await screen.findByTestId(...)`(또는 `waitFor`)를 써야 한다. dynamic import가 아직 resolve되지 않아 첫 렌더에는 아무것도 안 보인다. 그 이후 테스트들은 모듈이 캐시돼 동기 조회로도 통과하므로, 실패는 테스트 실행 순서에 따라 나타났다 사라졌다 한다.

**에피소드**: Task 7에서 `app/page.tsx`의 성공 분기를 "0곳/부분/5곳"으로 세분화하면서, 그동안 `stations: []`로 목업하던 여러 테스트([S2][S3][S4-1])가 더 이상 `MapView`를 렌더링하는 분기를 타지 않게 됐다. 그 결과 파일 안에서 `MapView`가 실제로 렌더링되는 **첫** 테스트가 기존 [S5] 테스트로 바뀌었고, 그 테스트의 동기 `getByTestId("map-view-mock")`이 `Unable to find element`로 실패했다. 컴포넌트나 로직 버그가 아니라 dynamic import 타이밍 문제였다 — 해당 첫 조회를 `await screen.findByTestId(...)`로 바꿔 해결했다.

**증거**: commit 4dd5feb, `app/page.test.tsx`의 `[S5] shares selection state...` 테스트

---

## sharp/ImageMagick/PIL 없이 PNG 아이콘이 필요하면 순수 Node `zlib`로 직접 인코딩한다

**지시문**: 이 머신에는 `sharp`(bun의 `ignoreScripts`로 네이티브 바인딩 미설치), ImageMagick(`convert`/`magick`), Python PIL이 전부 없고 macOS `sips`는 기존 이미지 리사이즈만 가능해 무(無)에서 생성은 못 한다. PWA 아이콘처럼 간단한 단색/도형 PNG가 필요하면, `node:zlib`의 `deflateSync`와 표준 CRC32 구현만으로 PNG 청크(IHDR/IDAT/IEND)를 직접 조립하는 스크립트를 짠다 — 픽셀 단위로 RGBA 버퍼를 채우고 zlib으로 압축하면 외부 의존성 없이 유효한 PNG를 만들 수 있다.

**에피소드**: Task 8에서 `public/icons/icon-192.png`·`icon-512.png`가 필요했다. `sharp`/`convert`/`magick`/PIL을 차례로 확인했으나 전부 사용 불가였다. `/private/tmp/.../generate-pwa-icons.mjs`에 최소 PNG 인코더(CRC32 테이블 + IHDR/IDAT/IEND 청크 조립)를 작성해 짙은 회색 배경 + 흰 원 아이콘을 두 크기로 생성했고, `file`·`sips -g pixelWidth`로 유효성과 치수를 확인했다.

**증거**: commit 7745ed4, `public/icons/icon-192.png`(1210 bytes, PNG 192x192 RGBA)·`icon-512.png`(6486 bytes, PNG 512x512 RGBA) — `file`/`sips` 출력으로 검증
