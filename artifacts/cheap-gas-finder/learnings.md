---
triggers: [opinet, aroundAll.do, LPG, prodcd, K015, K027]
status: verified
scope: this-repo (오피넷 aroundAll.do API)
date: 2026-07-23
---
## 오피넷 LPG prodcd는 K015, K027 아님

**지시문**: 오피넷 aroundAll.do로 LPG(자동차용부탄) 가격을 조회할 때는 `prodcd=K015`를 쓴다. `K027`은 실호출 시 모든 반경에서 빈 배열만 돌아온다.

**에피소드**: plan.md는 LPG prodcd를 Task 2 실행 시 실호출로 확정하기로 미결정 상태였다. 서울 중구권 좌표(KATEC 311923, 551192)로 `K015`는 반경 10km에서 실제 LPG충전소 1곳(가격 1200원대)을 반환했고, `K027`은 반경 10km까지도 빈 배열이었다. 휘발유(B027)·경유(D047)는 기존에 검증된 대로 3km 내에서 바로 응답이 왔다.

**증거**: commit 4aa9d2c, `config/opinet.ts`의 `FUEL_PRODCD_MAP.lpg`

---

## vitest에서 fetch mock에 같은 Response 인스턴스를 재사용하면 "Body is unusable" 에러가 난다

**지시문**: 한 테스트에서 `fetch`가 여러 번 호출될 수 있는 코드(반경 확장 루프 등)를 테스트할 때는 `mockResolvedValue(response)`로 동일 Response 객체를 재사용하지 말고, `mockImplementation(() => new Response(...))`처럼 호출마다 새 Response를 만들어야 한다. Response body는 한 번만 읽을 수 있다.

**에피소드**: `services/stations.test.ts`에서 반경 확장이 여러 번 fetch를 호출하는 시나리오(S7-1: 3번 모두 호출, 필터 후 소수 결과)에서 `mockResolvedValue(jsonResponse(oil))`로 같은 Response를 매 호출에 반환하게 했더니 두 번째 `res.json()` 호출에서 `TypeError: Body is unusable: Body has already been read`가 났다. 서비스 코드 버그가 아니라 테스트 픽스처 문제였다 — `mockImplementation(async () => jsonResponse(oil))`로 바꿔 매번 새 Response를 생성하도록 고쳐서 해결했다.

**증거**: commit 4aa9d2c, `services/stations.test.ts`의 `[S7-1]`·`[stations] filters by brand...`·`[stations] builds request URL...` 테스트

---

## shadcn ToggleGroup(type="single")의 item은 role="radio"다, role="button" 아님

**지시문**: RTL로 shadcn `ToggleGroup`/`ToggleGroupItem`을 테스트할 때는 `screen.getByRole("radio", { name })`를 쓴다. `getByRole("button", ...)`는 실패한다 — 내부 `Toggle` primitive는 button 태그를 쓰지만, radix `ToggleGroup`이 single-select 모드에서 각 item에 `role="radio"`·`aria-checked`를 부여하는 roving-radiogroup 패턴이다.

**에피소드**: `app/page.test.tsx`의 [S2] 테스트에서 `getByRole("button", { name: "경유" })`가 `Unable to find role="button"` 에러로 실패했다. `components/ui/toggle.tsx` 소스만 보고 button 태그를 근거로 role을 추정했는데, 실제 렌더된 DOM은 `role="radio"`였다. role 추정은 소스 대신 렌더된 DOM(`screen.debug()` 또는 실패 메시지의 pretty-print)으로 확인해야 한다.

**증거**: commit 93d5c45, `app/page.test.tsx`의 `[S2] passes the newly selected fuel...` 테스트

---

## shadcn Badge를 순위 원형 배지로 재사용하지 않는다

**지시문**: 순위 숫자(1~5) 같은 커스텀 원형 인디케이터가 필요하면 shadcn `Badge`를 className으로 재단하지 말고 plain `<span>`에 Tailwind 유틸리티를 직접 쓴다. `Badge`는 `h-5 w-fit rounded-4xl px-2 py-0.5` 같은 상태-라벨용 치수를 갖고 있어 원형 배지로 쓰려면 대부분의 치수 클래스를 덮어써야 하는데, 이는 `.claude/rules/shadcn-guard.md`의 "컴포넌트 기본 스타일을 className으로 덮어쓰지 않는다" 규칙과 부딪힌다.

**에피소드**: `components/gas/station-list.tsx`의 순위 배지를 처음엔 `Badge`로 만들려다, variant는 색상만 다루고 크기·모양(원형)은 다루지 않는다는 걸 확인하고 plain `<span className="flex size-6 ... rounded-full bg-primary text-primary-foreground">`로 바꿨다. `bg-primary text-primary-foreground`처럼 semantic token은 그대로 재사용해 shadcn-guard의 우선순위 규칙(variant → semantic token → CSS 변수)은 지켰다.

**증거**: commit 93d5c45, `components/gas/station-list.tsx`
