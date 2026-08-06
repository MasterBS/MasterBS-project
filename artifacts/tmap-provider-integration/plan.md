# 티맵(Tmap) Provider 연동 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 티맵 지도 컴포넌트 구조 | 기존 Kakao/Naver와 동일하게 독립 컴포넌트(`tmap-map-view.tsx`) + `map-view.tsx` 스위처에 3번째 분기 추가 | 두 provider가 이미 이 패턴(독립 컴포넌트 + 얇은 스위처)이라 구조 일관성을 유지하고, SDK별 API 표면 차이를 컴포넌트 경계로 격리한다 |
| 길찾기 딥링크 폴백 | 카카오와 동일하게 `window.open("tmap://...")`만 수행, 웹 폴백 없음 | spec 결정사항(제외 항목) — 티맵은 네이버처럼 대응되는 공식 웹 길찾기 URL이 없어, `learnings.md`(map-provider-selection)에 기록된 네이버 폴백 구현과 같은 타임아웃·리다이렉트 로직이 불필요하다 |
| SDK 키 전달 방식 | `map-view.tsx`가 `tmapAppKey`를 세 번째 키 prop으로 추가 수신, 하위 `TmapMapView`에 전달 | 기존 `kakaoAppKey`/`naverClientId` 패턴과 동일하게 유지해 스위처 인터페이스 일관성을 확보 |
| provider 선택지 순서 | 설정 시트에 기존 "카카오맵", "네이버지도" 뒤에 "티맵"을 append | 기존 두 옵션의 순서·라벨을 바꾸지 않아 기존 사용자 경험(선택 인덱스 등)에 영향 없음 |
| SDK 로드 실패 처리 | 신규 로직 없음 — 기존 `map-view.tsx`의 provider-무관 에러 상태(`hasError`/`handleRetry`)를 그대로 재사용, `TmapMapView`는 Kakao/Naver와 동일하게 로드 실패 시 `onError` 콜백만 호출 | S4(SDK 로드 실패)를 위한 에러 UI·재시도 메커니즘은 `map-provider-selection` Task 6에서 이미 provider 중립적으로 구현되어 있어 재사용만 하면 된다 |
| 테스트 판정 기준 태그 | 이 feature의 모든 신규/수정 테스트는 `[tmap-provider-integration S1-1]`처럼 **feature-prefix가 붙은 ID**로 인용한다 (bare `[S1-1]` 금지) | spec.md의 10개 ID(S1-1~INV-2)가 전부 `cheap-gas-finder`·`map-provider-selection` 기존 테스트에 bare 태그로 이미 존재해, `scripts/spec-coverage.sh --tests`가 미구현 상태에서도 "커버됨"으로 오판할 위험이 실측 확인됨(plan-reviewer 검토). `app/page.test.tsx`의 `[map-provider-selection S1-1]` 선례를 따른다 |

## 인프라 리소스

| 리소스 | 유형 | 선언 위치 | 생성 Task |
|---|---|---|---|
| TMAP API appKey | Env var (`NEXT_PUBLIC_TMAP_APP_KEY`) | `.env.example`, `README.md` | Task 1 |

SK Open API 콘솔(openapi.sk.com)에서의 실제 발급은 사용자가 직접 진행해야 한다 — 카카오/네이버에서 겪은 401/도메인 미등록류 문제([learnings.md:47](../cheap-gas-finder/learnings.md), [learnings.md:129](../cheap-gas-finder/learnings.md))가 재현될 수 있다.

## 데이터 모델

