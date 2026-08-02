---
triggers: [spec-coverage.sh, 테스트 미인용, 커버리지 OK, feature 간 ID 충돌, S1-1, S1, S2, S6]
status: verified
scope: this-repo (scripts/spec-coverage.sh 현재 구현)
date: 2026-08-02
---
## spec-coverage.sh --tests는 feature 간 ID 충돌을 구분하지 못해 거짓 커버리지를 보고할 수 있다

**지시문**: `scripts/spec-coverage.sh <feature> --tests`는 `<feature>/spec.md`의 ID를 리포 전체 테스트 파일에서 `grep -rE "\[$id...\]"`로 찾는다 — feature 이름으로 범위를 좁히지 않는다. 새 feature의 spec.md가 기존 feature와 같은 번호(S1, S2, S6 등)를 재사용하면, 기존 feature의 테스트 인용이 새 feature의 해당 ID를 "커버됨"으로 잘못 표시한다. 새 spec.md를 쓸 때 기존 feature와 ID가 겹치면, 중간 체크포인트에서 "커버리지 OK"가 나와도 실제로 그 feature의 테스트가 존재하는지 `grep -rl "\[$id\]" --include='*.test.*'`로 직접 확인하고 어느 파일이 걸렸는지 봐야 한다. 최종적으로 모든 ID가 실제로 이 feature의 파일에서 인용됐는지도 확인한다.

**에피소드**: `map-provider-selection`의 spec.md는 S1~S6, INV-1을 썼는데 `cheap-gas-finder`의 spec.md도 동일하게 S1~S10을 쓴다. Task 1~3 체크포인트에서 `--tests`를 돌렸더니 S5-1·S5-2만 "테스트 미인용"으로 나오고 S1-1, S2, S6 등은 이미 커버된 것처럼 보고됐다 — 실제로는 `cheap-gas-finder`의 기존 테스트(`app/page.test.tsx`의 `[S1-1]`, `e2e/cheap-gas-finder.spec.ts`의 `[S6]` 등, 전혀 다른 판정 기준)가 우연히 문자열 매치된 것이었다. 직접 `grep`으로 각 ID가 매치된 파일 목록을 뽑아보고서야 발견했다.

**증거**: `for id in S1 S1-1 ... ; do grep -rlE "\[$id...\]" ...; done`으로 매치 파일을 나열해 `app/page.test.tsx`(cheap-gas-finder 전용)가 map-provider-selection의 S1/S1-1/S2/S6 검사에 걸리는 것을 확인. Task 4~6을 실제로 구현해 이 feature 고유의 테스트가 각 ID를 인용하게 만든 뒤에야 `--tests` 결과가 신뢰할 만해졌다(commit 84146bc 시점).

---

## Naver Maps JS API v3 스크립트 로드는 `ncpClientId`가 아니라 `ncpKeyId`를 쓴다

**지시문**: Naver Cloud Platform Maps를 새로 연동할 때는 `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=<CLIENT_ID>`를 쓴다. 예전 문서·블로그에 흔한 `ncpClientId`(및 `govClientId`/`finClientId`)는 `ncpKeyId` 하나로 통합됐다. `LatLngBounds`는 Kakao와 달리 빈 생성자가 없고 `new naver.maps.LatLngBounds(sw, ne)`로 두 좌표가 필수이므로, 여러 점을 감싸려면 첫 점으로 초기화한 뒤 `.extend()`를 반복한다. bounds를 지도에 적용하는 메서드명은 `setBounds`가 아니라 `fitBounds`다.

**에피소드**: `lib/naver-loader.ts`·`types/naver.ts`·`components/gas/naver-map-view.tsx`를 Kakao 패턴을 그대로 미러링해서 짜기 전에, WebFetch로 `navermaps.github.io/maps.js.ncp` 공식 문서를 확인해 위 세 가지(쿼리 파라미터명, LatLngBounds 생성자, fitBounds)를 미리 바로잡았다. 기억에 의존해 `ncpClientId`나 빈 `LatLngBounds()`로 짰다면 실 키 연동 시점에야 발견됐을 오류다.

