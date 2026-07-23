# cheap-gas-finder 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 오피넷 API 호출 위치 | Next.js Route Handler(서버) 프록시 | 오피넷은 HTTP + CORS 미지원. HTTPS 페이지에서 브라우저 직접 호출은 mixed-content·CORS로 차단됨. API 키도 서버 env에만 보관 |
| 좌표 변환(WGS84↔KATEC) | 서버(proj4) | 클라이언트는 WGS84만 주고받음. 지도·카카오링크 모두 WGS84 사용. 변환 라이브러리를 서버에 한정 |
| 반경 확장 + 필터링 | 서버(조회 서비스) | 필터 적용 후 개수를 세야 확장 여부를 판단할 수 있음. 최소 충족 반경 기준(3km에 5곳이면 3km 결과만) |
| 랭킹 범위 | 최소 충족 반경 내 가격 오름차순 | 3km→5km→10km 순 확장, 처음으로 ≥5곳 나오는 반경에서 멈추고 그 안에서 TOP5. 사용자 결정 |
| 지도 렌더링 | 카카오맵 JS SDK, 클라이언트 전용(dynamic import, ssr:false) | SDK가 window 의존. 번들에서 지도 코드 지연 로드 |
| 유종 선택 UI | shadcn ToggleGroup | 2~7개 선택지 규칙(shadcn forms). 미설치 → CLI로 추가 |
| PWA 설치 | manifest + 아이콘 + 최소 서비스워커 | Chrome 설치 가능 조건(standalone manifest + SW fetch 핸들러) 충족 |

## 인프라 리소스

| 리소스 | 유형 | 선언 위치 | 생성 Task |
|---|---|---|---|
| `OPINET_API_KEY` | Env var (서버) | `.env.local` | Task 2 |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | Env var (클라이언트) | `.env.local` | Task 4 |
| Web App Manifest | PWA manifest | `app/manifest.ts` | Task 8 |
| Service Worker | PWA SW | `public/sw.js` + 등록 | Task 8 |
| 앱 아이콘 (192/512) | 정적 자산 | `public/icons/` | Task 8 |

> 값 발급: `OPINET_API_KEY=F260723461`(발급 완료). `NEXT_PUBLIC_KAKAO_MAP_KEY`는 사용자가 developers.kakao.com에서 발급 후 `.env.local`에 넣어야 함 (Task 4 실행 전제).

## 데이터 모델

### Station (types/station.ts)
- id (required, UNI_ID)
- name (required, OS_NM)
- brandCode (required, POLL_DIV_CD)
- brandLabel (required, 코드→표시명 매핑)
- price (required, 원)
- distance (required, m)
- lat, lng (required, WGS84로 변환된 좌표)
- isSelfEstimated (required, OS_NM에 "셀프" 포함 여부)

### FuelType (types/station.ts)
- 'gasoline' | 'diesel' | 'lpg' → 오피넷 prodcd 코드로 매핑 (config/opinet.ts)
- 휘발유=`B027`, 경유=`D047` (실호출 검증됨). LPG prodcd는 Task 2에서 실호출로 확정

### 브랜드 코드 맵 (config/opinet.ts)
- SKE→SK에너지, GSC→GS칼텍스, HDO→HD현대오일뱅크, SOL→S-OIL, 그 외(RTX/NHO/ETC 등)→자가상표/기타
- Task 2에서 실응답으로 실재 코드 집합 재확인

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| shadcn | 3, 5, 7 | ToggleGroup 추가, Checkbox/Switch/Card/Badge/Button 조합, semantic token·variant 규칙 준수 |
| next-best-practices | 2, 3, 4 | Route Handler(Node 런타임), async params/searchParams, 'use client' 경계, dynamic import |
| vercel-react-best-practices | 3, 4 | 지도 SDK 지연 로드(bundle-dynamic-imports), fetch 워터폴 방지 |
| web-design-guidelines | 최종 Checkpoint | 접근성·UX 규칙 검토 |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `package.json` | Modify (proj4, @types/proj4 추가) | 1 |
| `lib/geo.ts` + `.test.ts` | New | 1 |
| `types/station.ts` | New | 2 |
| `config/opinet.ts` | New | 2 |
| `services/stations.ts` + `.test.ts` | New | 2 |
| `app/api/stations/route.ts` + `route.test.ts` | New | 2 |
| `components/ui/toggle-group.tsx` | New (shadcn add) | 3 |
| `hooks/use-geolocation.ts` | New | 3 |
| `hooks/use-stations.ts` | New | 3 |
| `components/gas/fuel-toggle.tsx` | New | 3 |
| `components/gas/station-list.tsx` + `.test.tsx` | New | 3 |
| `components/gas/station-list.tsx` | Modify (selectedId prop) | 4 |
| `app/page.tsx` | Modify | 3, 4, 5, 7 |
| `lib/kakao-loader.ts` | New | 4 |
| `components/gas/map-view.tsx` | New | 4 |
| `components/gas/station-list.tsx` | Modify (길찾기 버튼) | 6 |
| `components/gas/filters.tsx` + `.test.tsx` | New | 5 |
| `lib/directions.ts` + `.test.ts` | New | 6 |
| `components/gas/status-message.tsx` + `.test.tsx` | New | 7 |
| `app/manifest.ts` | New | 8 |
| `public/sw.js`, `public/icons/*` | New | 8 |
| `e2e/cheap-gas-finder.spec.ts` | New | 최종 Checkpoint |