### MapProviderPreference (localStorage, 키 `map-provider`) — 기존 엔티티 확장
- value: `"kakao" | "naver" | "tmap"` (기존 `"kakao" | "naver"`에 `"tmap"` 추가) — 서버 저장 없음, 기기(브라우저)별 유지

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| next-best-practices | Task 1 | 지도 컴포넌트를 `next/dynamic(ssr:false)`로 로드하는 기존 컨벤션이 3번째 provider 추가로 깨지지 않는지 확인 |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `types/tmap.ts` | New | Task 1 |
| `lib/tmap-loader.ts` | New | Task 1 |
| `lib/tmap-loader.test.ts` | New | Task 1 |
| `components/gas/tmap-map-view.tsx` | New | Task 1 |
| `components/gas/tmap-map-view.test.tsx` | New | Task 1 |
| `.env.example` | Modify | Task 1 |
| `README.md` | Modify | Task 1 |
| `types/map-provider.ts` | Modify (유니온에 `"tmap"` 추가) | Task 2 |
| `components/gas/map-view.tsx` | Modify (3-way 분기 + `tmapAppKey` prop) | Task 2 |
| `components/gas/map-view.test.tsx` | Modify | Task 2 |
| `config/map-provider.ts` | Modify (`MAP_PROVIDER_LABELS`에 "티맵" 추가) | Task 3 |
| `hooks/use-map-provider.ts` | Modify (`isMapProvider` 가드에 `"tmap"` 추가) | Task 3 |
| `hooks/use-map-provider.test.ts` | Modify | Task 3 |
| `components/gas/settings-sheet.tsx` | Modify (`PROVIDER_OPTIONS`에 `"tmap"` 추가) | Task 4 |
| `components/gas/settings-sheet.test.tsx` | Modify | Task 4 |
| `lib/directions.ts` | Modify (`buildTmapRouteUrl` 추가, `buildRouteUrl`/`openRoute` 3-way 디스패치) | Task 5 |
| `lib/directions.test.ts` | Modify | Task 5 |
| `app/page.tsx` | Modify (`TMAP_APP_KEY` env 읽기, `MapView`에 `tmapAppKey` 전달) | Task 6 |
| `e2e/map-provider-selection.spec.ts` | Modify (`stubMapSdks`에 티맵 SDK 스텁 추가, 티맵 전환/지속성 케이스 추가) | Task 6, 최종 Checkpoint |

`components/gas/station-list.tsx`는 이미 `provider: MapProvider`를 그대로 `openRoute`에 전달하는 provider-무관 구조라 변경 불필요 (확인됨).

## Tasks

### Task 1: 티맵 SDK 로더·타입과 TmapMapView를 만든다 — ✅ 완료 (commit f1efbcd, 스크립트 URL·`window.Tmapv2` 네임스페이스는 plan.md 추정과 달라 재확인 후 반영 — [learnings.md](learnings.md))

- **담당 판정 기준**: 없음 (기반 인프라 — S1-2·S1-3·S4-1·S4-2·INV-1이 Task 2에서 이 위에 얹힌다)
- **크기**: M (5개 파일 + 문서 2개)
- **의존성**: None
- **참조**:
  - `lib/naver-loader.ts`, `types/naver.ts`, `components/gas/naver-map-view.tsx` (가장 최근에 추가된 provider — 동일 패턴 미러링 대상)
  - 스크립트 로드 URL: `https://apis.skplanetx.com/tmap/js?version=1&format=javascript&appKey=<APP_KEY>` (웹 검색으로 확인, 1차 공식 문서 `tmapapi.sktelecom.com`은 이 환경의 WebFetch에서 403으로 직접 확인 불가) — 실행 시점에 `skopenapi.readme.io`, `community.openapi.sk.com` 또는 SK Open API 콘솔의 최신 가이드로 정확한 쿼리 파라미터명·`Map`/`LatLng`/`Marker`/`Bounds` 클래스 시그니처를 재확인한 뒤 구현한다 — [learnings.md:17](../map-provider-selection/learnings.md)(Naver `ncpKeyId` 오표기 사례)와 같은 함정을 피하기 위함
  - [learnings.md:47](../cheap-gas-finder/learnings.md), [learnings.md:129](../cheap-gas-finder/learnings.md) — SDK `<script>` sub-resource 로드 시 도메인 미등록으로 인한 401/차단 가능성 숙지
