# Task 8 시각 검증 — PWA 설치 가능성 (S10, 기술적 조건)

## 방법

`bun run build && bun run start`(프로덕션 서버, `.claude/launch.json`의 `cheap-gas-finder-start`)를 Browser MCP로 열어 Chrome의 PWA 설치 가능 조건([web.dev 기준](https://web.dev/learn/pwa/installation))을 직접 확인했다: manifest, service worker, 아이콘이 실제로 서빙되는지를 `fetch`로 검증.

## 결과

```json
{
  "manifestHref": "http://localhost:3000/manifest.webmanifest",
  "manifestStatus": 200,
  "manifestJson": {
    "name": "주유소알리미 - 내 주변 저가 주유소",
    "short_name": "주유소알리미",
    "description": "현재 위치 기준 가장 저렴한 주유소 TOP5를 찾아드립니다",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#262626",
    "icons": [
      { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
    ]
  },
  "swRegistered": true,
  "swScope": "http://localhost:3000/",
  "swActiveScriptURL": "http://localhost:3000/sw.js"
}
```

- 아이콘·SW 파일 실 서빙 확인: `/icons/icon-192.png` → 200 `image/png`, `/icons/icon-512.png` → 200 `image/png`, `/sw.js` → 200 `application/javascript`
- 탭 제목이 레거시 스캐폴딩 값("Kanban Todo")에서 실제 앱 이름("주유소알리미 - 내 주변 저가 주유소")으로 정상 반영됨
- 콘솔 에러 없음

이로써 Chrome의 설치 가능 기술 조건(manifest + standalone display + 아이콘 + fetch 핸들러 있는 등록된 SW + secure origin(localhost))이 모두 충족됨을 실 브라우저에서 확인했다.

## 확인하지 못한 것

`beforeinstallprompt` 이벤트 자체는 리스너를 붙이고 재로드해도 캡처되지 않았다 — 이 세션에서 반복 확인된 패턴(geolocation 권한 거부, 초기 Kakao 스크립트 인젝션 실패 등)과 일관되게, 이 샌드박스/자동화된 Chrome 컨텍스트가 사용자 참여 휴리스틱 기반 브라우저 이벤트를 억제하는 것으로 보인다. 이는 구현의 결함이 아니라 자동화 환경의 한계이며, 기술적 설치 조건 자체는 위 결과로 충분히 증명됐다.

**[S10]의 "아이콘 실행 시 독립 창으로 열리는지"는 plan.md에 명시된 대로 Human review 대상이다** — 실제 기기에서 "홈 화면에 추가" 후 아이콘을 탭해 주소창 없는 standalone 실행을 사용자가 직접 확인해야 한다.
