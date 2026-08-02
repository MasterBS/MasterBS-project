# 네이버지도 Provider 선택 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| provider별 지도 컴포넌트 구조 | Kakao/Naver 각각 독립 컴포넌트(`kakao-map-view.tsx`/`naver-map-view.tsx`) + provider로 분기하는 스위처(`map-view.tsx`) | 두 SDK가 서로 다른 API 표면을 가져 한 컴포넌트에서 조건 분기하면 복잡도가 커짐. 기존 `map-view.tsx`의 외부 인터페이스(`currentLocation`, `stations`, `selectedId`)를 스위처가 그대로 유지해 `app/page.tsx` 변경을 최소화 |
| SDK 키 전달 방식 | 스위처(`map-view.tsx`)가 `kakaoAppKey`·`naverClientId` 두 값을 모두 받아 `provider`에 맞는 값만 하위 컴포넌트에 넘김 | 런타임에 어느 provider든 선택될 수 있어 두 키가 동시에 필요함. 기존 `appKey` 단일 prop(카카오 전용)을 그대로 재사용하면 네이버 키를 전달할 자리가 없어 명시적으로 두 prop으로 분리 |
| 선택값 저장 방식 | `localStorage`를 캡슐화한 `hooks/use-map-provider.ts` | 로그인이 없는 앱이라 서버 저장이 불필요. 기존 `use-geolocation.ts`와 동일하게 자체 상태를 갖는 훅 패턴을 재사용 |
| 길찾기 URL 분기 | `lib/directions.ts`에 `buildRouteUrl(provider, origin, dest)` 디스패처를 추가하고 provider별 URL 빌더는 내부 함수로 유지 | `station-list.tsx`는 provider 값만 넘기면 되고, URL 스킴 지식은 lib 계층에 캡슐화됨 |
| 설정 UI 컴포넌트 | shadcn `Sheet` + 기존 `ToggleGroup` 패턴(`fuel-toggle.tsx`와 동일) 재사용 | `Sheet`는 프로젝트에 아직 없어 shadcn CLI로 추가. `ToggleGroup`은 `fuel-toggle.tsx`에서 이미 `role="radio"` 접근성 패턴이 검증됨([learnings.md:27](../cheap-gas-finder/learnings.md)) |
| SDK 로드 실패 처리 | `map-view.tsx` 스위처가 provider별 컴포넌트의 `onError` 콜백을 받아 에러 상태를 관리, 자동 폴백 없음 | spec S5-2 결정사항(다른 provider로 자동 전환 안 함)을 그대로 반영 |

## 인프라 리소스

| 리소스 | 유형 | 선언 위치 | 생성 Task |
|---|---|---|---|
| NCP Maps Client ID | Env var (`NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`) | `.env.example`, `README.md` | Task 1 |

NCP 콘솔에서의 실제 발급·도메인(Web 플랫폼) 등록은 사용자가 직접 진행해야 한다 — 카카오맵에서 겪은 401/`NotAuthorizedError`([learnings.md:47](../cheap-gas-finder/learnings.md), [learnings.md:93](../cheap-gas-finder/learnings.md))와 동일한 종류의 문제가 재현될 수 있다.

## 데이터 모델

