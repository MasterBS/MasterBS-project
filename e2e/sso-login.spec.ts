import { expect, test } from "@playwright/test";
import { loginAs, stubFavorites, stubUserSettings } from "./auth-helpers";

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
  await stubUserSettings(page, { mapProvider: "naver" });

  await page.goto("/");

  await expect(page.getByText("로그인해야 이용할 수 있어요")).not.toBeVisible();
});

test("[sso-login S11][S11] 계정에 지도 provider가 없으면(최초 로그인) 검색 화면 대신 선택 화면이 뜬다", async ({
  page,
  context,
}) => {
  await loginAs(context, "kakao:e2e-sso-test");
  await stubUserSettings(page, { mapProvider: null });

  await page.goto("/");

  await expect(page.getByText("지도 provider를 선택하세요")).toBeVisible();
  await expect(page.getByRole("button", { name: "카카오맵" })).toBeVisible();
  await expect(page.getByRole("button", { name: "네이버지도" })).toBeVisible();
  await expect(page.getByRole("button", { name: "티맵" })).toBeVisible();
});

test("[sso-login S12-1][S12-1][sso-login S12-2][S12-2] provider를 고르면 계정에 저장되고 그 provider로 검색 화면에 들어간다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 37.5587543, longitude: 127.0008881 });
  await loginAs(context, "kakao:e2e-sso-test");
  await stubUserSettings(page, { mapProvider: null });
  await page.route("**/api/stations*", async (route) => {
    await route.fulfill({ json: [] });
  });

  let putBody: unknown = null;
  page.on("request", (request) => {
    if (request.url().includes("/api/user-settings") && request.method() === "PUT") {
      putBody = request.postDataJSON();
    }
  });

  await page.goto("/");
  await expect(page.getByText("지도 provider를 선택하세요")).toBeVisible();

  await page.getByRole("button", { name: "네이버지도" }).click();

  // S12-2: 선택 화면이 사라지고 검색 화면으로 들어간다
  await expect(page.getByText("지도 provider를 선택하세요")).not.toBeVisible();
  await expect(page.getByText("내 주변 저가 주유소 TOP5")).toBeVisible();
  // S12-1: 계정에 저장(PUT) 요청이 실제로 나갔다
  await expect.poll(() => putBody).toEqual({ mapProvider: "naver" });
});

test("[sso-login S13][S13] 계정에 지도 provider가 이미 있으면 선택 화면 없이 곧장 검색 화면으로 들어간다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 37.5587543, longitude: 127.0008881 });
  await loginAs(context, "kakao:e2e-sso-test");
  await stubUserSettings(page, { mapProvider: "naver" });
  await page.route("**/api/stations*", async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.goto("/");

  await expect(page.getByText("지도 provider를 선택하세요")).not.toBeVisible();
  await expect(page.getByText("내 주변 저가 주유소 TOP5")).toBeVisible();
});

// 담당 판정 기준 없음(plan.md Task 8) - "로그인 후 언제든 설정 화면에서 지도 provider를
// 다시 바꿀 수 있고, 이 변경도 계정에 저장된다"는 spec 범위/포함의 기존 기능 유지 조항.
test("설정 화면에서 지도 provider를 다시 고르면 그 변경도 계정(PUT /api/user-settings)에 저장된다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 37.5587543, longitude: 127.0008881 });
  await loginAs(context, "kakao:e2e-sso-test");
  await stubUserSettings(page, { mapProvider: "naver" });
  await page.route("**/api/stations*", async (route) => {
    await route.fulfill({ json: [] });
  });

  let putBody: unknown = null;
  page.on("request", (request) => {
    if (request.url().includes("/api/user-settings") && request.method() === "PUT") {
      putBody = request.postDataJSON();
    }
  });

  await page.goto("/");
  await expect(page.getByText("내 주변 저가 주유소 TOP5")).toBeVisible();

  await page.getByRole("button", { name: "설정" }).click();
  await page.getByRole("radio", { name: "카카오맵" }).click();

  await expect.poll(() => putBody).toEqual({ mapProvider: "kakao" });
});

test("[sso-login S7-1][S7-1][sso-login S7-2][S7-2] 하트를 누르면 즐겨찾기로 채워지고, 다시 누르면 해제된다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 37.5587543, longitude: 127.0008881 });
  await loginAs(context, "kakao:e2e-sso-test");
  await stubUserSettings(page, { mapProvider: "naver" });
  await page.route("**/api/stations*", async (route) => {
    await route.fulfill({
      json: [
        {
          id: "A0001234",
          name: "구인주유소",
          brandCode: "SKE",
          brandLabel: "SK에너지",
          price: 1834,
          distance: 2600,
          lat: 37.5587543,
          lng: 127.0008881,
          isSelfEstimated: false,
        },
      ],
    });
  });
  let favorited = false;
  await page.route("**/api/favorites", async (route) => {
    favorited = !favorited;
    await route.fulfill({ json: { favorited } });
  });

  await page.goto("/");
  const heart = page.getByRole("button", { name: "즐겨찾기", exact: true });
  await expect(heart).toHaveAttribute("aria-pressed", "false");

  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");

  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "false");
});

