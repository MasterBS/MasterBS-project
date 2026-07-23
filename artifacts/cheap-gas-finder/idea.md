# 내 주변 저가 주유소 TOP5

## Problem Statement
HMW: 운전자가 지도를 뒤지지 않고도, 지금 위치 기준으로 실제로 갈 만한 거리에 있으면서 가장 싼 주유소를 3초 안에 판단하게 할 수 있을까?

## Recommended Direction
오피넷(한국석유공사) Open API의 "반경 내 저가 주유소" 엔드포인트를 씬 클라이언트로 감싸는 PWA. 이 API가 반경(radius)·유종(prodcd) 파라미터로 거리×가격 정렬을 이미 지원하므로, 자체 지오스페이셜 랭킹 로직을 새로 만들 필요가 없다. 브라우저 Geolocation으로 현재 위치(WGS84)를 받아 KATEC 좌표로 변환한 뒤 API를 호출하고, 결과를 카카오맵 위에 핀으로 표시한다.

전기차 충전소는 환경공단 공공 API가 위치·상태만 제공하고 요금 필드가 없어(사업자별 요금 상이, 회원/비회원 차등) 이번 스코프에서는 제외한다. 가격 비교 가능한 데이터 소스가 확보되면 별도 feature로 진행한다.

## Key Assumptions to Validate
- [x] 오피넷 Open API 키 발급 — 완료 (`F260723461`, 정상 동작 확인)
- [x] `aroundAll.do` 반경-저가 조회 — 실제 호출로 검증 완료. 반경(radius)·유종(prodcd)·정렬(sort) 지원, 결과가 가격 오름차순으로 오고 `DISTANCE`(m)가 이미 계산되어 옴 (예: 반경 5km, 휘발유 기준 49건, 최저가 1830원부터 정렬)
- [x] 브랜드 필터 — `POLL_DIV_CD`(SKE/GSC/HDO/SOL/ETC 등)가 `aroundAll.do` 응답에 포함되어 클라이언트 필터링으로 가능. 별도 API 불필요
- [x] 셀프주유소 필터 — **공식 필드 없음** (`aroundAll.do`, `detailById.do` 모두 확인, SEL_YN류 필드 부재). `OS_NM` 문자열에 "셀프" 포함 여부로 추정하는 휴리스틱만 가능 → UI에 "이름 기준 추정치, 정확하지 않을 수 있음" 명시하기로 결정
- [ ] 좌표 변환이 양방향으로 오차 없이 동작하는지 검증 (아직 미검증): WGS84(Geolocation)→KATEC(오피넷 조회용), KATEC(오피넷 응답 GIS_X_COOR/Y_COOR)→WGS84(카카오맵 길찾기 링크용)

## MVP Scope
- PWA (Next.js, manifest 추가로 홈 화면 설치 지원)
- 브라우저 Geolocation → WGS84→KATEC 변환 → `aroundAll.do` 호출 (code=`F260723461`)
- 유종 선택: 휘발유/경유/LPG 중 택1 (`prodcd`)
- 브랜드 필터: `POLL_DIV_CD` 기준 클라이언트 필터링
- 셀프주유소 필터: `OS_NM`에 "셀프" 포함 여부로 추정 — UI에 "이름 기준 추정치" 캡션 표시
- 반경 확장 로직: 3km→5km→10km 순으로 확장하며 (필터 적용 후) TOP5 채움
- 결과 리스트(주유소명, 브랜드, 가격, 거리) + 카카오맵 핀 표시
- 리스트에서 주유소 선택 → "길찾기" 버튼 → 카카오맵으로 연동 (`kakaomap://route?sp=...&ep=...&by=car` 딥링크, 앱 미설치·데스크톱 시 `m.map.kakao.com/scheme/route` 웹 폴백). 경로 계산·안내는 카카오맵에 위임, 앱 내부에서 직접 하지 않음

## Not Doing (and Why)
- 전기차 충전소 가격 비교: 공공 API에 가격 데이터 없음 — 데이터 소스 확보되면 별도 feature
- 네이티브 모바일 앱: PWA로 홈 화면 설치 경험 충분, 스토어 배포 불필요
- 실시간 가격 업데이트/알림: 오피넷은 배치 주기(일 단위) 갱신 — 그 시점 데이터를 그대로 신뢰
- 자체 턴바이턴 내비게이션 구현: 길찾기는 카카오맵 딥링크로 위임하고, 앱 안에서 경로 안내 UI를 직접 만들지 않음
- 로그인/회원가입: 위치 기반 조회에 계정 불필요

## Open Questions
- 카카오맵 JavaScript API 키 발급 (developers.kakao.com, 사용자가 직접 진행 필요)
- WGS84↔KATEC 양방향 변환 라이브러리/공식 선정 및 검증
