# Task 4 시각 검증 — 카카오맵 렌더링 (S1-4, S5)

## 방법

Browser MCP 샌드박스는 geolocation 권한을 항상 자동 거부하고(`navigator.permissions.query({name:'geolocation'})` → `"denied"`), 실제 앱 페이지에서 위치 허용 흐름을 재현할 수 없다 (`learnings.md` 참고). 대신 `components/gas/map-view.tsx`가 사용하는 것과 **동일한 실제 Kakao Maps JS SDK 호출 시퀀스**(`kakao.maps.Map`, `Marker`, `LatLngBounds.extend`, `MarkerImage`, `setBounds`)를 실 API 키(`NEXT_PUBLIC_KAKAO_MAP_KEY`)로 브라우저에 직접 주입해, Task 2 체크포인트에서 확보한 실제 오피넷 응답 좌표(`evidence/checkpoint-1.json`)를 그대로 사용해 렌더링을 확인했다.

이 방식은 map-view.tsx의 통합 로직 자체(마커 개수, bounds 계산, 선택 시 강조 분기)는 이미 `components/gas/map-view.test.tsx`(fake `window.kakao`)로 단위 테스트했고, 여기서는 그 로직이 **실제 SDK로 실제로 올바르게 렌더링되는지**만 별도로 확인한다.

## 입력 데이터

- 현재 위치(가정): `{ lat: 37.5587543, lng: 127.0008881 }` (서울 중구권, Task 1 검증 좌표)
- 주유소 5곳: `evidence/checkpoint-1.json`의 실제 오피넷 응답 좌표 5개
- 선택된 항목: 첫 번째 주유소(`A0001257`)를 선택 상태로 표시

## 결과 (스크린샷은 이 세션 대화 기록에 첨부됨)

- **[S1-4] 현재 위치 별도 마커**: 파란 원형 마커로 현재 위치가 station 핀과 명확히 구분되어 표시됨
- **[S1-4] 자동 줌**: `bounds.extend()`를 현재 위치 + 주유소 5곳 총 6개 지점에 호출한 뒤 `map.setBounds(bounds)` 호출 — 6개 지점이 모두 뷰포트 안에 들어오도록 자동으로 줌/센터가 조정됨 (서울 중구~성북구 일대가 한 화면에 표시)
- **[S5] 선택 시 강조**: 선택된 주유소(`A0001257`)만 더 크고 색이 다른(빨간색) 마커로 표시되어 나머지 4개 주유소 핀과 시각적으로 구분됨

## 참고

- 실 Kakao SDK가 이전에 `NotAuthorizedError: disabled OPEN_MAP_AND_LOCAL service`를 반환했던 문제는 사용자가 Kakao Developers 콘솔에서 카카오맵 제품을 활성화한 뒤 해결을 확인함(2026-07-23)
- 실제 앱 페이지(`app/page.tsx`, geolocation 경유)를 통한 end-to-end 시각 확인은 이 샌드박스의 geolocation 제약으로 보류 — 최종 체크포인트의 Playwright e2e(`grantPermissions(['geolocation'])`)에서 재확인 예정
