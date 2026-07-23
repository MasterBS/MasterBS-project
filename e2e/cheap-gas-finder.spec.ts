import { expect, test, type Page } from "@playwright/test";

const CURRENT_LOCATION = { latitude: 37.5587543, longitude: 127.0008881 };

type StubStation = {
  id: string;
  name: string;
  brandCode: string;
  brandLabel: string;
  price: number;
  distance: number;
  lat: number;
  lng: number;
  isSelfEstimated: boolean;
};

function makeStation(overrides: Partial<StubStation>): StubStation {
  return {
    id: "1",
    name: "테스트주유소",
    brandCode: "SKE",
    brandLabel: "SK에너지",
    price: 1800,
    distance: 500,
    lat: 37.561,
    lng: 127.001,
    isSelfEstimated: false,
    ...overrides,
  };
}

// 가격 오름차순으로 미리 정렬해 둔다 - 정렬 로직 자체는 services/stations.test.ts에서 이미 증명됨.
// 여기서는 실제 페이지가 API 응답을 올바르게 배선·렌더링하는지만 확인한다.
const GASOLINE_STATIONS: StubStation[] = [
  makeStation({ id: "g1", name: "서울에너지 직영", brandCode: "SOL", brandLabel: "S-OIL", price: 1830, distance: 4900, lat: 37.6, lng: 127.02 }),
  makeStation({ id: "g2", name: "강산주유소", brandCode: "GSC", brandLabel: "GS칼텍스", price: 1840, distance: 850, lat: 37.565, lng: 127.005 }),
  makeStation({ id: "g3", name: "풍한셀프주유소", brandCode: "SKE", brandLabel: "SK에너지", price: 1845, distance: 4600, lat: 37.59, lng: 126.99, isSelfEstimated: true }),
  makeStation({ id: "g4", name: "성북주유소", brandCode: "HDO", brandLabel: "HD현대오일뱅크", price: 1849, distance: 3600, lat: 37.58, lng: 127.03 }),
  makeStation({ id: "g5", name: "신방주유소", brandCode: "SOL", brandLabel: "S-OIL", price: 1849, distance: 4000, lat: 37.57, lng: 126.98 }),
];

const DIESEL_STATIONS: StubStation[] = [
  makeStation({ id: "d1", name: "경유참좋은주유소", brandCode: "SKE", brandLabel: "SK에너지", price: 1700, distance: 1000, lat: 37.562, lng: 127.002 }),
  makeStation({ id: "d2", name: "경유든든주유소", brandCode: "GSC", brandLabel: "GS칼텍스", price: 1710, distance: 1200, lat: 37.563, lng: 127.003 }),
  makeStation({ id: "d3", name: "경유셀프주유소", brandCode: "HDO", brandLabel: "HD현대오일뱅크", price: 1720, distance: 1300, lat: 37.564, lng: 127.004, isSelfEstimated: true }),
  makeStation({ id: "d4", name: "경유알뜰주유소", brandCode: "SOL", brandLabel: "S-OIL", price: 1730, distance: 1400, lat: 37.566, lng: 127.006 }),
  makeStation({ id: "d5", name: "경유으뜸주유소", brandCode: "ETC", brandLabel: "자가상표/기타", price: 1740, distance: 1500, lat: 37.567, lng: 127.007 }),
];

async function stubStations(page: Page, options: { pool?: (fuel: string) => StubStation[] } = {}) {
  await page.route("**/api/stations*", async (route) => {
    const url = new URL(route.request().url());
    const fuel = url.searchParams.get("fuel") ?? "gasoline";
    const brandsParam = url.searchParams.get("brands");
    const selfOnly = url.searchParams.get("selfOnly") === "true";

    let pool = options.pool ? options.pool(fuel) : fuel === "diesel" ? DIESEL_STATIONS : GASOLINE_STATIONS;

    if (brandsParam) {
      const brands = brandsParam.split(",");
      pool = pool.filter((s) => brands.includes(s.brandCode));
    }
    if (selfOnly) {
      pool = pool.filter((s) => s.isSelfEstimated);
    }

    await route.fulfill({ json: pool.slice(0, 5) });
  });
}

test("[S8][S1] 위치 거부 후 다시 시도로 허용하면 로딩을 거쳐 결과가 표시된다", async ({ page, context }) => {
  await stubStations(page);
  await page.goto("/");

  await expect(page.getByText("위치 권한이 필요해요")).toBeVisible();
  await expect(page.getByText("브라우저 설정에서 위치 접근을 허용해주세요")).toBeVisible();
  const retryButton = page.getByRole("button", { name: "다시 시도" });
  await expect(retryButton).toBeVisible();

  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);
  await retryButton.click();

  await expect(page.getByRole("listitem")).toHaveCount(5);
  await expect(page.getByText("서울에너지 직영")).toBeVisible();
  await expect(page.getByText("1,830원")).toBeVisible();
});