- **구현 대상**:
  - `types/tmap.ts` — `window.Tmap` 최소 타입(`Map`, `LatLng`, `Marker`, bounds/줌 관련 메서드) — 정확한 멤버는 위 참조 문서 확인 후 확정
  - `lib/tmap-loader.ts` — `loadTmapMaps(appKey)`, `kakao-loader.ts`/`naver-loader.ts`와 동일한 싱글턴 프라미스 구조
  - `lib/tmap-loader.test.ts`
  - `components/gas/tmap-map-view.tsx` — props: `appKey`, `currentLocation`, `stations`, `selectedId`, `onError`(SDK 로드 실패 시 호출). 현재 위치 마커·주유소 핀·자동 줌·선택 강조를 Kakao/Naver와 동등하게 구현
  - `components/gas/tmap-map-view.test.tsx` — fake `window.Tmap`으로 마커·bounds 렌더링 단위 테스트
  - `.env.example`, `README.md` — `NEXT_PUBLIC_TMAP_APP_KEY` 안내 추가 (기존 카카오/네이버 항목과 동일한 형식)
- **검증**:
  - `bun run test -- tmap-loader tmap-map-view`
  - `bun run typecheck`

---

### Task 2: MapView가 3-way 분기하도록 확장해 티맵 지도를 렌더링·에러 처리한다 — ✅ 완료 (commit 8b01cb1, 전역 `bun run typecheck`/`build`는 Task 6 페이지 배선 전까지 구조적으로 빨간불 — [learnings.md](learnings.md))

- **담당 판정 기준**: S1-2, S1-3, S4-1, S4-2, INV-1
- **크기**: M (3개 파일)
- **의존성**: Task 1 (`TmapMapView` 필요)
- **참조**: 없음
- **구현 대상**:
  - `types/map-provider.ts` — `export type MapProvider = "kakao" | "naver" | "tmap"`
  - `components/gas/map-view.tsx` — props에 `tmapAppKey` 추가, `provider === "tmap"`이면 `TmapMapView`(with `appKey=tmapAppKey`) 렌더링하도록 분기 확장. 기존 `hasError`/`handleRetry`/`isFirstProviderRender` 로직은 provider 무관이므로 수정 없이 재사용
  - `components/gas/map-view.test.tsx` — `provider="tmap"`일 때 `TmapMapView`가 렌더되는지, 마커/bounds 근거가 Kakao/Naver와 동일하게 전달되는지(`[tmap-provider-integration S1-2]`, `[tmap-provider-integration S1-3]`, `[tmap-provider-integration INV-1]`), SDK 로드 실패 mock 시 기존과 동일한 에러 문구·재시도 버튼이 뜨는지(`[tmap-provider-integration S4-1]`, `[tmap-provider-integration S4-2]`) 검증 — bare `[S1-2]` 등은 쓰지 않는다(아키텍처 결정 표의 "테스트 판정 기준 태그" 참고)
- **검증**:
  - `bun run test -- map-view`
  - `bun run typecheck`

---

### Checkpoint: Tasks 1~2 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 커버리지 검사 통과: `scripts/spec-coverage.sh tmap-provider-integration --tests` (S1-2, S1-3, S4-1, S4-2, INV-1만 인용 여부 확인 — feature-prefix 태그(`[tmap-provider-integration S1-2]` 등)로 작성했는지 직접 열어 확인. 그래도 의심스러우면 [learnings.md:7](../map-provider-selection/learnings.md) 절차대로 `grep -rl "\[$id\]" --include='*.test.*'`로 매치 파일을 나열해 이 feature 소속인지 확인)
- [ ] `MapView`가 `provider="tmap"` prop만으로 티맵 지도를 렌더링하고, SDK 실패 시 카카오/네이버와 동일한 에러 UI를 보임이 컴포넌트 테스트로 확인됨 (아직 페이지·설정 UI에는 미배선)

---

### Task 3: 설정 라벨(config)과 저장 훅(hooks)에 티맵을 등록해 선택이 저장·지속된다 — ✅ 완료 (commit b00e809, S3 spec 체크박스는 Task 6의 페이지 배선 완료 후 켠다)

- **담당 판정 기준**: S3 (체크박스는 Task 6의 페이지 배선 완료 후 켠다 — 훅 단위 검증만 이 Task에서 수행)
- **크기**: M (3개 파일)
- **의존성**: Task 2 (`MapProvider` 유니온에 `"tmap"`이 이미 추가되어 있어야 함 — 타입 자체는 Task 2에서 생성됨, 이 Task는 재사용만 함)
- **참조**: 없음
- **구현 대상**:
  - `config/map-provider.ts` — `MAP_PROVIDER_LABELS`에 `tmap: "티맵"` 추가
  - `hooks/use-map-provider.ts` — `isMapProvider` type guard에 `value === "tmap"` 추가
  - `hooks/use-map-provider.test.ts` — 저장값 `"tmap"` → 해당 값 적용, `setProvider("tmap")` 호출 시 저장 확인 (`[tmap-provider-integration S3]`)
