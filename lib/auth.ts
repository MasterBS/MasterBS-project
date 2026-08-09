import NextAuth, { type NextAuthConfig } from "next-auth";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import Google from "next-auth/providers/google";
import { deriveUserKey } from "@/lib/user-key";

// 로그인용 OAuth 앱(카카오/네이버 지도 SDK 키와는 별개 — README 참고)
export const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  // 커스텀 로그인 게이트가 "/"에 있으므로, 인증 실패/취소도 next-auth 기본 에러
  // 페이지가 아니라 이 화면으로 되돌아오게 한다(S3).
  pages: { signIn: "/" },
  providers: [
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
    }),
    Naver({
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.userKey = deriveUserKey(account.provider, account.providerAccountId ?? "");
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.userKey === "string") {
        session.userKey = token.userKey;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
