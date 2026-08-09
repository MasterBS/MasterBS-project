import type { DefaultSession } from "next-auth";

// 세션에 userKey(파생값: `${provider}:${providerAccountId}`)를 함께 실어 나른다.
// lib/auth.ts의 jwt/session 콜백이 채운다.
declare module "next-auth" {
  interface Session extends DefaultSession {
    userKey?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userKey?: string;
  }
}
