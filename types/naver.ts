export type NaverLatLng = {
  lat(): number;
  lng(): number;
};

export type NaverSize = { width: number; height: number };

export type NaverMarkerIcon = { url: string; size?: NaverSize };

export type NaverMap = {
  fitBounds(bounds: NaverLatLngBounds): void;
  setCenter(latlng: NaverLatLng): void;
};

export type NaverLatLngBounds = {
  extend(latlng: NaverLatLng): void;
};

export type NaverMarker = {
  setMap(map: NaverMap | null): void;
  setIcon(icon: NaverMarkerIcon): void;
};

export type NaverMapsNamespace = {
  Map: new (container: HTMLElement, options: { center: NaverLatLng; zoom?: number }) => NaverMap;
  LatLng: new (lat: number, lng: number) => NaverLatLng;
  LatLngBounds: new (sw: NaverLatLng, ne: NaverLatLng) => NaverLatLngBounds;
  Marker: new (options: {
    position: NaverLatLng;
    map?: NaverMap;
    icon?: NaverMarkerIcon;
  }) => NaverMarker;
  Size: new (width: number, height: number) => NaverSize;
};

export type Naver = {
  maps: NaverMapsNamespace;
};

declare global {
  interface Window {
    naver?: Naver;
  }
}