### MapProviderPreference (localStorage, 키 `map-provider`)
- value: `"kakao" | "naver"` — 서버에 저장하지 않음, 기기(브라우저)별로 유지

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| shadcn | Task 1(간접: `sheet` 추가 필요성 확인), Task 5 | `Sheet` 컴포넌트 추가(`bunx shadcn add sheet`), `components/ui/*` 직접 수정 금지 가드 준수 |
| web-design-guidelines | Task 5 | 설정 진입점·시트의 접근성(포커스 트랩, `aria-label`, 키보드 네비게이션) 점검 |
| next-best-practices | Task 1, Task 2 | `next/dynamic(ssr:false)`로 지도 컴포넌트를 로드하는 기존 컨벤션 유지 확인 |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `types/naver.ts` | New | Task 1 |
| `lib/naver-loader.ts` | New | Task 1 |
| `lib/naver-loader.test.ts` | New | Task 1 |
| `components/gas/naver-map-view.tsx` | New | Task 1 |
| `components/gas/naver-map-view.test.tsx` | New | Task 1 |
| `.env.example` | Modify | Task 1 |
| `README.md` | Modify | Task 1 |
| `components/gas/kakao-map-view.tsx` | New (기존 `map-view.tsx` 내용을 이전) | Task 2 |
| `components/gas/kakao-map-view.test.tsx` | New (기존 `map-view.test.tsx` 내용을 이전) | Task 2 |
| `components/gas/map-view.tsx` | Modify (Kakao 전용 → provider 스위처) | Task 2, Task 6 |
| `components/gas/map-view.test.tsx` | Modify (스위처 동작 테스트) | Task 2, Task 6 |
| `types/map-provider.ts` | New | Task 3 |
| `config/map-provider.ts` | New | Task 3 |
| `hooks/use-map-provider.ts` | New | Task 3 |
| `hooks/use-map-provider.test.ts` | New | Task 3 |
| `lib/directions.ts` | Modify (`buildRouteUrl` 디스패처 추가) | Task 4 |
| `lib/directions.test.ts` | Modify | Task 4 |
| `components/gas/station-list.tsx` | Modify (provider prop 수신) | Task 4 |
| `components/gas/station-list.test.tsx` | Modify | Task 4 |
| `components/ui/sheet.tsx` | New (`bunx shadcn add sheet`) | Task 5 |
| `components/gas/settings-sheet.tsx` | New | Task 5 |
| `components/gas/settings-sheet.test.tsx` | New | Task 5 |
| `app/page.tsx` | Modify (훅 연결, 설정 진입점 배치, provider·두 키 전달) | Task 5 |
| `app/page.test.tsx` | Modify | Task 5 |
| `e2e/map-provider-selection.spec.ts` | New | Task 5, Task 6, 최종 Checkpoint |
| `artifacts/cheap-gas-finder/spec.md` | Modify (S6 wording만 provider 중립적으로 개정) | Task 7 |
| `e2e/cheap-gas-finder.spec.ts` | Modify (S6 테스트가 provider 전제를 명시하도록 수정) | Task 7 |

## Tasks

### Task 1: 네이버지도 SDK 로더·타입과 NaverMapView를 만든다 — ✅ 완료 (commit 823c94b)

- **담당 판정 기준**: 없음 (기반 인프라 — S1-2·INV-1이 이 위에서 Task 2에 얹힌다)
- **크기**: M (5개 파일 + 문서 2개)
- **의존성**: None
- **참조**:
  - `lib/kakao-loader.ts`, `lib/kakao-loader.test.ts`, `components/gas/map-view.tsx` (동일 패턴 미러링)
  - `types/kakao.ts` (Naver 타입 최소 표면 설계 시 대응 참고)
  - Naver Maps JS API v3 공식 문서(`oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=...`) — 실행 시점에 최신 스펙 확인
  - [learnings.md:93](../cheap-gas-finder/learnings.md) — `<script src>` sub-resource 로드 시 Referer 기반 401 가능성, 도메인 등록 필요성 숙지
- **구현 대상**:
  - `types/naver.ts` — `window.naver` 최소 타입(`Map`, `LatLng`, `LatLngBounds`, `Marker`, `fitBounds`)
  - `lib/naver-loader.ts` — `loadNaverMaps(clientId)`, `kakao-loader.ts`와 동일한 싱글턴 프라미스 구조
  - `lib/naver-loader.test.ts`
  - `components/gas/naver-map-view.tsx` — props: `clientId`(SDK 키), `currentLocation`, `stations`, `selectedId`, `onError`(SDK 로드 실패 시 호출)
  - `components/gas/naver-map-view.test.tsx` — fake `window.naver`로 마커·bounds 렌더링 단위 테스트
  - `.env.example`, `README.md` — `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` 안내 추가
