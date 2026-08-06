import type { Tmapv2 } from "@/types/tmap";

const TMAP_SDK_URL = "https://apis.openapi.sk.com/tmap/jsv2";

let loadPromise: Promise<Tmapv2> | null = null;

export function loadTmapMaps(appKey: string): Promise<Tmapv2> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadTmapMaps는 브라우저에서만 호출할 수 있습니다."));
  }

  if (window.Tmapv2?.Map) {
    return Promise.resolve(window.Tmapv2);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<Tmapv2>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${TMAP_SDK_URL}?version=1&appKey=${appKey}`;
    script.async = true;
    script.onload = () => {
      resolve(window.Tmapv2!);
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("티맵 SDK 로드에 실패했습니다."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
