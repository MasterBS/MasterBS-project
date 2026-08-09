# SSO 로그인 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 인증 | next-auth(Auth.js) — 카카오·네이버·구글 내장 provider, JWT 세션 전략 | 세 provider 모두 기본 지원(`next-auth/providers/{kakao,naver,google}`). 기본 동작이 이메일 기준 자동 계정 연결을 하지 않아 spec의 "provider별 별개 계정" 요구사항과 정확히 일치(Supabase Auth는 반대가 기본값이고 끌 수 없어 배제). JWT 세션이라 next-auth 자체 세션/계정 테이블이 불필요 |
| 데이터 저장소 | Supabase(Postgres), 순수 DB로만 사용 — Supabase Auth 기능은 쓰지 않음 | 사용자 결정. next-auth가 인증을 전담하므로 Supabase는 `user_settings`·`favorites` 두 테이블만 가진 일반 Postgres로 사용 |
| 계정 식별자 | `${provider}:${providerAccountId}` 문자열을 두 테이블의 `user_key`로 사용 | next-auth 세션에서 provider와 provider별 계정 id를 그대로 조합 — provider별 별개 계정을 자연스럽게 보장, 별도 accounts 테이블 불필요, RLS 대신 서버 코드(Route Handler)에서 세션 기반으로 직접 권한 검사 |
| 로그인 게이트 구현 위치 | `app/page.tsx` 최상단에서 세션 유무로 분기 렌더 | 이 앱은 라우트가 `/` 하나뿐이고 지금도 로딩/에러/결과를 전부 `page.tsx` 안 조건부 렌더로 처리하는 구조 — 미들웨어·라우트 그룹 없이 기존 패턴 유지 |
| 즐겨찾기 목록·프로필 메뉴 화면 | 별도 라우트 없이 `app/page.tsx` 안 클라이언트 상태로 뷰 전환 | 위와 동일한 이유 — 이 앱은 지금까지 라우팅 없이 단일 페이지 안에서 모든 화면 상태를 다뤄왔음 |
| 지도 provider 최초 선택 | `user_settings.map_provider`가 `null`이면 선택 화면, 값이 있으면 스킵 | spec S11/S13의 판정 기준(계정에 "정한 적 있는지")을 `null` 여부로 직접 표현 |
| 지도 provider 재선택 | 기존 `SettingsSheet` 토글 유지, 변경 시 `user_settings.map_provider`도 갱신 | spec 범위(포함)에 "로그인 후 언제든 다시 바꿀 수 있다"고 명시된 기존 기능 유지 |
| 즐겨찾기 데이터 모델 | station UNI_ID + 즐겨찾기 시점의 이름·브랜드·좌표·가격 스냅샷 저장 | `services/stations.ts`의 `id: raw.UNI_ID`가 오피넷의 안정적 고유 식별자임을 확인. 목록 화면마다 오피넷을 재조회하면 위치·거리 재계산이 필요해 복잡도가 커짐 — spec은 즐겨찾기 목록의 가격 최신성을 요구하지 않아 스냅샷으로 충분 |
| Apple 로그인 | 이번 plan 범위에서 제외 | 사용자 결정 — spec.md는 유지(4개 provider가 최종 범위), Apple은 후속 plan에서 별도로 다룸 |
| 테스트 판정 기준 태그 | 이 feature의 모든 신규 테스트는 `[sso-login S10]`처럼 feature-prefix 태그를 쓰고, 의미가 겹치는 bare 태그(`[S10]`)도 나란히 붙인다 | `tmap-provider-integration/learnings.md`(줄 77, 141)에 기록된 실측 함정: 이 저장소는 `cheap-gas-finder`가 이미 S1~S10을, 다른 feature들이 S1~S9를 쓰고 있어 이번 spec의 S3·S5·S6·S7·S9·S10~S14가 전부 다른 feature와 충돌할 수 있다. `scripts/spec-coverage.sh --tests`의 정규식은 `[` 바로 뒤에 ID가 와야 매치하므로, prefix만 쓰면 그 정규식이 못 찾는다 — 반드시 bare 태그를 나란히 쓴다 |

