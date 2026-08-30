import { getSupabaseClient } from "@/lib/supabase";
import type { UserSettings, UserSettingsPartial } from "@/types/user-settings";

type UserSettingsRow = {
  user_key: string;
  fuel_type: UserSettings["fuelType"];
  brands: UserSettings["brands"];
  map_provider: UserSettings["mapProvider"];
  updated_at: string;
};

function fromRow(row: UserSettingsRow): UserSettings {
  return {
    userKey: row.user_key,
    fuelType: row.fuel_type,
    brands: row.brands,
    mapProvider: row.map_provider,
    updatedAt: row.updated_at,
  };
}

export async function getUserSettings(userKey: string): Promise<UserSettings | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_key", userKey)
    .maybeSingle();

  if (error) {
    throw new Error(`user_settings 조회 실패: ${error.message}`);
  }
  if (!data) return null;
  return fromRow(data as UserSettingsRow);
}

export async function upsertUserSettings(
  userKey: string,
  partial: UserSettingsPartial,
): Promise<UserSettings> {
  const supabase = getSupabaseClient();

  const row: Record<string, unknown> = { user_key: userKey, updated_at: new Date().toISOString() };
  if (partial.fuelType !== undefined) row.fuel_type = partial.fuelType;
  if (partial.brands !== undefined) row.brands = partial.brands;
  if (partial.mapProvider !== undefined) row.map_provider = partial.mapProvider;

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(row, { onConflict: "user_key" })
    .select()
    .single();

  if (error) {
    throw new Error(`user_settings 저장 실패: ${error.message}`);
  }
  return fromRow(data as UserSettingsRow);
}