## Tasks

### Task 1: 좌표 변환 유틸 (WGS84 ↔ KATEC) — ✅ 완료

- **담당 판정 기준**: 없음 (지원 Task — S1-4·S6의 좌표 정확도 기반. idea.md의 유일한 미검증 가정)
- **크기**: S
- **의존성**: None
- **참조**:
  - proj4 KATEC(TM128) 정의 문자열: `+proj=tmerc +lat_0=38 +lon_0=128 +ellps=bessel +units=m +x_0=400000 +y_0=600000 +k=0.9999 +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43 +no_defs`
  - 검증 좌표쌍: KATEC(311923, 551192) ≈ 서울 중구권 WGS84 (execute 시 실좌표 대조)
- **구현 대상**:
  - `lib/geo.ts`: `wgs84ToKatec(lng, lat)`, `katecToWgs84(x, y)`
  - `lib/geo.test.ts`
- **검증**: `bun run test -- lib/geo` — 왕복 변환(WGS84→KATEC→WGS84) 오차 < 1m, 알려진 좌표쌍 일치. `bun run typecheck`. 테스트 이름에 근거 없음(지원 Task)이므로 `[geo]` 태그로 식별

---

### Task 2: 오피넷 조회 서비스 + 검색 Route Handler — ✅ 완료

- **담당 판정 기준**: S1-3, S7-1, INV-1
- **크기**: M
- **의존성**: Task 1 (좌표 변환)
- **참조**:
  - 오피넷 `aroundAll.do`: params `code, out=json, x, y(KATEC), radius(m), prodcd, sort=1`. 응답 `RESULT.OIL[]`: `UNI_ID, POLL_DIV_CD, OS_NM, PRICE, DISTANCE, GIS_X_COOR, GIS_Y_COOR`
  - 반경 스텝 3000→5000→10000, 필터 후 ≥5곳이면 중단, 아니면 확장
  - LPG prodcd: 실호출로 확정 (`code=F260723461`로 aroundAll 테스트)
- **구현 대상**:
  - `types/station.ts`, `config/opinet.ts` (prodcd·브랜드·반경 스텝 상수)
  - `services/stations.ts`: `findCheapestStations({lat, lng, fuel, brands, selfOnly})` — 좌표 변환 → 반경 확장 루프 → 브랜드/셀프 필터 → 가격 오름차순(동률 거리순) → 최대 5개, 각 항목 좌표 WGS84 변환
  - `app/api/stations/route.ts`: GET, searchParams 파싱, Node 런타임, 에러 시 5xx JSON
  - `services/stations.test.ts`, `app/api/stations/route.test.ts`
- **검증**: `bun run test -- stations` — global fetch를 샘플 오피넷 JSON으로 mock. 단언: (a)[S1-3] 반환 배열 가격 오름차순·동률 시 거리순, (b)[INV-1] 길이 ≤ 5, (c)[S7-1] 필터 후 <5곳이면 그 개수만 반환, (d) 3km에 5곳이면 fetch가 radius=3000으로 1회만 호출, 부족하면 5000·10000로 확장 호출. `bun run typecheck`

---

### Checkpoint: Tasks 1~2 이후 — ✅ 통과
- [x] 모든 테스트 통과: `bun run test` (14 passed)
- [x] 빌드 성공: `bun run build`
- [x] `GET /api/stations?lat=..&lng=..&fuel=gasoline`가 실제 오피넷 키로 정렬된 TOP5 JSON을 반환 (curl로 일회성 확인, 증거 `artifacts/cheap-gas-finder/evidence/checkpoint-1.json`)

---

### Task 3: 위치 허용 → 결과 리스트 + 로딩 (happy path) — ✅ 완료

- **담당 판정 기준**: S1-1, S1-2, S2
- **크기**: M
- **의존성**: Task 2
- **참조**:
  - shadcn 스킬: ToggleGroup 추가(`bunx --bun shadcn@latest add toggle-group`), Card·Badge·Button 조합, semantic token
  - next-best-practices: 'use client' 경계, geolocation은 클라이언트
