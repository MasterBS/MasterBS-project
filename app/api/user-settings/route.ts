import { auth } from "@/lib/auth";
import { getUserSettings, upsertUserSettings } from "@/services/user-settings";
import { BRAND_KEYS } from "@/config/opinet";
import { MAP_PROVIDER_LABELS } from "@/config/map-provider";
import type { UserSettingsPartial } from "@/types/user-settings";

const FUEL_TYPES = ["gasoline", "diesel", "lpg"];
const MAP_PROVIDERS = Object.keys(MAP_PROVIDER_LABELS);

function unauthorized() {
  return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
}

// 클라이언트가 보낸 값을 그대로 신뢰하지 않는다 - 잘못된 값이 계정에 저장되면
// MAP_PROVIDER_LABELS[값] 등이 undefined가 되어 이후 화면이 깨질 수 있다.
function validatePartial(body: unknown): { ok: true; value: UserSettingsPartial } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "요청 본문이 올바르지 않습니다." };
  }
  const { fuelType, brands, mapProvider } = body as Record<string, unknown>;

  if (fuelType !== undefined && !FUEL_TYPES.includes(fuelType as string)) {
    return { ok: false, error: `fuelType은 ${FUEL_TYPES.join("/")} 중 하나여야 합니다.` };
  }
  if (brands !== undefined) {
    if (!Array.isArray(brands) || !brands.every((b) => (BRAND_KEYS as string[]).includes(b))) {
      return { ok: false, error: `brands는 ${BRAND_KEYS.join("/")} 중 값들로 이루어진 배열이어야 합니다.` };
    }
  }
  if (mapProvider !== undefined && mapProvider !== null && !MAP_PROVIDERS.includes(mapProvider as string)) {
    return { ok: false, error: `mapProvider는 ${MAP_PROVIDERS.join("/")} 중 하나이거나 null이어야 합니다.` };
  }

  return { ok: true, value: body as UserSettingsPartial };
}

export async function GET() {
  const session = await auth();
  const userKey = session?.userKey;
  if (!userKey) return unauthorized();

  const settings = await getUserSettings(userKey);
  return Response.json(settings);
}

export async function PUT(request: Request) {
  const session = await auth();
  const userKey = session?.userKey;
  if (!userKey) return unauthorized();

  const body = await request.json();
  const validated = validatePartial(body);
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  const settings = await upsertUserSettings(userKey, validated.value);
  return Response.json(settings);
}
