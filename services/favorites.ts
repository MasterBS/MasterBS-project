import { getSupabaseClient } from "@/lib/supabase";
import type { Favorite, FavoriteSnapshotInput } from "@/types/favorite";

type FavoriteRow = {
  id: string;
  user_key: string;
  station_uni_id: string;
  name: string;
  brand_label: string;
  lat: number;
  lng: number;
  price: number;
  created_at: string;
};

function fromRow(row: FavoriteRow): Favorite {
  return {
    id: row.id,
    userKey: row.user_key,
    stationUniId: row.station_uni_id,
    name: row.name,
    brandLabel: row.brand_label,
    lat: row.lat,
    lng: row.lng,
    price: row.price,
    createdAt: row.created_at,
  };
}

export async function listFavorites(userKey: string): Promise<Favorite[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_key", userKey)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`favorites 조회 실패: ${error.message}`);
  }
  return ((data ?? []) as FavoriteRow[]).map(fromRow);
}

export type ToggleFavoriteResult = { favorited: boolean };

export async function toggleFavorite(
  userKey: string,
  station: FavoriteSnapshotInput,
): Promise<ToggleFavoriteResult> {
  const supabase = getSupabaseClient();

  const { data: existing, error: selectError } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_key", userKey)
    .eq("station_uni_id", station.stationUniId)
    .maybeSingle();

  if (selectError) {
    throw new Error(`favorites 조회 실패: ${selectError.message}`);
  }

  if (existing) {
    const { error: deleteError } = await supabase.from("favorites").delete().eq("id", existing.id);
    if (deleteError) {
      throw new Error(`favorites 삭제 실패: ${deleteError.message}`);
    }
    return { favorited: false };
  }

  const { error: insertError } = await supabase.from("favorites").insert({
    user_key: userKey,
    station_uni_id: station.stationUniId,
    name: station.name,
    brand_label: station.brandLabel,
    lat: station.lat,
    lng: station.lng,
    price: station.price,
  });
  if (insertError) {
    throw new Error(`favorites 저장 실패: ${insertError.message}`);
  }
  return { favorited: true };
}