- **검증**:
  - `bun run test -- naver-loader naver-map-view`
  - `bun run typecheck`
  - 실 키 로딩 검증은 사용자가 로컬 `bun run dev`에서 NCP 콘솔 설정 완료 후 확인 (Browser MCP sandbox는 이전 Kakao 검증에서 스크립트 인젝션·도메인 허용 이슈가 재현된 전례가 있어 신뢰 가능한 증거로 쓰지 않는다)

---

### Task 2: MapView가 provider prop에 따라 카카오/네이버 지도를 전환한다 — ✅ 완료 (commit eb89a7f, `types/map-provider.ts`는 Task 3에서 앞당겨 이 Task에서 생성)

- **담당 판정 기준**: S1-2, INV-1
- **크기**: S
- **의존성**: Task 1 (NaverMapView 필요)
- **참조**: 없음
- **구현 대상**:
  - `components/gas/kakao-map-view.tsx` — 기존 `map-view.tsx` 로직을 그대로 이전(prop `appKey` 유지)
  - `components/gas/kakao-map-view.test.tsx` — 기존 `map-view.test.tsx` 이전
  - `components/gas/map-view.tsx` — props: `provider: "kakao" | "naver"`, `kakaoAppKey`, `naverClientId`, `currentLocation`, `stations`, `selectedId`. `provider`에 따라 `KakaoMapView`(with `appKey=kakaoAppKey`) 또는 `NaverMapView`(with `clientId=naverClientId`)를 선택 렌더링하는 얇은 스위처로 재작성
  - `components/gas/map-view.test.tsx` — `provider` prop 변경 시 대응하는 컴포넌트가 렌더되는지, 두 provider 모두 동일한 `currentLocation`/`stations`로 동일 개수의 마커 근거(mock 호출 인자)를 받는지 검증(INV-1)
- **검증**:
  - `bun run test -- map-view kakao-map-view`
  - `bun run typecheck`

---

### Task 3: provider 선택을 기기에 저장하고 최초 방문 시 네이버지도를 기본값으로 적용한다 — ✅ 완료 (commit 562baea, 훅 단위 검증만. S3·S4 spec 체크박스는 Task 5의 페이지 배선 완료 후 켠다)

- **담당 판정 기준**: S3, S4
- **크기**: S
- **의존성**: None
- **참조**: `hooks/use-geolocation.ts` (자체 상태를 갖는 훅 패턴)
- **구현 대상**:
  - `types/map-provider.ts` — Task 2에서 이미 생성됨(`export type MapProvider = "kakao" | "naver"`), 재사용만 함
  - `config/map-provider.ts` — `DEFAULT_MAP_PROVIDER = "naver"`, `MAP_PROVIDER_STORAGE_KEY`, `MAP_PROVIDER_LABELS`
  - `hooks/use-map-provider.ts` — mount 시 `localStorage`에서 읽어 없으면 `DEFAULT_MAP_PROVIDER` 유지, `setProvider` 호출 시 상태 갱신과 `localStorage` 저장을 함께 수행
  - `hooks/use-map-provider.test.ts` — 저장값 없음→기본값 네이버, 저장값 있음→해당 값 적용, 변경 시 저장 확인(jsdom `localStorage`)
- **검증**:
  - `bun run test -- use-map-provider`
  - `bun run typecheck`

---

### Checkpoint: Tasks 1~3 이후 — ✅ 완료
- [x] 모든 테스트 통과: `bun run test`
- [x] 빌드 성공: `bun run build`
- [x] 커버리지 검사 통과: `scripts/spec-coverage.sh map-provider-selection --tests` (당시 S5-1·S5-2만 미인용, Task 6에서 해소 — [learnings.md](learnings.md)의 ID 충돌 항목 참고)
- [x] `MapView`가 `provider`/`kakaoAppKey`/`naverClientId` prop만으로 카카오/네이버 전환되고, `use-map-provider` 훅이 기본값·영속성을 독립적으로 만족함이 컴포넌트·훅 테스트로 확인됨(아직 페이지에는 미배선)

---

### Task 4: 길찾기 링크가 선택된 provider를 따른다 — ✅ 완료 (commit 02ba8d3)

