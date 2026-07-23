export type KakaoLatLng = {
  getLat(): number;
  getLng(): number;
};

export type KakaoSize = { width: number; height: number };

export type KakaoMarkerImage = object;

export type KakaoMap = {
  setBounds(bounds: KakaoLatLngBounds): void;
  setCenter(latlng: KakaoLatLng): void;
};

export type KakaoLatLngBounds = {
  extend(latlng: KakaoLatLng): void;
};

export type KakaoMarker = {
  setMap(map: KakaoMap | null): void;
  setImage(image: KakaoMarkerImage): void;
  setZIndex(zIndex: number): void;
};

export type KakaoMapsNamespace = {
  load(callback: () => void): void;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level?: number }) => KakaoMap;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Marker: new (options: {
    position: KakaoLatLng;
    map?: KakaoMap;
    image?: KakaoMarkerImage;
    zIndex?: number;
  }) => KakaoMarker;
  MarkerImage: new (src: string, size: KakaoSize, options?: object) => KakaoMarkerImage;
  Size: new (width: number, height: number) => KakaoSize;
};

export type Kakao = {
  maps: KakaoMapsNamespace;
};

declare global {
  interface Window {
    kakao: Kakao;
  }
}
