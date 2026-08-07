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
    // async=false only affects execution order relative to other dynamic scripts,
    // it does not change document.write eligibility — keep it anyway for determinism.
    script.async = false;

    // Tmap SDK calls document.write() during its own top-level execution (almost
    // certainly to inject further internal <script> tags it depends on). By the
    // time this script runs, the page's initial HTML parse finished long ago —
    // document.write is only legal for the parser's own synchronous <script>
    // execution, so no combination of script placement (head vs body) or the
    // async flag can make it legal for a tag inserted this late. Both were tried
    // and both still hit "Failed to execute 'write' on 'Document'" in production.
    // Instead, temporarily replace document.write/writeln with a version that
    // parses the HTML and appends it to <body> (via Range#createContextualFragment,
    // which — unlike innerHTML — still executes any <script> tags in the result),
    // then restore the originals once the script settles.
    const originalWrite = document.write;
    const originalWriteln = document.writeln;
    const restoreDocumentWrite = () => {
      document.write = originalWrite;
      document.writeln = originalWriteln;
    };
    document.write = document.writeln = (...text: string[]) => {
      document.body.appendChild(document.createRange().createContextualFragment(text.join("")));
    };

    script.onload = () => {
      restoreDocumentWrite();
      resolve(window.Tmapv2!);
    };
    script.onerror = () => {
      restoreDocumentWrite();
      loadPromise = null;
      reject(new Error("티맵 SDK 로드에 실패했습니다."));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
}