- **담당 판정 기준**: S2
- **크기**: S
- **의존성**: Task 3 (`types/map-provider.ts`의 `MapProvider` 타입 참조)
- **참조**:
  - `lib/directions.ts`의 기존 `buildKakaoRouteUrl` 패턴
  - Naver Map 웹 길찾기 URL 스킴은 실행 시점에 공식 문서로 확인(정확한 쿼리 파라미터는 구현 세부사항이라 여기서 확정하지 않음)
- **구현 대상**:
  - `lib/directions.ts` — `buildNaverRouteUrl(origin, dest)` 추가, `buildRouteUrl(provider: MapProvider, origin, dest)` 디스패처 추가(기존 `buildKakaoRouteUrl`은 유지)
  - `lib/directions.test.ts` — provider별 URL 생성 케이스 추가
  - `components/gas/station-list.tsx` — `provider: MapProvider` prop을 받아 `buildRouteUrl(provider, ...)` 호출
  - `components/gas/station-list.test.tsx` — provider별로 다른 URL이 `window.open`에 전달되는지 검증
- **검증**:
  - `bun run test -- directions station-list`
  - `bun run typecheck`

---

### Task 5: 설정 진입점과 시트 UI를 페이지에 연결한다 — ✅ 완료 (commit 24e819e)

- **담당 판정 기준**: S1-1, S6
- **크기**: M
- **의존성**: Task 2, Task 3, Task 4
- **참조**:
  - shadcn 스킬: `sheet` 컴포넌트 추가 방법, `components/gas/fuel-toggle.tsx`의 `ToggleGroup` 사용 패턴
  - spec S6: 설정 진입점은 위치 권한 상태와 무관하게 항상 보여야 함 — `app/page.tsx`의 geolocation 조건부 블록 바깥(제목 옆)에 배치
- **구현 대상**:
  - `components/ui/sheet.tsx` (`bunx shadcn add sheet`)
  - `components/gas/settings-sheet.tsx` — 진입점 버튼 + `Sheet` 내부에 provider `ToggleGroup`(카카오맵/네이버지도), 현재 선택값 표시
  - `components/gas/settings-sheet.test.tsx`
  - `app/page.tsx` — `useMapProvider()` 연결, 제목 옆에 `SettingsSheet` 배치(geolocation 조건 밖), `MapView`에 `provider`·`kakaoAppKey`·`naverClientId` 전달, `StationList`에 `provider` 전달
  - `app/page.test.tsx` — 설정 시트에서 전환 시 지도 provider가 즉시 바뀌는지(S1-1), 시트가 항상 보이는지(S6) 검증
  - `e2e/map-provider-selection.spec.ts` — Playwright `context.grantPermissions(["geolocation"])` + `setGeolocation`으로 실 브라우저 흐름에서 S1, S6 확인 (Task 6·7에서 케이스 추가)
- **검증**:
  - `bun run test -- settings-sheet page`
  - `bun run typecheck`
  - `bun run test:e2e -- map-provider-selection` (S1, S6)
  - S6(설정 진입점이 항상 보임)은 geolocation과 무관하므로 Browser MCP로도 스크린샷 확인 가능; S1(전환 시 지도 즉시 교체)은 geolocation 성공 상태가 전제라 이 sandbox에서 신뢰 가능하게 재현되지 않는다([learnings.md:61](../cheap-gas-finder/learnings.md)) — Playwright e2e 또는 사용자의 로컬 `bun run dev`로 확인

---

### Task 6: 지도 SDK 로드 실패 시 에러 안내를 표시한다 — ✅ 완료 (commit 84146bc, S5-2는 `app/page.map-error.test.tsx`에서 통합 검증)