- **검증**:
  - `bun run test -- use-map-provider`
  - `bun run typecheck`

---

### Task 4: 설정 시트에 티맵을 세 번째 옵션으로 노출한다 — ✅ 완료 (commit 6fb78e2)

- **담당 판정 기준**: S5
- **크기**: S (2개 파일)
- **의존성**: Task 3 (`MAP_PROVIDER_LABELS`에 "티맵" 필요)
- **참조**: 없음
- **구현 대상**:
  - `components/gas/settings-sheet.tsx` — `PROVIDER_OPTIONS`에 `"tmap"` 추가 (기존 배열 뒤에 append)
  - `components/gas/settings-sheet.test.tsx` — "카카오맵", "네이버지도", "티맵" 세 옵션이 모두 렌더되는지, 현재 선택값이 정확히 표시되는지 검증 (`[tmap-provider-integration S5]`)
- **검증**:
  - `bun run test -- settings-sheet`
  - `bun run typecheck`

---

### Checkpoint: Tasks 3~4 이후 — ✅ 완료 (build는 Task 6 이후로 이연 — [learnings.md](learnings.md))
- [x] 모든 테스트 통과: `bun run test` (94/94)
- [ ] 빌드 성공: `bun run build` — Task 6(페이지에 `tmapAppKey` 배선) 전까지 구조적으로 불가능해 최종 체크포인트로 이연 (learnings.md 참고)
- [x] 커버리지 검사 통과: `scripts/spec-coverage.sh tmap-provider-integration --tests` (S3, S5는 `[tmap-provider-integration S3]`/`[tmap-provider-integration S5]`로 인용됨을 `grep -rlE` 직접 확인. INV-2만 미인용으로 남음 — Task 5에서 해소 예정, 계획대로)
- [x] 설정 시트가 세 옵션을 보여주고, `useMapProvider` 훅이 `"tmap"` 저장·복원을 독립적으로 만족함이 컴포넌트·훅 테스트로 확인됨

---

### Task 5: 길찾기가 티맵을 따른다 — ✅ 완료 (commit 53e287b)

- **담당 판정 기준**: S2, INV-2 (INV-2는 지도 렌더링·길찾기 양쪽을 포괄하는 불변 규칙이지만, 렌더링 쪽 절반은 이미 Task 2의 S1-2/INV-1 테스트가 증명한다. 이 Task는 **길찾기 라우팅 쪽 절반만** `[tmap-provider-integration INV-2]`로 인용한다 — "이 태그가 곧 INV-2 전체 증명"이 아님에 주의)
- **크기**: S (2개 파일)
- **의존성**: Task 2 (`MapProvider` 타입만 필요, Task 3·4의 config/hooks/UI 변경과는 무관)
- **참조**:
  - `lib/directions.ts`의 기존 `buildKakaoRouteUrl`/`openRoute`의 카카오 분기(단순 `window.open`, 폴백 없음) — 티맵도 동일한 패턴을 따름
  - 티맵 딥링크 스킴: `tmap://route?goalx=<lng>&goaly=<lat>&goalname=<destName>` (웹 검색으로 확인, 일부 사용자 리포트상 앱 버전에 따라 파라미터 미반영 사례 있음) — 실행 시점에 SK Open API 공식 문서로 최신 파라미터명 재확인 후 확정
- **구현 대상**:
  - `lib/directions.ts` — `buildTmapRouteUrl(origin, dest, destName)` 추가, `buildRouteUrl`/`openRoute`를 3-way 분기로 확장(`provider === "tmap"`이면 카카오와 동일하게 `window.open(url, "_blank")`만 수행, 웹 폴백 없음)
  - `lib/directions.test.ts` — `provider="tmap"`일 때 생성되는 URL과 `openRoute` 호출 시 웹 폴백 타이머가 걸리지 않는지 검증 (`[tmap-provider-integration S2]`, `[tmap-provider-integration INV-2]`)
