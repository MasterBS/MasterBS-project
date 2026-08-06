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