- **구현 대상**:
  - `hooks/use-geolocation.ts` (navigator.geolocation), `hooks/use-stations.ts` (fetch `/api/stations`)
  - `components/gas/fuel-toggle.tsx` (ToggleGroup, 기본 휘발유), `components/gas/station-list.tsx` (순위 Badge·이름·브랜드·거리·가격, 거리 포맷 1km 미만 "850m"/이상 "2.9km", 가격 "1,830원")
  - `app/page.tsx` (조합, 로딩 상태 "근처 주유소를 찾는 중...")
  - `components/gas/station-list.test.tsx`
- **검증**: `bun run test -- station-list` (RTL, useStations·geolocation mock) — [S1-1] 로딩 문구 노출, [S1-2] 5개 항목의 순위·가격·거리 포맷 렌더, [S2] 유종 경유 변경 시 재조회(fetch가 fuel=diesel로 호출). `bun run typecheck`

---

### Task 4: 카카오맵 표시 + 리스트-지도 연동 + 자동 줌 — ✅ 완료

> 코드·단위 테스트 완료(commit bae3374, fake `window.kakao`로 마커 개수/bounds.extend/선택 강조 검증). 실 SDK 시각 검증은 사용자가 Kakao Developers 콘솔에서 카카오맵 제품을 활성화한 뒤(2026-07-23) 실 API 키 + Task 2 체크포인트의 실 좌표로 확인 완료 — 증거 `evidence/task-4-map-render.md`. 앱 페이지를 통한 geolocation 경유 end-to-end는 샌드박스 제약으로 최종 Playwright e2e 체크포인트에서 재확인 예정.

- **담당 판정 기준**: S1-4, S5
- **크기**: M
- **의존성**: Task 3, `NEXT_PUBLIC_KAKAO_MAP_KEY` 발급
- **참조**:
  - 카카오맵 JS SDK: `//dapi.kakao.com/v2/maps/sdk.js?appkey=KEY&autoload=false`, `kakao.maps.load()`, `LatLngBounds`로 자동 줌
  - vercel-react-best-practices: bundle-dynamic-imports (지도 컴포넌트 `next/dynamic`, ssr:false)
- **구현 대상**:
  - `lib/kakao-loader.ts` (SDK 스크립트 1회 로드), `components/gas/map-view.tsx` (현재 위치 별도 마커 + 주유소 핀, 선택 시 강조, `setBounds`로 5곳 자동 fit)
  - `components/gas/station-list.tsx` (Modify: `selectedId` prop을 받아 선택된 항목에 강조 스타일 적용 — wireframe `screen-results`의 리스트 강조와 대응)
  - `app/page.tsx` (리스트-지도 selected 상태 공유)
- **검증**: Browser MCP — `bun run dev` 후 앱 이동, 위치 허용, [S1-4] 현재 위치 마커 + 주유소 핀 5개가 모두 보이도록 줌된 상태 캡처, [S5] 리스트 항목 클릭 → 해당 핀 강조 캡처. 증거 `artifacts/cheap-gas-finder/evidence/task-4-*.png`. (실 SDK+키 필요로 단위 테스트 불가한 최저 경계)

---

### Checkpoint: Tasks 3~4 이후 — ✅ 통과 (위치 허용 흐름은 최종 e2e로 이월)
- [x] 모든 테스트 통과: `bun run test` (27 passed)
- [x] 빌드 성공: `bun run build`
- [x] 커버리지 검사: `scripts/spec-coverage.sh cheap-gas-finder --tests` (S1-1~S1-4, S2, S5 인용 확인)
- [x] 지도·마커·자동줌: 실 Kakao SDK + 실 좌표로 직접 확인(`evidence/task-4-map-render.md`). 리스트-지도 selected 상태 공유는 `app/page.test.tsx`([S5])로 확인
- [ ] (이월) 브라우저에서 위치 허용 클릭 → 전체 end-to-end: 샌드박스가 geolocation을 항상 거부해 이 세션에서는 불가 (`learnings.md` 참고). 최종 Playwright e2e 체크포인트(`grantPermissions(['geolocation'])`)에서 재확인 예정

---

### Task 5: 브랜드/셀프 필터 UI (즉시 갱신 + 추정 안내) — ✅ 완료

- **담당 판정 기준**: S3, S4-1, S4-2
- **크기**: M
- **의존성**: Task 3 (필터 로직은 Task 2 서비스에 존재, 여기선 UI 배선)
- **참조**:
  - shadcn 스킬: Checkbox + FieldSet/FieldLegend(브랜드 그룹), Switch(셀프 on/off). raw div + space-y 금지