## 인프라 리소스

| 리소스 | 유형 | 선언 위치 | 생성 Task |
|---|---|---|---|
| Supabase 프로젝트(Postgres) | 외부 서비스 | `.env.example`(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) | Task 1 |
| `user_settings`, `favorites` 테이블 | Postgres 테이블(SQL 마이그레이션) | Supabase SQL 마이그레이션 | Task 1 |
| next-auth 시크릿 | Env var(`NEXTAUTH_SECRET`) | `.env.example` | Task 2 |
| 카카오 OAuth 앱 | OAuth provider 등록 | 카카오 디벨로퍼스 콘솔, `.env.example`(`KAKAO_CLIENT_ID`/`KAKAO_CLIENT_SECRET`) | Task 2 |
| 네이버 OAuth 앱 | OAuth provider 등록 | 네이버 디벨로퍼스 콘솔, `.env.example`(`NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`) | Task 2 |
| 구글 OAuth 앱 | OAuth provider 등록 | Google Cloud 콘솔, `.env.example`(`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`) | Task 2 |

세 provider 모두 콜백(Redirect) URL을 각 콘솔에 등록해야 한다(예: `<배포 도메인>/api/auth/callback/kakao`) — 배포 전 사용자가 직접 준비해야 함. 카카오·네이버는 이 저장소에서 이미 지도 SDK 키 발급 경험이 있지만, 이번은 **로그인용** OAuth 앱이라 별개로 새로 만들어야 한다(지도 SDK 키와 혼동하지 않는다).

## 데이터 모델

### UserSettings (Supabase 테이블 `user_settings`)
- `user_key` (PK, text) — `${provider}:${providerAccountId}`
- `fuel_type`
- `brands` (jsonb array)
- `map_provider` (nullable — `null`이면 "이 계정에 아직 지도 provider를 정한 적 없음", S11/S13 분기 기준)
- `updated_at`

### Favorite (Supabase 테이블 `favorites`)
- `id` (PK)
- `user_key` (text, `user_settings.user_key`와 동일한 값 규칙)
- `station_uni_id` (text)
- `name`, `brand_label`, `lat`, `lng`, `price` (즐겨찾기 시점 스냅샷)
- `created_at`
- unique(`user_key`, `station_uni_id`)

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| shadcn | Task 3, 4, 9 | 로그인 화면·지도 provider 선택 화면·프로필 메뉴·즐겨찾기 목록에 필요한 컴포넌트(button, sheet 등) 확인·추가 |
| next-best-practices | 전 Task | App Router 서버/클라이언트 컴포넌트 경계, Route Handler 컨벤션 확인 |
| web-design-guidelines | Task 3, 9 | 로그인 화면·즐겨찾기 목록 접근성 점검 |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `lib/supabase.ts` | New(서버 전용 Supabase 클라이언트, service role key) | Task 1 |
| `types/user-settings.ts`, `types/favorite.ts` | New | Task 1 |
| `services/user-settings.ts` | New(get/upsert) | Task 1 |
| `services/favorites.ts` | New(list/toggle) | Task 1 |
| Supabase SQL 마이그레이션 파일 | New | Task 1 |
| `.env.example`, `README.md` | Modify(Supabase 관련 안내 추가) | Task 1 |
| `lib/auth.ts` | New(next-auth 설정: provider 3개, JWT 콜백에서 `user_key` 파생) | Task 2 |
| `app/api/auth/[...nextauth]/route.ts` | New | Task 2 |
| `.env.example`, `README.md` | Modify(OAuth 관련 안내 추가) | Task 2 |
| `components/auth/login-gate.tsx` | New | Task 3 |
| `app/page.tsx` | Modify(최상단에서 세션 분기) | Task 3, 4 |
| `components/auth/map-provider-picker.tsx` | New | Task 4 |
| `hooks/use-map-provider.ts`, `config/map-provider.ts` | Modify(계정 값과 연동) | Task 4, 7 |
| `components/auth/profile-menu.tsx` | New | Task 5, 9 |
| `hooks/use-fuel-filter.ts` 또는 기존 필터 관련 훅 | Modify(계정 동기화 연동) | Task 6 |
| `components/gas/settings-sheet.tsx` | Modify(지도 provider 변경 시 계정 저장) | Task 7 |
| `components/gas/station-list.tsx` | Modify(하트 아이콘 추가) | Task 8 |
| `components/gas/favorite-button.tsx` | New | Task 8 |
| `components/gas/favorites-list.tsx` | New | Task 9 |
| `e2e/sso-login.spec.ts` | New | Task 3, 4, 5, 최종 Checkpoint |