test("[sso-login S9-1][S9-1] 헤더 하트를 누르면 즐겨찾은 주유소만 모은 목록이 보인다", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 37.5587543, longitude: 127.0008881 });
  await loginAs(context, "kakao:e2e-sso-test");
  await stubUserSettings(page, { mapProvider: "naver" });
  await page.route("**/api/stations*", async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route("**/api/favorites", async (route) => {
    await route.fulfill({
      json: [
        {
          id: "1",
          userKey: "kakao:e2e-sso-test",
          stationUniId: "A0001234",
          name: "구인주유소",
          brandLabel: "SK에너지",
          lat: 37.5587543,
          lng: 127.0008881,
          price: 1834,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "즐겨찾기 목록" }).click();

  await expect(page.getByText("구인주유소")).toBeVisible();
  await expect(page.getByText("SK에너지 · 1,834원")).toBeVisible();
});

test("[sso-login S9-2][S9-2] 즐겨찾은 주유소가 없으면 빈 상태 안내 문구가 보인다", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 37.5587543, longitude: 127.0008881 });
  await loginAs(context, "kakao:e2e-sso-test");
  await stubUserSettings(page, { mapProvider: "naver" });
  await page.route("**/api/stations*", async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route("**/api/favorites", async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "즐겨찾기 목록" }).click();

  await expect(page.getByText("즐겨찾은 주유소가 없어요")).toBeVisible();
});

test("[sso-login S14][S14] 로그아웃하면 로그인 화면으로 돌아가고 검색 화면에 다시 접근할 수 없다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 37.5587543, longitude: 127.0008881 });
  await loginAs(context, "kakao:e2e-sso-test");
  await stubUserSettings(page, { mapProvider: "naver" });
  await page.route("**/api/stations*", async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.goto("/");
  await expect(page.getByText("내 주변 저가 주유소 TOP5")).toBeVisible();

  // 실 next-auth signOut() 흐름을 그대로 태운다(mock 없음) - Supabase를 건드리지 않는
  // 순수 세션 무효화이므로 이 sandbox에서도 end-to-end로 검증 가능하다.
  await page.getByRole("button", { name: "프로필" }).click();
  await page.getByText("로그아웃").click();

  await expect(page.getByText("로그인해야 이용할 수 있어요")).toBeVisible();
  // "내 주변 저가 주유소 TOP5" 문구 자체는 LoginGate에도 동일하게 쓰여서(wireframe 참고)
  // 텍스트로는 화면을 구분할 수 없다 - 검색 화면에만 있는 요소(설정/프로필 아이콘)로 확인한다.
  await expect(page.getByRole("button", { name: "설정" })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "프로필" })).not.toBeVisible();

  // 새로고침해도 검색 화면에 다시 접근할 수 없다(세션이 실제로 지워졌는지 확인)
  await page.reload();
  await expect(page.getByText("로그인해야 이용할 수 있어요")).toBeVisible();
  await expect(page.getByRole("button", { name: "설정" })).not.toBeVisible();
});

// Checkpoint(Tasks 7~10): "필터 변경 → 로그아웃 → 재로그인 시 필터·즐겨찾기·지도 provider가
// 모두 유지되는 전체 흐름"을 하나로 잇는다. stubUserSettings/stubFavorites는 page 레벨
// 클로저에 상태를 들고 있어(실 Supabase 대신), 같은 page 안에서의 로그아웃→재로그인이면
// "계정에 저장된 값"을 그대로 재현한다 - 진짜 재로그인(auth() 세션 재발급)까지 실 next-auth
// signOut()으로 검증하고, 그 이후 상태 조회만 스텁이 대신한다.
test("필터 변경 → 로그아웃 → 재로그인 시 필터·즐겨찾기·지도 provider가 모두 유지된다", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 37.5587543, longitude: 127.0008881 });
  const userKey = "kakao:e2e-persistence-test";
  await loginAs(context, userKey);
  await stubUserSettings(page, { mapProvider: null });
  await stubFavorites(page);
  await page.route("**/api/stations*", async (route) => {
    await route.fulfill({
      json: [
        {
          id: "A0001234",
          name: "구인주유소",
          brandCode: "SKE",
          brandLabel: "SK에너지",
          price: 1834,
          distance: 2600,
          lat: 37.5587543,
          lng: 127.0008881,
          isSelfEstimated: false,
        },
      ],
    });
  });

  // 1) 최초 로그인 - provider 선택
  await page.goto("/");
  await page.getByRole("button", { name: "카카오맵" }).click();
  await expect(page.getByText("내 주변 저가 주유소 TOP5")).toBeVisible();

  // 2) 필터 변경(경유) + 즐겨찾기 추가
  await page.getByRole("radio", { name: "경유" }).click();
  await page.getByRole("button", { name: "즐겨찾기", exact: true }).click();
  await expect(page.getByRole("button", { name: "즐겨찾기", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // 3) 로그아웃(실 next-auth signOut())
  await page.getByRole("button", { name: "프로필" }).click();
  await page.getByText("로그아웃").click();
  await expect(page.getByText("로그인해야 이용할 수 있어요")).toBeVisible();

  // 4) 같은 계정으로 재로그인
  await loginAs(context, userKey);
  await page.goto("/");

  // provider 선택 화면 없이 곧장 검색 화면(S13), 지도는 카카오맵으로
  await expect(page.getByText("지도 provider를 선택하세요")).not.toBeVisible();
  await expect(page.getByText("내 주변 저가 주유소 TOP5")).toBeVisible();
  // 유종은 경유로 유지됨(S6과 동일한 메커니즘 - 계정에 저장된 값 적용)
  await expect(page.getByRole("radio", { name: "경유" })).toHaveAttribute("aria-checked", "true");

  // 즐겨찾기 목록에도 방금 추가한 항목이 그대로 남아있다(S7 이후 상태 유지)
  await page.getByRole("button", { name: "즐겨찾기 목록" }).click();
  await expect(page.getByText("구인주유소")).toBeVisible();
});