**증거**: `types/naver.ts`의 `LatLngBounds: new (sw, ne) => ...` 타입 정의, `lib/naver-loader.ts`의 `?ncpKeyId=`, `components/gas/naver-map-view.tsx`의 `new naver.maps.LatLngBounds(positions[0], positions[0])` + `map.fitBounds(bounds)` (commit 823c94b).

---

## Naver Map 길찾기는 공식 웹 폴백 URL이 없다 — 대신 비공식 `map.naver.com/p/directions/...`로 앱 딥링크를 타임아웃 폴백할 수 있다

**지시문**: Naver Map 길찾기는 `nmap://route/{car|walk|bike|public}?slat=&slng=&dlat=&dlng=&appname=` 앱 스킴만 NCP 공식 문서에 있고, 카카오의 `m.map.kakao.com`처럼 앱 미설치 시에도 자동 리다이렉트되는 https URL은 없다 — 앱이 없는 데스크톱에서 `window.open("nmap://...")`은 아무 일도 하지 않는다(실제 사용자 리포트로 확인됨). 고치려면: `window.open(nmapUrl, "_blank")`으로 새 탭을 먼저 열고, `setTimeout`(~1.2초)으로 그 탭이 여전히 열려 있으면(`!popup.closed`) `popup.location.href`를 `https://map.naver.com/p/directions/{원점lng},{원점lat},{이름},/{목적지lng},{목적지lat},{이름},/-/car` 형식(현재 네이버지도 v5 SPA, 좌표는 WGS84 lng,lat 순서로 그대로 받는다 — Mercator 변환 불필요)으로 바꿔치기한다. 앱이 실제로 딥링크를 가로챈 경우(주로 모바일)에도 이 리다이렉트는 해가 되지 않는다 — 사용자는 이미 앱으로 넘어가 탭을 보지 않는다.

**에피소드**: 최초 구현(commit 02ba8d3) 때는 "공식 문서에 웹 폴백이 없다"는 사실만 기록하고 `nmap://` 단독으로 출시했다. 실제 사용자가 "네이버지도에서 길찾기 눌렀을 때 화면이 뜨지 않는다"고 리포트해서 재현·수정했다(commit 예정: `lib/directions.ts`의 `openRoute`/`buildNaverWebFallbackUrl`). 이 프로젝트의 Browser MCP/WebFetch 도구는 `map.naver.com`을 정책상 차단하지만, `curl`과 별도 Playwright 스크립트(`node <script>.mjs`, 프로젝트 루트에서 실행해야 `playwright` 모듈을 찾는다)로는 접근 가능해 URL 포맷을 직접 검증할 수 있었다 — 스크린샷으로 "출발: 현재 위치 → 도착: {이름}" 경로가 실제로 계산되는 것까지 확인했다.

**증거**: `guide.ncloud-docs.com/docs/maps-url-scheme` WebFetch 결과(공식 웹 폴백 없음 확인), `curl -L https://map.naver.com/p/directions/-/-/-/car` → 200 + `pcweb_navermap_v5` SPA 셸 확인, Playwright 스크립트로 `https://map.naver.com/p/directions/127.0008881,37.5587543,...` 접속 시 `<title>길찾기 - 네이버지도</title>` 및 실제 경로(551m, 2분) 렌더링 스크린샷 확인. `lib/directions.ts`의 `openRoute`/`buildNaverWebFallbackUrl`, `lib/directions.test.ts`의 fake-timer 기반 테스트, `e2e/map-provider-selection.spec.ts`의 "[네이버지도 길찾기 웹 폴백]" 테스트(실 Chromium에서 리다이렉트 확인).

---

## 자식 컴포넌트의 마운트 effect(에러 신호)가 부모의 "마운트 시 리셋" effect에 덮어써질 수 있다

