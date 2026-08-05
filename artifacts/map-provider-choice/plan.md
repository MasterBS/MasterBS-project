# map-provider-choice 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 지도 SDK 컴포넌트 분리 | `components/gas/kakao-map-view.tsx`(기존 `map-view.tsx` 이름 변경) + `components/gas/naver-map-view.tsx`(신규) + `components/gas/map-view.tsx`(provider 분기 얇은 wrapper) | 두 SDK가 서로 다른 전역 네임스페이스(`window.kakao`/`window.naver`)와 초기화 방식을 쓴다. 한 컴포넌트에서 `if (provider === 'kakao')`로 분기하면 두 SDK의 마커·bounds API 호출이 뒤섞여 읽기 어렵다. wrapper는 `app/page.tsx`의 `next/dynamic(ssr:false)` import 경로(`@/components/gas/map-view`)를 그대로 유지한다 |
| 제공자 상태 관리 | `hooks/use-map-provider.ts` (localStorage 동기화, SSR-safe) | 최초 진입 게이팅(S1~S3)과 결과 화면 상단 토글(S4)이 같은 "선택된 제공자" 상태를 공유해야 한다. `useEffect`에서만 `localStorage`를 읽어 hydration mismatch를 피한다 |
| 선택 화면 게이팅 위치 | `app/page.tsx`에서 저장된 제공자가 없으면 위치 권한을 요청하는 하위 트리 자체를 마운트하지 않음 | `hooks/use-geolocation.ts`(L40-42)의 `useEffect`가 마운트 즉시 `navigator.geolocation.getCurrentPosition`을 호출한다. 선택 화면이 위치 권한 프롬프트보다 먼저 뜨려면(S1-1) 그 훅을 쓰는 컴포넌트를 아예 나중에 마운트해야 한다 |
| 제공자 토글 컴포넌트 | 기존 `FuelToggle`과 동일하게 shadcn `ToggleGroup(type="single", variant="outline")` 재사용 | 2지선다 토글이 이미 같은 패턴으로 구현·테스트되어 있다(`components/gas/fuel-toggle.tsx`). `learnings.md`에 기록된 "`ToggleGroupItem`은 `role="radio"`" 함정도 그대로 적용된다 |
| 길찾기 URL 빌더 위치 | `lib/directions.ts`에 `buildNaverRouteUrl` 추가 (기존 `buildKakaoRouteUrl` 옆) | 이미 같은 시그니처(`LatLng, LatLng → string`)의 순수 함수가 있어 파일을 나눌 이유가 없다 |
| 선택 화면 UI | shadcn `Button`(variant="outline", 큰 사이즈) 2개, 카드 형태 아님 | wireframe(`screen-select`)이 단순 2버튼 레이아웃이고 별도 그룹핑이 필요 없음 |

## 인프라 리소스

| 리소스 | 유형 | 선언 위치 | 생성 Task |
|---|---|---|---|
| `NEXT_PUBLIC_NAVER_MAP_KEY` | Env var (클라이언트) | `.env.local` | Task 1 |