test("[S2] 유종을 경유로 바꾸면 리스트가 즉시 갱신된다", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);
  await stubStations(page);
  await page.goto("/");

  await expect(page.getByRole("listitem")).toHaveCount(5);
  await expect(page.getByText("서울에너지 직영")).toBeVisible();

  await page.getByRole("radio", { name: "경유" }).click();

  await expect(page.getByText("경유참좋은주유소")).toBeVisible();
  await expect(page.getByText("서울에너지 직영")).not.toBeVisible();
});

test("[S3] 브랜드 필터를 하나만 남기면 해당 브랜드만 표시된다", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);
  await stubStations(page);
  await page.goto("/");

  await expect(page.getByRole("listitem")).toHaveCount(5);

  for (const brand of ["GS칼텍스", "HD현대오일뱅크", "S-OIL", "자가상표/기타"]) {
    await page.getByLabel(brand).click();
  }

  // GASOLINE_STATIONS 중 SK에너지(SKE)는 "풍한셀프주유소" 하나뿐
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByText("풍한셀프주유소")).toBeVisible();
});

test("[S4] 셀프주유소 필터를 켜면 셀프 주유소만 남고 안내 문구가 보인다", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);
  await stubStations(page);
  await page.goto("/");

  await expect(page.getByRole("listitem")).toHaveCount(5);
  await expect(page.getByText("이름 기준 추정치이며 정확하지 않을 수 있어요")).toBeVisible();

  await page.getByLabel("셀프주유소만 보기").click();

  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByText("풍한셀프주유소")).toBeVisible();
});

// 카카오맵 JS SDK가 http://localhost:3000을 허용 Web 플랫폼 도메인으로 등록해야 로드된다
// (Referer 헤더가 붙는 sub-resource 요청은 401, 직접 navigate는 200 - Kakao Developers 콘솔의
// "플랫폼 > Web" 설정 문제이며 앱 코드 문제가 아니다). 도메인 등록 후 재활성화한다.
test.fixme(
  "[S5] 리스트 항목을 선택하면 지도에서 해당 핀이 강조된다",
  async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation(CURRENT_LOCATION);
    await stubStations(page);
    await page.goto("/");

    await expect(page.getByRole("listitem")).toHaveCount(5);
    await page.getByText("강산주유소").click();

    // 선택된 마커는 커스텀 빨간 SVG 이미지(fill=#dc2626)를 쓴다 (components/gas/map-view.tsx)
    await expect(page.locator('img[src*="dc2626"]')).toBeVisible({ timeout: 10_000 });
  },
);

test("[S6] 길찾기 버튼을 클릭하면 새 탭에 카카오맵 길찾기가 열린다", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);
  await stubStations(page);
  await page.goto("/");

  await expect(page.getByRole("listitem")).toHaveCount(5);

  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    // 주의: 리스트 항목 전체(Card)도 role="button"이고 접근성 이름에 "길찾기"가 포함되므로
    // exact:true 없이는 바깥 Card가 먼저 매칭돼 선택만 되고 새 탭이 열리지 않는다.
    page.getByRole("button", { name: "길찾기", exact: true }).first().click(),
  ]);

  // 카카오 서버가 m.map.kakao.com/scheme/route → applink.map.kakao.com/route → (앱 미설치 시)
  // map.kakao.com으로 실제 리다이렉트 체인을 태운다 - 우리 URL 빌더가 만든 링크가 실제로
  // 카카오의 지도/길찾기 서비스에 도달함을 엔드투엔드로 증명한다.
  await popup.waitForLoadState();
  expect(popup.url()).toMatch(/kakao\.com/);
  expect(popup.url()).toContain("car");
});

test("[S7] 결과가 5곳 미만이면 부족 안내 문구가 보인다", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);
  await stubStations(page, { pool: () => GASOLINE_STATIONS.slice(0, 2) });
  await page.goto("/");

  await expect(page.getByText("10km 내 2곳만 찾았어요")).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(2); // INV-1: 5개를 넘지 않는다
});

test("[S7] 결과가 0곳이면 없음 안내 문구가 보인다", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);
  await stubStations(page, { pool: () => [] });
  await page.goto("/");

  await expect(page.getByText("10km 내에 조건에 맞는 주유소가 없어요")).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(0);
});

test("[S9] API 실패 시 에러 문구가 보이고 다시 시도하면 재요청된다", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);

  let callCount = 0;
  await page.route("**/api/stations*", async (route) => {
    callCount += 1;
    if (callCount === 1) {
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ error: "가격 정보를 불러오지 못했어요." }),
      });
      return;
    }
    await route.fulfill({ json: GASOLINE_STATIONS });
  });

  await page.goto("/");

  await expect(page.getByText("가격 정보를 불러오지 못했어요")).toBeVisible();
  await expect(page.getByText("잠시 후 다시 시도해주세요")).toBeVisible();

  await page.getByRole("button", { name: "다시 시도" }).click();

  await expect(page.getByRole("listitem")).toHaveCount(5);
  expect(callCount).toBeGreaterThanOrEqual(2);
});