- **구현 대상**:
  - `components/gas/filters.tsx` (브랜드 다중 체크박스 기본 전체, 셀프 토글 기본 off, 토글 아래 "이름 기준 추정치…" 캡션)
  - `app/page.tsx` (필터 상태 → useStations 재조회 배선)
  - `components/gas/filters.test.tsx`
- **검증**: `bun run test -- filters` (RTL) — [S3] 브랜드 하나만 남기고 해제 시 fetch가 해당 brands로 재호출, [S4-1] 셀프 토글 on 시 selfOnly=true로 재호출, [S4-2] 셀프 토글 아래 추정 안내 문구 상시 노출. `bun run typecheck`

---

### Task 6: 카카오맵 길찾기 연동

- **담당 판정 기준**: S6
- **크기**: S
- **의존성**: Task 3
- **참조**:
  - 카카오맵 길찾기 딥링크: `kakaomap://route?sp={내lat},{내lng}&ep={주유소lat},{주유소lng}&by=car`, 앱 미설치·데스크톱 폴백 `https://m.map.kakao.com/scheme/route?sp=...&ep=...&by=car`
- **구현 대상**:
  - `lib/directions.ts` (`buildKakaoRouteUrl(origin, dest)` — 좌표는 서버가 준 WGS84 사용), `lib/directions.test.ts`
  - `components/gas/station-list.tsx` (길찾기 버튼 → `window.open(url, '_blank')`)
- **검증**: `bun run test -- directions` — [S6] URL 빌더가 sp/ep/by 파라미터를 정확히 생성. Browser MCP로 길찾기 버튼 클릭 시 새 탭이 카카오맵 URL로 열리는지 일회성 확인, 증거 `artifacts/cheap-gas-finder/evidence/task-6.png`

---

### Task 7: 안내/에러 상태 (결과부족 문구 + 위치거부 + API 실패)

- **담당 판정 기준**: S7-2, S8, S9
- **크기**: M
- **의존성**: Task 3
- **구현 대상**:
  - `components/gas/status-message.tsx` (배너/빈상태: 부분 결과 "10km 내 N곳만 찾았어요"·0곳 "…없어요", 위치거부 안내+다시시도, API실패 에러+다시시도)
  - `app/page.tsx` (geolocation 거부·fetch 실패 분기 → status-message 렌더, 다시시도 → 재요청)
  - `components/gas/status-message.test.tsx`
- **검증**: `bun run test -- status-message` (RTL) — [S7-2] N곳/0곳 문구, [S8] 위치 거부 시 안내 문구 + 다시 시도 버튼(리스트·지도 빈 상태), [S9] fetch 실패 시 에러 문구 + 다시 시도 버튼. 다시 시도 클릭 시 재요청 트리거. `bun run typecheck`

---

### Task 8: PWA (manifest + 아이콘 + 서비스워커 → 홈 화면 설치)

- **담당 판정 기준**: S10
- **크기**: M
- **의존성**: None (마지막 배치)
- **참조**:
  - Next 16 `app/manifest.ts` (name, short_name, start_url, `display: "standalone"`, icons 192/512, theme_color)
  - 설치 가능 조건: manifest + fetch 핸들러 있는 SW 등록
- **구현 대상**:
  - `app/manifest.ts`, `public/icons/icon-192.png`·`icon-512.png`, `public/sw.js`(최소 fetch 핸들러), SW 등록(클라이언트)
- **검증**: Browser MCP — `bun run build && bun run start` 후 Chrome에서 manifest 로드·SW 등록 확인, 설치 가능 상태(beforeinstallprompt/Application 패널) 증거 `artifacts/cheap-gas-finder/evidence/task-8.png`. [S10] 아이콘 실행 시 독립 창은 Human review(리뷰어: 사용자, 기준: 주소창 없는 standalone 실행)

---

### Checkpoint: Tasks 5~8 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 커버리지 검사: `scripts/spec-coverage.sh cheap-gas-finder --tests`

---

### 최종 Checkpoint
- [ ] `e2e/cheap-gas-finder.spec.ts` 작성·실행: Playwright `grantPermissions(['geolocation'])` + `setGeolocation`, `/api/stations`는 고정 응답으로 stub. spec.md **End-to-end 검증** 1~8 절차 자동화 (S9·S7은 stub 응답 변형으로 재현)
- [ ] `bun run test:e2e` 통과
- [ ] web-design-guidelines로 `components/gas/*`, `app/page.tsx` 접근성·UX 검토
- [ ] spec.md의 End-to-end 검증 절차를 실행하고, 통과한 판정 기준 체크박스를 spec.md에서 켠다 (실행 증거로만)

## 미결정 항목

- LPG의 오피넷 prodcd 코드: Task 2 실행 시 실호출로 확정 (휘발유 B027·경유 D047은 검증 완료)
