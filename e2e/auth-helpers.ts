import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

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