- **담당 판정 기준**: S5-1, S5-2
- **크기**: M
- **의존성**: Task 2
- **참조**: `components/gas/status-message.tsx`의 기존 에러 메시지 패턴(S9의 "다시 시도" 버튼 스타일 재사용)
- **구현 대상**:
  - `components/gas/kakao-map-view.tsx`, `components/gas/naver-map-view.tsx` — SDK 로드 프라미스 reject 시 `onError` 콜백 호출
  - `components/gas/map-view.tsx` — `status: "loading" | "ready" | "error"` 관리, 에러 시 "지도를 불러오지 못했어요. 다시 시도해주세요"(제안 기본값) + "다시 시도" 버튼(누르면 로더 재시도), 에러 상태에서도 부모의 리스트 렌더링에는 영향 없음(리스트는 `MapView` 바깥에서 독립적으로 렌더링됨을 확인)
  - `components/gas/map-view.test.tsx` — 로더 reject mock 시 에러 문구·재시도 버튼 노출 검증
- **검증**:
  - `bun run test -- map-view`
  - `bun run typecheck`

---

### Checkpoint: Tasks 4~6 이후 — ✅ 완료
- [x] 모든 테스트 통과: `bun run test`
- [x] 빌드 성공: `bun run build`
- [x] 커버리지 검사 통과: `scripts/spec-coverage.sh map-provider-selection --tests`
- [x] 설정 시트에서 provider를 바꾸면 새로고침 없이 지도·길찾기가 함께 전환되고, 새로고침 후에도 유지되며, SDK 실패 시 에러 안내가 뜨는 전체 흐름이 `bun run dev`로 동작 (Browser MCP로 실 브라우저 확인: 설정 아이콘 → 시트 열림 → 카카오맵 선택 → 시트 자동 닫힘 → 새로고침 후에도 카카오맵 유지)

---

### Task 7: 기존 cheap-gas-finder 문서·e2e를 provider 중립적으로 개정한다 — ✅ 완료 (commit 2439231)

- **담당 판정 기준**: 없음 (신규 기준 없음 — `cheap-gas-finder/spec.md`의 기존 S6 서술이 "카카오맵 전용" 전제와 어긋나지 않도록 정합성만 맞춘다. S1-4·S5는 이미 provider 중립적 문구라 수정 대상이 아님)
- **크기**: S
- **의존성**: Task 5 (설정 UI가 있어야 e2e에서 provider를 명시적으로 선택 가능), Task 4
- **참조**: 없음
- **구현 대상**:
  - `artifacts/cheap-gas-finder/spec.md` — S6 문장에서만 "카카오맵"을 "선택된 지도 provider"로 수정(체크박스 상태는 변경하지 않음, 문구만 개정). 개요·범위의 "카카오맵" 서술도 함께 provider 중립적으로 다듬는다
  - `e2e/cheap-gas-finder.spec.ts` — S6 테스트가 `popup.url()`이 `kakao.com`인지 단언하고 있어(174-175행), Task 5의 기본값 전환(네이버) 이후 그대로면 깨짐 — 설정 시트에서 카카오맵을 먼저 선택하는 단계를 추가한 뒤 단언. `test.fixme`로 남아있는 S5 테스트의 카카오 전용 마커 셀렉터(`img[src*="dc2626"]`) 주석도 스위처 구조 변경을 반영해 갱신([learnings.md:113](../cheap-gas-finder/learnings.md)의 정확한 버튼 매칭 이슈 재확인)
- **검증**:
  - `bun run test:e2e -- cheap-gas-finder` (기존 S6 재확인)
  - `scripts/spec-coverage.sh cheap-gas-finder --tests`

---

### 최종 Checkpoint — ✅ 완료
- [x] spec.md의 **End-to-end 검증** 절차를 실행하고, 통과한 판정 기준의 체크박스를 `artifacts/map-provider-selection/spec.md`에서 켠다 (체크는 실행 증거로만 켠다) — 자동화(Vitest 74개 + Playwright e2e 12개, `--tests` 커버리지 통과)와 Browser MCP 실 브라우저 확인(S1/S3/S4/S6)으로 전 항목 증명. S2/S5는 코드 경계(단위·컴포넌트 테스트)에서 증명 — 코드리뷰 과정에서 SettingsSheet가 선택 시 자동으로 닫히지 않던 버그(S1-1)를 발견해 수정(commit 904dc6c)

## 미결정 항목

없음
