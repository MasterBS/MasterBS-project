import { expect, test } from "@playwright/test";
import { loginAs } from "./auth-helpers";

// 실 카카오/네이버/구글 리다이렉트 없이, next-auth 세션 쿠키를 직접 주입/제거해
// 로그인 게이트 분기를 증명한다 (artifacts/map-provider-selection/learnings.md의
// "실 API 키 없이도 provider 분기를 e2e로 증명할 수 있다" 패턴과 동일한 접근).

test("[sso-login S10][S10] 로그인하지 않은 상태로 접속하면 위치 권한 요청보다 먼저 로그인 화면이 뜬다", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByText("로그인해야 이용할 수 있어요")).toBeVisible();
  await expect(page.getByRole("button", { name: "카카오로 로그인" })).toBeVisible();
  await expect(page.getByRole("button", { name: "네이버로 로그인" })).toBeVisible();
  await expect(page.getByRole("button", { name: "구글로 로그인" })).toBeVisible();

  // 위치 권한 요청이나 주유소 리스트가 로그인보다 먼저 뜨지 않는다
  await expect(page.getByText("위치 권한이 필요해요")).not.toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(0);
});

test("[sso-login S3][S3] 로그인 화면에 남아 다른 provider 버튼을 계속 누를 수 있다", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("로그인해야 이용할 수 있어요")).toBeVisible();

  // 인증 실패/취소 후에도(next-auth가 pages.signIn="/"로 돌려보냄) 이 화면 자체가
  // 깨지거나 빈 화면이 되지 않고, 다른 provider 버튼이 여전히 클릭 가능한지 확인한다.
  await page.goto("/?error=OAuthCallback");

  await expect(page.getByText("로그인해야 이용할 수 있어요")).toBeVisible();
  const naverButton = page.getByRole("button", { name: "네이버로 로그인" });
  await expect(naverButton).toBeVisible();
  await expect(naverButton).toBeEnabled();
});

test("[sso-login S10][S10] 세션이 있으면 로그인 화면 없이 검색 화면으로 들어간다", async ({ page, context }) => {
  await loginAs(context, "kakao:e2e-sso-test");

  await page.goto("/");

  await expect(page.getByText("로그인해야 이용할 수 있어요")).not.toBeVisible();
});
