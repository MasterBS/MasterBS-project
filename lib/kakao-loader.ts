import type { Kakao } from "@/types/kakao";

const KAKAO_SDK_URL = "https://dapi.kakao.com/v2/maps/sdk.js";

let loadPromise: Promise<Kakao> | null = null;

export function loadKakaoMaps(appKey: string): Promise<Kakao> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadKakaoMaps는 브라우저에서만 호출할 수 있습니다."));
  }

  if (window.kakao?.maps?.Map) {
    return Promise.resolve(window.kakao);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<Kakao>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${KAKAO_SDK_URL}?appkey=${appKey}&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("카카오맵 SDK 로드에 실패했습니다."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