- **검증**:
  - `bun run test -- directions`
  - `bun run typecheck`

---

### Task 6: 페이지에 티맵 API 키를 배선하고 전체 흐름을 e2e로 증명한다 — ✅ 완료 (commit 49f2482, b86ca5e, 4d8da1a — 스크립트 URL은 Task 1 learnings.md에서 확인한 `apis.openapi.sk.com/tmap/jsv2`로 실제 구현)

- **담당 판정 기준**: S1-1
- **크기**: S (2개 파일)
- **의존성**: Task 2, Task 3, Task 4, Task 5
- **참조**: `e2e/map-provider-selection.spec.ts`의 `stubMapSdks()` 패턴 — 실 키·도메인 등록 없이 SDK 스크립트 URL을 가로채 provider 분기를 증명 ([learnings.md:57](../map-provider-selection/learnings.md))
- **구현 대상**:
  - `app/page.tsx` — `TMAP_APP_KEY = process.env.NEXT_PUBLIC_TMAP_APP_KEY ?? ""` 추가, `MapView`에 `tmapAppKey={TMAP_APP_KEY}` 전달
  - `e2e/map-provider-selection.spec.ts` — 이 파일은 `map-provider-selection` feature 소속이고 이미 bare `[S1][S3]` 태그 테스트가 있으므로, 새로 추가하는 티맵 케이스는 반드시 `test("[tmap-provider-integration S1-1] ...")`처럼 feature-prefix를 붙인다. `stubMapSdks()`에 티맵 SDK 스크립트(`apis.skplanetx.com/tmap/js`) 스텁 추가, "설정에서 티맵 선택 시 즉시 지도가 교체된다"(`[tmap-provider-integration S1-1]`) 케이스와 "새로고침 후에도 티맵이 유지된다"(S3 통합 확인, Task 3의 `[tmap-provider-integration S3]`와 별개 — 여기선 통합 증거일 뿐 새 ID 소유 아님) 케이스 추가
- **검증**:
  - `bun run typecheck`
  - `bun run build`
  - `bun run test:e2e -- map-provider-selection` (S1-1, S3 통합 확인)

---

### 최종 Checkpoint — ✅ 완료
- [x] spec.md의 **End-to-end 검증** 절차를 실행하고, 통과한 판정 기준의 체크박스를 `artifacts/tmap-provider-integration/spec.md`에서 켠다 (체크는 실행 증거로만 켠다) — 10개 ID 전부 체크: S1-1·S3(Playwright e2e, 실 Chromium), S1-2·S1-3·S4-1·S4-2·INV-1(컴포넌트 테스트), S2·INV-2(단위 테스트), S5(컴포넌트 테스트). 마커·핀·자동 줌의 **시각적** 렌더링과 티맵 앱으로의 실제 딥링크 전환만은 실 appKey/실 티맵 앱 설치가 필요해 이 세션에서 확인하지 못함 (End-to-end 검증 섹션 하단 참고)
- [x] `scripts/spec-coverage.sh tmap-provider-integration --tests`로 모든 ID(S1-1, S1-2, S1-3, S2, S3, S4-1, S4-2, S5, INV-1, INV-2)가 이 feature 소속 테스트에서 실제로 인용되는지 최종 확인 — 스크립트 자체는 `INV-2`를 "테스트 미인용"으로 오탐(우리 태그가 `[tmap-provider-integration INV-2]`라 스크립트의 `\[INV-2\]` 리터럴 괄호 매칭에 안 걸림 — 반대 방향의 안전한 오탐, 거짓 커버리지 아님)했지만, `grep -rlE "\[tmap-provider-integration $id\]" ...`로 10개 ID 전부 이 feature 소속 파일에서 직접 확인함: S1-1→e2e, S1-2/S1-3/S4-1/S4-2/INV-1→map-view.test.tsx(+e2e), S2/INV-2→directions.test.ts, S3→use-map-provider.test.ts+e2e, S5→settings-sheet.test.tsx
- [x] `bun run test`(98/98), `bun run typecheck`, `bun run build` 모두 성공 (Task 6에서 `app/page.tsx` 배선 완료 후 전역 그린)

## 미결정 항목

없음