## Tasks

### Task 1: Supabase 연동 기반(테이블 + 서비스 함수)

- **담당 판정 기준**: 없음(기반 인프라 — S5·S6·S7·S9가 이 위에서 뒤 Task에 얹힌다)
- **크기**: M (6개 파일)
- **의존성**: None
- **참조**:
  - `services/stations.ts`(기존 서비스 레이어 패턴 — 외부 데이터 소스를 감싸는 함수 형태)
  - `.env.example`의 기존 키 안내 형식
- **구현 대상**:
  - `lib/supabase.ts` — `@supabase/supabase-js`로 서버 전용 클라이언트 생성(service role key, 클라이언트 번들에 노출 금지)
  - `types/user-settings.ts`, `types/favorite.ts`
  - Supabase SQL 마이그레이션 — `user_settings`, `favorites` 테이블(위 데이터 모델대로)
  - `services/user-settings.ts` — `getUserSettings(userKey)`, `upsertUserSettings(userKey, partial)`
  - `services/favorites.ts` — `listFavorites(userKey)`, `toggleFavorite(userKey, station)`
  - `.env.example`, `README.md` — Supabase 환경변수 안내
- **검증**:
  - `bun run test -- user-settings favorites`(Supabase 클라이언트를 mock)
  - `bun run typecheck`
  - Human review: Supabase 대시보드에서 두 테이블이 실제로 생성됐는지 확인, 증거는 `artifacts/sso-login/evidence/task-1-tables.png`

---

### Task 2: next-auth 설정(카카오·네이버·구글)

- **담당 판정 기준**: 없음(기반 인프라 — S3·S10~S14가 이 위에서 뒤 Task에 얹힌다)
- **크기**: M (4개 파일)
- **의존성**: None
- **참조**:
  - Auth.js 공식 문서의 Kakao/Naver/Google provider 페이지 — 실행 시점에 최신 설정 필드(clientId/clientSecret/issuer 등)를 재확인한다. 이 저장소는 이번 세션에 티맵 SDK를 문서 없이 추정해서 짰다가 프로덕션에서 세 번 연속 깨진 전례(`tmap-provider-integration/learnings.md`)가 있다 — 반드시 공식 문서를 직접 열어 필드명을 확인한 뒤 구현한다
  - JWT 콜백에서 `token.userKey = \`${account.provider}:${account.providerAccountId}\`` 형태로 파생해 세션에 실어야 뒤 Task들이 이 값을 바로 쓸 수 있다
- **구현 대상**:
  - `lib/auth.ts` — next-auth 설정, provider 3개, `session`/`jwt` 콜백에서 `userKey` 파생
  - `app/api/auth/[...nextauth]/route.ts`
  - `.env.example`, `README.md` — `NEXTAUTH_SECRET` 및 provider별 client id/secret 안내(지도 SDK 키와는 별개의 OAuth 앱임을 명시)
- **검증**:
  - `bun run typecheck`
  - `bun run build`
  - Human review: 각 provider 콘솔에 OAuth 앱을 등록한 뒤 `bun run dev`에서 실제 로그인 1회씩 확인 — 이 sandbox는 카카오·네이버·구글 콘솔에 접근할 수 없어 실제 리다이렉트 검증은 사용자 환경에서 필요(evidence는 `artifacts/sso-login/evidence/task-2-login.png`)

---

### Checkpoint: Tasks 1~2 이후
- [ ] `bun run test`, `bun run typecheck`, `bun run build` 통과
- [ ] Supabase 테이블 생성 확인, next-auth 라우트가 로컬에서 최소 하나의 provider로 실제 로그인·콜백까지 도달함(evidence 확인)
- [ ] 아직 사용자 대면 UI는 없음 — 기반 인프라만 준비된 상태

