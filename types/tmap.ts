export type TmapLatLng = {
  lat(): number;
  lng(): number;
};

export type TmapSize = { width: number; height: number };

export type TmapMap = {
  fitBounds(bounds: TmapLatLngBounds): void;
  setCenter(latlng: TmapLatLng): void;
};

export type TmapLatLngBounds = {
  extend(latlng: TmapLatLng): void;
};

export type TmapMarker = {
  setMap(map: TmapMap | null): void;
};

// Tmapv2는 카카오/네이버와 달리 `window.Tmapv2.maps.Map`이 아니라
// `window.Tmapv2.Map`처럼 네임스페이스 자체에 클래스가 바로 달려 있다.
export type Tmapv2 = {
  // 실제 SDK는 HTMLElement가 아니라 컨테이너의 DOM id(string)를 받아 내부적으로
  // document.getElementById(id)로 조회한다 — HTMLElement를 넘기면 초기화가 실패한다.
  Map: new (
    container: string,
    options: { center: TmapLatLng; width?: string; height?: string; zoom?: number },
  ) => TmapMap;
  LatLng: new (lat: number, lng: number) => TmapLatLng;
  LatLngBounds: new (first?: TmapLatLng) => TmapLatLngBounds;
  Marker: new (options: {
    position: TmapLatLng;
    map?: TmapMap;
    icon?: string;
    iconSize?: TmapSize;
  }) => TmapMarker;
  Size: new (width: number, height: number) => TmapSize;
};

declare global {
  interface Window {
    Tmapv2?: Tmapv2;
  }
}
