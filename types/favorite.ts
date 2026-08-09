export type Favorite = {
  id: string;
  userKey: string;
  stationUniId: string;
  // 즐겨찾기 시점의 스냅샷 (오피넷 재조회 없이 목록 표시)
  name: string;
  brandLabel: string;
  lat: number;
  lng: number;
  price: number;
  createdAt: string;
};

export type FavoriteSnapshotInput = {
  stationUniId: string;
  name: string;
  brandLabel: string;
  lat: number;
  lng: number;
  price: number;
};