---

### Task 3: 로그인 게이트

- **담당 판정 기준**: S10, S3
- **크기**: M (3개 파일)
- **의존성**: Task 2
- **참조**: `components/gas/settings-sheet.tsx`의 shadcn 컴포넌트 사용 패턴
- **구현 대상**:
  - `components/auth/login-gate.tsx` — 카카오·네이버·구글 3개 로그인 버튼(Apple 없음), 인증 실패/취소 시에도 이 화면에 남음
  - `app/page.tsx` — 최상단에서 세션 없으면 `LoginGate`만 렌더하고 그 아래(위치 권한, 리스트, 지도 등)는 전혀 렌더하지 않음
  - `e2e/sso-login.spec.ts` — 세션 쿠키를 주입/제거해 로그인 화면 노출(`[sso-login S10][S10]`)과 인증 실패 시 잔류(`[sso-login S3][S3]`)를 Playwright로 확인
- **검증**:
  - `bun run test -- login-gate page`
  - `bun run typecheck`
  - `bun run test:e2e -- sso-login`

---

### Task 4: 로그인 성공 후 지도 provider 분기

- **담당 판정 기준**: S11, S12-1, S12-2, S13
- **크기**: M (3개 파일)
- **의존성**: Task 1, Task 3
- **참조**: `types/map-provider.ts`의 `MapProvider` 타입, `config/map-provider.ts`
- **구현 대상**:
  - `components/auth/map-provider-picker.tsx` — 카카오맵·네이버지도·티맵 선택, 고르면 `upsertUserSettings`로 저장
  - `app/page.tsx` — 로그인 상태에서 `user_settings.map_provider`가 `null`이면 `MapProviderPicker`, 있으면 그 값으로 곧장 검색 화면(`MapView` 등) 렌더
  - `hooks/use-map-provider.ts` — localStorage 대신(또는 병행) 계정의 `map_provider` 값을 소스로 사용하도록 확장
- **검증**:
  - `bun run test -- map-provider-picker page use-map-provider`
  - `bun run typecheck`
  - `bun run test:e2e -- sso-login`(`[sso-login S11][S11]`, `[sso-login S12-1][S12-1]`, `[sso-login S12-2][S12-2]`, `[sso-login S13][S13]`)

---

### Task 5: 로그아웃

- **담당 판정 기준**: S14
- **크기**: S (2개 파일)
- **의존성**: Task 3
- **참조**: 없음
- **구현 대상**:
  - `components/auth/profile-menu.tsx` — 로그아웃 버튼(next-auth `signOut()`)
  - `app/page.tsx` — 로그아웃 후 세션이 사라지면 `LoginGate`로 돌아가고 검색 화면에 접근 불가한지 재확인(Task 3의 분기 로직 재사용, 별도 분기 불필요)
- **검증**:
  - `bun run test -- profile-menu`
  - `bun run test:e2e -- sso-login`(`[sso-login S14][S14]`)

---

### Checkpoint: Tasks 3~5 이후
- [ ] `bun run test`, `bun run typecheck`, `bun run build` 통과
- [ ] `scripts/spec-coverage.sh sso-login --tests`로 S3·S10·S11·S12·S13·S14가 이 feature 소속 테스트에서 실제로 인용되는지 확인(feature-prefix + bare 이중 태그 여부를 직접 열어 확인, 다른 feature와의 우연한 매치 배제)
- [ ] 로그인 → (최초) provider 선택 → 검색 화면 → 로그아웃 → 재로그인 → provider 선택 스킵까지 전체 로그인 흐름이 `bun run dev`로 동작

---

### Task 6: 유종·브랜드 필터 계정 동기화

- **담당 판정 기준**: S5, S6
- **크기**: M (3개 파일)
- **의존성**: Task 1, Task 4
- **참조**: 없음
- **구현 대상**:
  - 기존 유종·브랜드 필터 상태 관리 훅 — 로그인 상태면 변경 시 `upsertUserSettings`도 함께 호출
  - 최초 로그인 시(계정에 값 없음) 이 기기의 현재 필터 값을 그대로 업로드
  - 재로그인 시(다른 기기 포함) 계정에 저장된 값을 적용
