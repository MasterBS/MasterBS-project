"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

// Apple은 이번 plan 범위에서 제외됨(artifacts/sso-login/plan.md 아키텍처 결정 참고).
// spec.md는 4개 provider가 최종 범위이므로, Apple을 다루는 후속 plan 전까지 S10을 체크하지 않는다.
const PROVIDERS: { id: "kakao" | "naver" | "google"; label: string }[] = [
  { id: "kakao", label: "카카오로 로그인" },
  { id: "naver", label: "네이버로 로그인" },
  { id: "google", label: "구글로 로그인" },
];

export function LoginGate() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <p className="text-base font-bold">내 주변 저가 주유소 TOP5</p>
        <p className="mt-1 text-xs text-muted-foreground">로그인해야 이용할 수 있어요</p>
      </div>
      <div className="flex w-full flex-col gap-2">
        {PROVIDERS.map((provider) => (
          <Button
            key={provider.id}
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => signIn(provider.id)}
          >
            {provider.label}
          </Button>
        ))}
      </div>
    </main>
  );
}