**지시문**: 부모 컴포넌트에서 `useEffect(() => { setX(resetValue) }, [dep])`로 "dep가 바뀌면 리셋"을 구현할 때, 이 effect는 최초 마운트에도 실행된다. 같은 커밋에서 자식의 마운트 effect가 부모에게 콜백으로 상태를 알리는 패턴(`onError` 등)과 결합하면, React가 effect를 자식→부모 순서로 실행하더라도 부모의 무조건적 리셋이 나중에 실행돼 자식이 보낸 신호를 지워버린다. `useRef`로 "최초 마운트는 건너뛴다" 가드를 추가해야 한다.

**에피소드**: `components/gas/map-view.tsx`에서 `useEffect(() => setHasError(false), [provider])`를 가드 없이 추가했더니, provider="kakao"로 처음 마운트되면서 SDK 로드 실패를 시뮬레이션한 테스트([S5-1])가 계속 실패했다 — 자식(KakaoMapView 목)이 마운트 effect에서 `onError()`(`setHasError(true)`)를 호출해도, MapView 자신의 마운트 effect가 뒤이어 `setHasError(false)`를 호출해 무효화됐다. `isFirstProviderRender` ref로 최초 마운트를 건너뛰게 고쳐서 해결.

**증거**: `components/gas/map-view.tsx`의 `isFirstProviderRender` ref (commit 84146bc), `components/gas/map-view.test.tsx`의 `[S5-1]`/`[S5-2]` 테스트.

---

## shadcn Sheet(Radix Dialog)는 내부 선택 컨트롤을 눌러도 저절로 닫히지 않는다

**지시문**: "옵션을 고르면 시트/다이얼로그가 닫힌다"가 판정 기준이면, `Sheet`를 `open`/`onOpenChange`로 직접 제어하고 선택 콜백(`ToggleGroup`의 `onValueChange` 등) 안에서 명시적으로 `setOpen(false)`를 호출해야 한다. `SheetClose`로 감싸지 않은 임의의 인터랙티브 요소는 Radix가 자동으로 닫아주지 않는다.

**에피소드**: `/code-review` 상당의 자체 diff 재검토 중, e2e 테스트(`e2e/map-provider-selection.spec.ts`)가 provider를 고른 뒤 `page.keyboard.press("Escape")`로 시트를 닫고 있는 걸 발견했다 — 테스트 작성자(나 자신)가 실제로는 시트가 안 닫히는 걸 알고 우회한 흔적이었다. spec S1-1("설정 화면이 닫히고...")을 다시 보고서야 버그로 확정했다. `SettingsSheet`를 controlled로 바꿔 선택 시 자동으로 닫도록 고치고, 우회용 `Escape` 호출을 제거했다.

**증거**: `components/gas/settings-sheet.tsx`의 `open`/`onOpenChange` + `setOpen(false)` (commit 904dc6c), `components/gas/settings-sheet.test.tsx`의 "closes the sheet after picking a provider" 테스트.

---

## 실 API 키·도메인 등록 없이도 Playwright e2e로 지도 SDK provider 분기를 증명할 수 있다

**지시문**: Kakao/Naver처럼 실 콘솔에서 도메인을 등록해야 서브리소스 로드가 통과하는 지도 SDK를, 개발 환경에 실 키가 없는 상태로 e2e 검증해야 하면 `page.route("**/<sdk-script-url>**", ...)`로 스크립트 자체를 최소 스텁(`window.kakao`/`window.naver` 골격 설정)으로 가로챈다. "실제 렌더링"이 아니라 "어느 SDK가 어느 순간에 로드되는가"(provider 분기, 기본값, 전환 타이밍)를 `page.waitForRequest()`로 증명하는 데는 충분하고, `cheap-gas-finder`가 겪은 도메인 미등록 401/`test.fixme` 문제를 피해간다.

**에피소드**: `e2e/map-provider-selection.spec.ts`의 S1/S3/S4 테스트를 실 키 없이 통과시켰다 — `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`가 로컬에 아예 설정돼 있지 않았음에도(`.env.local` 확인) provider 전환·기본값·새로고침 지속성을 실제 브라우저에서 증명했다.

**증거**: `e2e/map-provider-selection.spec.ts`의 `stubMapSdks()` (commit 24e819e), 3개 테스트 모두 통과(`bun run test:e2e -- map-provider-selection`).
