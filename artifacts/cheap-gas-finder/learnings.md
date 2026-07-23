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

## 이 sandbox Browser MCP 창에서는 geolocation이 항상 "denied"다

**지시문**: 이 프로젝트에서 Browser MCP(`mcp__Claude_Browser__*`)로 위치 기반 기능(S1, S2, S8 등)을 시각적으로 검증하려 하지 않는다 — `navigator.permissions.query({name:'geolocation'})`이 항상 `"denied"`를 반환하며, 프롬프트도 뜨지 않고 재시도로 우회할 수도 없다. 위치 기반 happy path의 실제 화면 확인은 사용자에게 로컬 `bun run dev` + 본인 브라우저에서 확인해달라고 요청하거나, Playwright `context.grantPermissions(['geolocation'])`(최종 e2e 체크포인트에서 예정됨)로 대체한다.

**에피소드**: Task 3에서 처음 발견(빈 화면, 콘솔 에러 없음, `/api/stations` 호출도 없음), Task 4에서 `navigator.permissions.query`로 재확인해 "denied"임을 명시적으로 검증했다.

**증거**: 2026-07-23, Task 3·Task 4 세션에서 반복 확인. `navigator.permissions.query({name:'geolocation'}).then(r => r.state)` → `"denied"`