- **검증**:
  - `bun run test -- <필터 훅 파일명>`(`[sso-login S5][S5]`, `[sso-login S6][S6]`)
  - `bun run typecheck`

---

### Task 7: 지도 provider 재선택 시 계정에도 저장

- **담당 판정 기준**: 없음(spec 범위/포함에 서술된 기존 기능 유지 — 별도 판정 기준 ID 없음)
- **크기**: S (2개 파일)
- **의존성**: Task 1, Task 4
- **참조**: 없음
- **구현 대상**:
  - `components/gas/settings-sheet.tsx` — provider 변경 시 기존 localStorage 저장에 더해 `upsertUserSettings`도 호출
- **검증**:
  - `bun run test -- settings-sheet`
  - `bun run typecheck`

---

### Task 8: 즐겨찾기 토글

- **담당 판정 기준**: S7-1, S7-2, INV-2
- **크기**: M (3개 파일)
- **의존성**: Task 1, Task 4
- **참조**: `components/gas/station-list.tsx`의 기존 리스트 아이템 구조(wireframe의 하트 아이콘 배치 참고)
- **구현 대상**:
  - `components/gas/favorite-button.tsx` — 하트 아이콘, 클릭 시 `toggleFavorite` 호출, 채워짐/빈 상태 표시
  - `components/gas/station-list.tsx` — 각 항목에 `FavoriteButton` 추가(로그인 상태에서만 렌더 — Task 3의 게이트 구조상 리스트 자체가 로그인 상태에서만 존재하므로 항상 보임)
- **검증**:
  - `bun run test -- favorite-button station-list`(`[sso-login S7-1][S7-1]`, `[sso-login S7-2][S7-2]`, `[sso-login INV-2][INV-2]`)
  - `bun run typecheck`

---

### Task 9: 즐겨찾기 목록 화면 + 프로필 메뉴 진입점

- **담당 판정 기준**: S9-1, S9-2
- **크기**: M (4개 파일)
- **의존성**: Task 5, Task 8
- **참조**: wireframe의 `screen-favorites`/`screen-favorites-empty`/`screen-profile-menu` 레이아웃
- **구현 대상**:
  - `components/gas/favorites-list.tsx` — 즐겨찾은 주유소만 표시, 빈 상태 문구("즐겨찾은 주유소가 없어요")
  - `components/auth/profile-menu.tsx` — 즐겨찾기 목록 진입점 추가(Task 5에서 만든 로그아웃 버튼과 같은 메뉴)
  - `app/page.tsx` — 즐겨찾기 목록 뷰로 전환하는 클라이언트 상태 추가
- **검증**:
  - `bun run test -- favorites-list profile-menu page`(`[sso-login S9-1][S9-1]` 항목 있는 케이스, `[sso-login S9-2][S9-2]` 빈 상태 케이스)
  - `bun run typecheck`

---

### Checkpoint: Tasks 6~9 이후
- [ ] `bun run test`, `bun run typecheck`, `bun run build` 통과
- [ ] `scripts/spec-coverage.sh sso-login --tests`로 전체 ID(S3, S5, S6, S7, S9, S10~S14, INV-2)가 인용되는지 최종 확인
- [ ] 필터 변경 → 로그아웃 → 재로그인 시 필터·즐겨찾기·지도 provider가 모두 유지되는 전체 흐름이 `bun run dev`로 동작

---

### 최종 Checkpoint
- [ ] spec.md의 **End-to-end 검증** 절차를 실행하고, 통과한 판정 기준의 체크박스를 spec.md에서 켠다(체크는 실행 증거로만 켠다)
- [ ] `artifacts/map-provider-choice/spec.md`(비로그인 기준의 최초 진입 provider 선택)가 이번 로그인 게이트 결정과 전제가 상충함을 재확인하고, 폐기 또는 개정 여부를 사용자에게 확인해 문서에 반영

## 미결정 항목

없음 — 논의된 항목은 모두 결정됨
