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
