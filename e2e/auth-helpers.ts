import type { BrowserContext, Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import type { MapProvider } from "../types/map-provider";
import type { UserSettings } from "../types/user-settings";

// next-auth의 JWT 세션 쿠키를 실제 OAuth 리다이렉트 없이 직접 주입한다.
// 쿠키 이름/salt는 @auth/core/lib/utils/cookie.ts(defaultCookies)와
// @auth/core/lib/actions/session.js(salt = options.cookies.sessionToken.name)를
// 직접 읽어 확인했다 - 로컬 http(비보안 컨텍스트)에서는 "authjs.session-token"
// (접두사 없음), salt도 동일한 문자열을 쓴다.
const SESSION_COOKIE_NAME = "authjs.session-token";

// dev 서버(lib/auth.ts)와 반드시 같은 값이어야 decode가 성공한다.
// playwright.config.ts의 webServer가 이 프로세스와 같은 env를 상속하므로,
// 이 상수를 NEXTAUTH_SECRET로 export해 두면(README 참고) 둘 다 같은 값을 본다.
const TEST_SECRET = process.env.NEXTAUTH_SECRET ?? "e2e-test-secret-do-not-use-in-production";

export async function loginAs(context: BrowserContext, userKey: string): Promise<void> {
  const token = await encode({
    token: { userKey },
    secret: TEST_SECRET,
    salt: SESSION_COOKIE_NAME,
  });

  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

// 이 sandbox에는 실 Supabase 프로젝트가 없어 /api/user-settings의 실제 응답을 받을 수 없다
// (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 미설정 -> 500). 로그인 후 화면(검색 화면/즐겨찾기 등)을
// 다루는 e2e는 이 라우트를 스텁해 계정의 map_provider/필터 값을 고정해야 한다.
export async function stubUserSettings(
  page: Page,
  overrides: Partial<Pick<UserSettings, "mapProvider" | "fuelType" | "brands">> = {},
): Promise<void> {
  // GET/PUT을 실제 백엔드처럼 상태 있게 다룬다 - PUT으로 바뀐 값이 이후 GET(예: 새로고침)에도
  // 반영돼야 "새로고침해도 provider/필터가 유지된다" 같은 기존 시나리오를 그대로 증명할 수 있다.
  let body: UserSettings = {
    userKey: "stub",
    fuelType: overrides.fuelType ?? "gasoline",
    brands: overrides.brands ?? ["SKE", "GSC", "HDO", "SOL", "ETC"],
    mapProvider: overrides.mapProvider === undefined ? "naver" : overrides.mapProvider,
    updatedAt: new Date().toISOString(),
  };

  await page.route("**/api/user-settings", async (route) => {
    const request = route.request();
    if (request.method() === "PUT") {
      const patch = JSON.parse(request.postData() ?? "{}") as Partial<UserSettings>;
      body = { ...body, ...patch, updatedAt: new Date().toISOString() };
    }
    await route.fulfill({ json: body });
  });
}
