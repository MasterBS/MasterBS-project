import { expect, test, type Page } from "@playwright/test";
import { MAP_PROVIDER_STORAGE_KEY } from "@/config/map-provider";

const CURRENT_LOCATION = { latitude: 37.5587543, longitude: 127.0008881 };

const STATIONS = [
  {
    id: "1",
    name: "서울에너지 직영",
    brandCode: "SOL",
    brandLabel: "S-OIL",
    price: 1830,
    distance: 4900,
    lat: 37.6,
    lng: 127.02,
    isSelfEstimated: false,
  },
  {
    id: "2",
    name: "강산주유소",
    brandCode: "GSC",
    brandLabel: "GS칼텍스",
    price: 1840,
    distance: 850,
    lat: 37.565,
    lng: 127.005,
    isSelfEstimated: false,
  },
];

async function stubStations(page: Page) {
  await page.route("**/api/stations*", async (route) => {
    await route.fulfill({ json: STATIONS });
  });
}

async function presetProvider(page: Page, provider: "kakao" | "naver") {
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: MAP_PROVIDER_STORAGE_KEY, value: provider },
  );
}

test("[S1] 저장된 선택이 없으면 위치 권한보다 먼저 제공자 선택 화면이 뜬다", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "카카오맵" })).toBeVisible();
  await expect(page.getByRole("button", { name: "네이버지도" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "휘발유" })).toHaveCount(0);
});

test("[S2][S3] 제공자를 선택하면 저장되고, 다시 열면 선택 화면 없이 곧바로 시작한다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);
  await stubStations(page);

  await page.goto("/");
  await page.getByRole("button", { name: "네이버지도" }).click();

  await expect(page.getByRole("button", { name: "카카오맵" })).toHaveCount(0);
  await expect(page.getByRole("listitem")).toHaveCount(2);

  await page.reload();

  await expect(page.getByRole("button", { name: "카카오맵" })).toHaveCount(0);
  await expect(page.getByRole("listitem")).toHaveCount(2);
});

test("[S4] 상단 토글로 전환해도 리스트·선택 상태가 유지된다", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);
  await stubStations(page);
  await presetProvider(page, "kakao");

  await page.goto("/");
  await expect(page.getByRole("listitem")).toHaveCount(2);
  await page.getByText("강산주유소").click();

  await page.getByRole("radio", { name: "네이버지도" }).click();

  await expect(page.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByText("강산주유소")).toBeVisible();
  await expect(page.getByRole("radio", { name: "네이버지도" })).toHaveAttribute("aria-checked", "true");
});

// nmap://은 카카오의 https:// 딥링크(m.map.kakao.com/scheme/route)와 달리 브라우저가 처리할
// 프로토콜 핸들러를 모른다. window.open("nmap://...")을 호출해도 Chromium이 새 Page를 만들지
// 않아(팝업 이벤트 자체가 발생하지 않음) 30초 타임아웃으로 재현됨 - 실기기(네이버지도 앱 설치된
// 모바일)에서만 실제로 앱이 열리는지 확인 가능한, 이 앱 코드가 제어할 수 없는 환경 제약이다.
// URL 생성 자체는 lib/directions.test.ts·station-list.test.tsx의 [S6] 단위 테스트로 이미 증명됨.
test.fixme(
  "[S6] 네이버지도 선택 상태에서 길찾기를 누르면 네이버 딥링크로 새 탭이 열린다",
  async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation(CURRENT_LOCATION);
    await stubStations(page);
    await presetProvider(page, "naver");

    await page.goto("/");
    await expect(page.getByRole("listitem")).toHaveCount(2);

    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "길찾기", exact: true }).first().click();
    const popup = await popupPromise;

    expect(popup.url()).toContain("nmap://route/car");
  },
);
