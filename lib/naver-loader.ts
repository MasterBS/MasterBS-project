import type { Naver } from "@/types/naver";

const NAVER_SDK_URL = "https://oapi.map.naver.com/openapi/v3/maps.js";

let loadPromise: Promise<Naver> | null = null;

export function loadNaverMaps(clientId: string): Promise<Naver> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadNaverMaps는 브라우저에서만 호출할 수 있습니다."));
  }

  if (window.naver?.maps?.Map) {
    return Promise.resolve(window.naver);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<Naver>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${NAVER_SDK_URL}?ncpKeyId=${clientId}`;
    script.async = true;
    script.onload = () => {
      resolve(window.naver!);
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("네이버지도 SDK 로드에 실패했습니다."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
