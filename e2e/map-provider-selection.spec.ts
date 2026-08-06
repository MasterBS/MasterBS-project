import { expect, test, type Page } from "@playwright/test";

const CURRENT_LOCATION = { latitude: 37.5587543, longitude: 127.0008881 };

const STATION = {
  id: "1",
  name: "테스트주유소",
  brandCode: "SKE",
  brandLabel: "SK에너지",
  price: 1800,
  distance: 500,
  lat: 37.561,
  lng: 127.001,
  isSelfEstimated: false,
};

async function stubStations(page: Page) {
  await page.route("**/api/stations*", async (route) => {
    await route.fulfill({ json: [STATION] });
  });
}

// 실 NCP/Kakao 키·도메인 등록 없이도 provider 전환을 증명하기 위해
// 지도 SDK 스크립트 자체를 최소 스텁으로 대체한다 (실제 렌더링이 아니라
// "어느 SDK가 로드됐는가"만 네트워크 요청으로 검증한다).
async function stubMapSdks(page: Page) {
  await page.route("**/dapi.kakao.com/v2/maps/sdk.js**", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `window.kakao = { maps: { load: (cb) => cb(),
        Map: function(){ this.setBounds=function(){}; this.setCenter=function(){}; },
        LatLng: function(lat,lng){ this.getLat=()=>lat; this.getLng=()=>lng; },
        LatLngBounds: function(){ this.extend=function(){}; },
        Marker: function(){ this.setMap=function(){}; this.setImage=function(){}; this.setZIndex=function(){}; },
        MarkerImage: function(){}, Size: function(){} } };`,
    });
  });
  await page.route("**/oapi.map.naver.com/openapi/v3/maps.js**", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `window.naver = { maps: {
        Map: function(){ this.fitBounds=function(){}; this.setCenter=function(){}; },
        LatLng: function(lat,lng){ this.lat=()=>lat; this.lng=()=>lng; },
        LatLngBounds: function(){ this.extend=function(){}; },
        Marker: function(){ this.setMap=function(){}; this.setIcon=function(){}; },
        Size: function(){} } };`,
    });
  });
  await page.route("**/apis.openapi.sk.com/tmap/jsv2**", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `window.Tmapv2 = {
        Map: function(){ this.fitBounds=function(){}; this.setCenter=function(){}; },
        LatLng: function(lat,lng){ this.lat=()=>lat; this.lng=()=>lng; },
        LatLngBounds: function(){ this.extend=function(){}; },
        Marker: function(){ this.setMap=function(){}; },
        Size: function(){} };`,
    });
  });
}

test("[S6] 설정 진입점은 위치 권한이 거부된 상태에서도 항상 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("위치 권한이 필요해요")).toBeVisible();
  await expect(page.getByRole("button", { name: "설정" })).toBeVisible();
});

test("[S1][S3] 기본값은 네이버지도이고, 설정에서 카카오맵으로 전환하면 즉시 카카오 SDK가 로드된다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);
  await stubStations(page);
  await stubMapSdks(page);

  const naverRequest = page.waitForRequest("**/oapi.map.naver.com/openapi/v3/maps.js**");
  await page.goto("/");
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await naverRequest;

  const kakaoRequest = page.waitForRequest("**/dapi.kakao.com/v2/maps/sdk.js**");
  await page.getByRole("button", { name: "설정" }).click();
  await page.getByRole("radio", { name: "카카오맵" }).click();
  await kakaoRequest;
  await expect(page.getByRole("radio", { name: "카카오맵" })).not.toBeVisible();
});

test("[S4] 새로고침해도 선택한 provider가 유지된다", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);
  await stubStations(page);
  await stubMapSdks(page);

  await page.goto("/");
  await expect(page.getByRole("listitem")).toHaveCount(1);

  await page.getByRole("button", { name: "설정" }).click();
  await page.getByRole("radio", { name: "카카오맵" }).click();

  const kakaoRequest = page.waitForRequest("**/dapi.kakao.com/v2/maps/sdk.js**");
  await page.reload();
  await kakaoRequest;
});

test("[tmap-provider-integration S1-1] 설정에서 티맵을 선택하면 새로고침 없이 즉시 티맵 SDK가 로드된다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);
  await stubStations(page);
  await stubMapSdks(page);

  await page.goto("/");
  await expect(page.getByRole("listitem")).toHaveCount(1);

  const tmapRequest = page.waitForRequest("**/apis.openapi.sk.com/tmap/jsv2**");
  await page.getByRole("button", { name: "설정" }).click();
  await page.getByRole("radio", { name: "티맵" }).click();
  await tmapRequest;
  // 설정 화면이 닫혔는지 확인 (S1-1)
  await expect(page.getByRole("radio", { name: "티맵" })).not.toBeVisible();
});

test("[tmap-provider-integration S3] 티맵으로 전환 후 새로고침해도 티맵으로 유지된다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);
  await stubStations(page);
  await stubMapSdks(page);

  await page.goto("/");
  await expect(page.getByRole("listitem")).toHaveCount(1);

  await page.getByRole("button", { name: "설정" }).click();
  await page.getByRole("radio", { name: "티맵" }).click();

  const tmapRequest = page.waitForRequest("**/apis.openapi.sk.com/tmap/jsv2**");
  await page.reload();
  await tmapRequest;
});

test("[tmap-provider-integration S4-1][tmap-provider-integration S4-2] 티맵 SDK 로드가 실패하면 에러 안내가 뜨고 리스트는 계속 보인다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);
  await stubStations(page);
  await page.route("**/apis.openapi.sk.com/tmap/jsv2**", async (route) => {
    await route.fulfill({ status: 500, body: "sdk load failed" });
  });

  await page.goto("/");
  await expect(page.getByRole("listitem")).toHaveCount(1);

  await page.getByRole("button", { name: "설정" }).click();
  await page.getByRole("radio", { name: "티맵" }).click();

  await expect(page.getByText("지도를 불러오지 못했어요. 다시 시도해주세요")).toBeVisible();
  await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
  // 지도가 실패해도 리스트(순위·가격·거리)는 정상적으로 계속 표시된다 (S4-2)
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByText("테스트주유소")).toBeVisible();
});

test("[네이버지도 길찾기 웹 폴백] 앱 딥링크가 반응 없으면 새 탭이 네이버지도 웹으로 넘어간다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(CURRENT_LOCATION);
  await stubStations(page);
  await stubMapSdks(page);

  await page.goto("/");
  await expect(page.getByRole("listitem")).toHaveCount(1);

  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("button", { name: "길찾기", exact: true }).click(),
  ]);

  // nmap://는 이 브라우저에 핸들러가 없어 아무 데도 못 감 → 1.2초 뒤 웹 폴백으로 리다이렉트되는지 확인
  await popup.waitForURL(/map\.naver\.com\/p\/directions/, { timeout: 5000 });
  expect(popup.url()).toContain("map.naver.com/p/directions");
});
