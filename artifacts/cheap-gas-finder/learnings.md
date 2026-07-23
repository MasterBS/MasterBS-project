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