> 값 발급: 사용자가 [NCP 콘솔](https://console.ncloud.com)에서 Application 등록 → Maps(Web Dynamic Map) 서비스 신청 → Client ID(`ncpKeyId`) 발급 후 `.env.local`에 넣어야 함 (Task 1 실행 전제, `NEXT_PUBLIC_KAKAO_MAP_KEY`와 동일한 패턴). **NCP 콘솔의 "Maps" 서비스 설정에서 사용할 도메인(예: `http://localhost:3000`, 배포 도메인)을 Web 서비스 URL로 반드시 등록한다** — `cheap-gas-finder/learnings.md`("카카오맵 SDK를 `<script src>` sub-resource로 로드하면 401 — localhost가 허용 Web 플랫폼 도메인이 아니다")와 동일한 클래스의 함정을 미리 피하기 위함

## 데이터 모델

### MapProvider (types/map-provider.ts)
- `'kakao' | 'naver'` 유니온 타입

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| shadcn | 3, 5 | 선택 화면 `Button`, 상단 토글 `ToggleGroup` 재사용, semantic token·variant 규칙 준수 |
| next-best-practices | 1, 2, 3 | 'use client' 경계, `localStorage`는 `useEffect`에서만 접근(SSR 안전), `next/dynamic(ssr:false)` 유지 |
| vercel-react-best-practices | 1, 4 | 네이버 지도 SDK도 카카오와 동일하게 지연 로드(bundle-dynamic-imports) 원칙 유지 |
| web-design-guidelines | 최종 Checkpoint | 신규 화면(제공자 선택, 상단 토글)의 접근성·UX 검토 |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `types/naver.ts` | New | 1 |
| `lib/naver-loader.ts` | New | 1 |
| `components/gas/naver-map-view.tsx` + `.test.tsx` | New | 1 |
| `types/map-provider.ts` | New | 2 |
| `config/map-provider.ts` | New | 2 |
| `hooks/use-map-provider.ts` + `.test.ts` | New | 2 |
| `components/gas/provider-select.tsx` + `.test.tsx` | New | 3 |
| `app/page.tsx` | Modify | 3, 5, 6 |
| `app/page.test.tsx` | Modify | 3, 5 |
| `components/gas/map-view.tsx` → `components/gas/kakao-map-view.tsx` (rename) + `.test.tsx` | Modify(rename) | 4 |
| `components/gas/map-view.tsx` (provider 분기 wrapper로 재작성) + `.test.tsx` | New | 4 |
| `components/gas/provider-toggle.tsx` + `.test.tsx` | New | 5 |
| `lib/directions.ts` | Modify | 6 |
| `lib/directions.test.ts` | Modify | 6 |
| `components/gas/station-list.tsx` | Modify | 6 |
| `components/gas/station-list.test.tsx` | Modify | 6 |

## Tasks

### Task 1: 네이버 지도 렌더링 컴포넌트

- **담당 판정 기준**: S5-1, S5-2, INV-1
- **크기**: M
- **의존성**: None — 가장 위험도 높은 외부 SDK/키 이슈를 먼저 드러내기 위해 최우선 배치
- **참조**:
  - `components/gas/map-view.tsx`, `lib/kakao-loader.ts`, `types/kakao.ts` — 동일 구조로 대응(마커 배열 관리, 현재 위치 마커, `bounds.extend` 누적 후 자동 줌, 선택 항목 강조 이미지 교체)
  - 네이버 지도 API v3: 스크립트 `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_CLIENT_ID` (카카오처럼 별도 `.load()` 콜백 없이 `onload` 시점에 바로 사용 가능), 공식 문서 https://navermaps.github.io/maps.js.ncp/docs/ — `naver.maps.Map`(옵션 `center`, `zoom`), `naver.maps.LatLng`, `naver.maps.LatLngBounds`(`extend`), `map.fitBounds(bounds)`(카카오의 `setBounds`에 대응), `naver.maps.Marker`(옵션 `position`, `map`, `icon`, `zIndex`), 아이콘은 `icon: { url, size: new naver.maps.Size(w,h) }` 형태
  - `cheap-gas-finder/learnings.md`의 카카오 401(도메인 미등록)·`NotAuthorizedError`(서비스 미활성화) 학습 — 같은 실패 패턴이 네이버에서도 재현될 수 있으므로, 실 SDK 검증 전에 NCP 콘솔의 Maps 서비스 활성화 + Web 서비스 URL 등록 여부를 먼저 확인
- **구현 대상**:
  - `types/naver.ts`: `Naver`, `NaverMapsNamespace`, `NaverMap`, `NaverLatLng`, `NaverLatLngBounds`, `NaverMarker` 최소 타입 (types/kakao.ts와 동일 수준)
  - `lib/naver-loader.ts`: `loadNaverMaps(clientId): Promise<Naver>` (스크립트 1회 로드, 카카오 로더와 동일한 caching 패턴)
  - `components/gas/naver-map-view.tsx`: `map-view.tsx`와 동일 props(`appKey`, `currentLocation`, `stations`, `selectedId`) — 현재 위치 마커 + 주유소 핀 + `fitBounds` 자동 줌 + 선택 항목 강조
  - `components/gas/naver-map-view.test.tsx`
- **검증**: `bun run test -- naver-map-view` — fake `window.naver`로 [S5-1] 현재 위치·주유소 마커 개수와 `fitBounds` 호출 인자(모든 좌표 포함) 확인, [S5-2] `selectedId` 변경 시 해당 마커 아이콘·zIndex가 강조로 바뀌는지 확인, [INV-1] 카카오 버전(`map-view.test.tsx`)과 동일한 마커·강조·자동줌 동작을 검증하는 테스트 케이스 구조가 대응되는지 대조. `bun run typecheck`. 실 SDK 시각 검증(NCP 키 발급 후)은 Browser MCP로 1회 확인, 증거 `artifacts/map-provider-choice/evidence/task-1-map-render.md`

---

### Task 2: 제공자 타입·설정·저장 상태 훅

- **담당 판정 기준**: 없음 (지원 Task — S1~S4가 공유하는 저장·상태 로직의 기반). 테스트 이름은 근거 ID가 없으므로 `[provider]` 태그로 식별
- **크기**: S
- **의존성**: None
- **참조**:
  - `lib/geo.ts`/`hooks/use-geolocation.ts` — 이 프로젝트의 훅 반환 형태 관례(`status` 판별 유니온) 참고
- **구현 대상**:
  - `types/map-provider.ts`: `export type MapProvider = 'kakao' | 'naver'`
  - `config/map-provider.ts`: `MAP_PROVIDER_STORAGE_KEY` 상수, `MAP_PROVIDER_LABEL: Record<MapProvider, string>`(`kakao`→"카카오맵", `naver`→"네이버지도")
  - `hooks/use-map-provider.ts`: 마운트 시 `useEffect`로 `localStorage`에서 저장된 값을 읽어 `{status:'unselected'} | {status:'selected', provider}` 상태를 채우고(초기 렌더는 SSR과 동일하게 `unselected`로 시작해 hydration mismatch 방지), `select(provider)` 호출 시 상태 갱신 + `localStorage` 저장
  - `hooks/use-map-provider.test.ts`
- **검증**: `bun run test -- use-map-provider` — `[provider]` 태그. 저장된 값 없이 마운트 → `unselected` 유지, `select('kakao')` 호출 → 상태가 `selected/kakao`로 바뀌고 `localStorage.getItem`이 그 값을 반환, 저장된 값을 미리 넣고 마운트 → 초기 `useEffect` 이후 `selected` 상태로 채워짐. `bun run typecheck`

---

### Checkpoint: Tasks 1~2 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 커버리지 검사: `scripts/spec-coverage.sh map-provider-choice --tests`
- [ ] 네이버 지도 컴포넌트가 fake SDK 기준으로 카카오와 동등하게 동작(INV-1), 제공자 상태 훅이 독립적으로 동작

---

### Task 3: 제공자 선택 화면 + 앱 진입 게이팅

- **담당 판정 기준**: S1-1, S1-2, S2-1, S2-2, S3
- **크기**: M
- **의존성**: Task 2 (`useMapProvider` 훅)
- **참조**:
  - shadcn 스킬: `Button`(variant="outline") 2개, semantic token 준수
  - `app/page.tsx`, `hooks/use-geolocation.ts` — 위치 권한 요청 훅을 쓰는 하위 트리를 조건부로 지연 마운트해야 S1-1(선택 화면이 권한 프롬프트보다 먼저)이 성립
- **구현 대상**:
  - `components/gas/provider-select.tsx`: 제공자 선택 UI만 담당(두 개의 큰 버튼), `onSelect(provider)` prop
  - `components/gas/provider-select.test.tsx`
  - `app/page.tsx` (Modify): `useMapProvider()`가 `unselected`면 `<ProviderSelect onSelect={select} />`만 렌더하고 기존 결과 트리(`useGeolocation` 포함)는 마운트하지 않음. `selected`면 기존 결과 트리를 그대로 렌더
  - `app/page.test.tsx` (Modify)
- **검증**: `bun run test -- provider-select page` (jsdom의 실제 `localStorage` 사용, 테스트 간 `localStorage.clear()`) — [S1-1] 저장된 값 없이 렌더 → 선택 화면만 보이고 `navigator.geolocation.getCurrentPosition`이 호출되지 않음, [S1-2] 유종 토글·필터·리스트·지도 요소가 DOM에 없음, [S2-1] "카카오맵" 버튼 클릭 → 선택 화면이 사라지고 `getCurrentPosition`이 호출됨(로딩 상태 진입), [S2-2] 클릭 후 `localStorage.getItem(MAP_PROVIDER_STORAGE_KEY)`가 `'kakao'`, [S3] `localStorage`에 미리 `'naver'`를 넣고 렌더 → 선택 화면 없이 곧바로 `getCurrentPosition` 호출까지 진행. `bun run typecheck`

---

### Task 4: map-view 디스패처 (카카오/네이버 분기)

- **담당 판정 기준**: 없음 (지원 Task — S4·INV-1·INV-2가 딛고 서는 기반). 테스트 이름은 `[map-view]` 태그로 식별
- **크기**: M
- **의존성**: Task 1 (`NaverMapView`)
- **참조**: 없음 (기존 `map-view.tsx`·`naver-map-view.tsx` 재사용)
- **구현 대상**:
  - `components/gas/map-view.tsx`의 기존 카카오 전용 구현을 `components/gas/kakao-map-view.tsx`로 이름 변경(내용 변경 없음), `map-view.test.tsx` → `kakao-map-view.test.tsx`로 함께 이동
  - `components/gas/map-view.tsx`를 새로 작성: `provider: MapProvider`, `kakaoAppKey`, `naverAppKey` 등을 받아 `provider === 'kakao'`면 `KakaoMapView`, `'naver'`면 `NaverMapView`를 렌더하는 얇은 wrapper (기존 `app/page.tsx`의 `next/dynamic(() => import('@/components/gas/map-view'))` 경로는 그대로 유지)
  - `components/gas/map-view.test.tsx` (신규, wrapper 자체의 분기만 검증)
- **검증**: `bun run test -- map-view kakao-map-view naver-map-view` — `[map-view]` 태그. `provider="kakao"` → `KakaoMapView`가 렌더(카카오 지도 컨테이너 접근성 이름 확인), `provider="naver"` → `NaverMapView`가 렌더. 기존 `kakao-map-view.test.tsx`(이름만 변경) 전부 통과 유지. `bun run typecheck`

---

### Task 5: 결과 화면 상단 지도 제공자 토글

- **담당 판정 기준**: S4-1, S4-2
- **크기**: M
- **의존성**: Task 2 (`useMapProvider`), Task 4 (`map-view.tsx` 디스패처)
- **참조**:
  - `components/gas/fuel-toggle.tsx` — `ToggleGroup(type="single")` 패턴 그대로 재사용, `learnings.md`의 "`ToggleGroupItem`은 `role="radio"`" 테스트 함정 참고
- **구현 대상**:
  - `components/gas/provider-toggle.tsx`: `FuelToggle`과 동일 구조, `value: MapProvider`, `onChange`
  - `components/gas/provider-toggle.test.tsx`
  - `app/page.tsx` (Modify): 결과 화면 상단에 `<ProviderToggle>` 배치, `useMapProvider()`의 `select`를 `onChange`에 연결, `MapView`에 현재 `provider` 전달
  - `app/page.test.tsx` (Modify)
- **검증**: `bun run test -- provider-toggle page` — [S4-1] 결과 화면(provider=kakao)에서 토글의 "네이버지도" 클릭 → `MapView`가 `provider="naver"`로 리렌더(네이버 지도 컨테이너 접근성 이름으로 확인)되고, 리스트 항목 개수·선택된 항목·표시된 좌표 텍스트는 변경 전과 동일, [S4-2] 클릭 후 `localStorage.getItem(MAP_PROVIDER_STORAGE_KEY)`가 `'naver'`로 갱신. `bun run typecheck`

---

### Checkpoint: Tasks 3~5 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 커버리지 검사: `scripts/spec-coverage.sh map-provider-choice --tests`
- [ ] 앱 진입 → 제공자 선택 → 결과 화면 → 상단 토글 전환까지 end-to-end로 동작(S1~S5)

---

### Task 6: 카카오/네이버 길찾기 URL 빌더 + 버튼 배선

- **담당 판정 기준**: S6, INV-2
- **크기**: M
- **의존성**: Task 2 (`MapProvider` 타입, 결과 화면에서 현재 provider를 알아야 함)
- **참조**:
  - `lib/directions.ts`의 기존 `buildKakaoRouteUrl` — 동일 시그니처로 `buildNaverRouteUrl` 추가
  - 네이버 지도 URL Scheme 공식 문서(https://guide.ncloud-docs.com/docs/maps-url-scheme, https://docs.ncloud.com/ko/naveropenapi_v3/maps/url-scheme/url-scheme.html): 길찾기(자동차) 액션 경로 `/route/car`, 파라미터 `slat`/`slng`(출발지), `dlat`/`dlng`(목적지), `dname`(목적지 이름), `appname`(호출 앱 식별자, 필수) — 전체 형태 `nmap://route/car?slat={}&slng={}&dlat={}&dlng={}&dname={}&appname={URL-encoded 식별자}`. **데스크톱 웹에서의 폴백 URL(앱 미설치 시 동작)은 검색으로 확정하지 못했다 — Task 실행 시 공식 문서로 재확인하고, 카카오처럼 앱/웹 겸용 단일 HTTPS URL이 없다면 `nmap://` 스킴을 그대로 쓰고 데스크톱에서는 새 탭이 무동작할 수 있음을 감안해 최소 동작(모바일 앱 딥링크)부터 구현 후 필요시 조정**
- **구현 대상**:
  - `lib/directions.ts` (Modify): `buildNaverRouteUrl(origin, dest, destName?)` 추가
  - `lib/directions.test.ts` (Modify)
  - `components/gas/station-list.tsx` (Modify): `provider: MapProvider` prop 추가, "길찾기" 버튼 클릭 시 provider에 따라 `buildKakaoRouteUrl` 또는 `buildNaverRouteUrl` 선택해 `window.open`
  - `components/gas/station-list.test.tsx` (Modify)
  - `app/page.tsx` (Modify): `StationList`에 현재 `provider` 전달
- **검증**: `bun run test -- directions station-list` — [S6] `buildNaverRouteUrl`이 `slat`/`slng`/`dlat`/`dlng`/`appname` 파라미터를 정확히 생성, `provider="naver"`일 때 길찾기 버튼이 네이버 URL로 `window.open` 호출, [INV-2] `provider="kakao"`일 때는 카카오 URL만 열리고 네이버 URL은 호출되지 않음(그 역도 확인). `bun run typecheck`. Browser MCP로 실제 새 탭 오픈 1회 확인(카카오 기존 패턴과 동일), 증거 `artifacts/map-provider-choice/evidence/task-6.png`

---

### Checkpoint: Task 6 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 커버리지 검사: `scripts/spec-coverage.sh map-provider-choice --tests`

---

### 최종 Checkpoint
- [ ] `e2e/cheap-gas-finder.spec.ts`(또는 신규 `e2e/map-provider-choice.spec.ts`)에 제공자 선택→결과→토글 전환→길찾기 흐름 추가, `bun run test:e2e` 통과 (learnings.md의 geolocation/서비스워커 mocking 함정 재확인)
- [ ] web-design-guidelines로 `components/gas/provider-select.tsx`, `provider-toggle.tsx`, `app/page.tsx` 접근성·UX 검토
- [ ] spec.md의 **End-to-end 검증** 절차 실행, 통과한 판정 기준 체크박스를 spec.md에서 켠다

## 미결정 항목

- 네이버 지도 길찾기의 데스크톱 웹 폴백 URL(앱 미설치 시 동작): Task 6 실행 시 공식 문서·실호출로 확정
