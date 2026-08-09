import { auth } from "@/lib/auth";
import { listFavorites, toggleFavorite } from "@/services/favorites";
import type { FavoriteSnapshotInput } from "@/types/favorite";

function unauthorized() {
  return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
}

// 클라이언트가 보낸 값을 그대로 신뢰하지 않는다 - 타입이 안 맞으면 Supabase insert가
// 처리되지 않은 예외로 500을 내므로, user-settings route와 동일하게 여기서 막는다.
function validateSnapshot(
  body: unknown,
): { ok: true; value: FavoriteSnapshotInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "요청 본문이 올바르지 않습니다." };
  }
  const { stationUniId, name, brandLabel, lat, lng, price } = body as Record<string, unknown>;

  if (typeof stationUniId !== "string" || stationUniId.length === 0) {
    return { ok: false, error: "stationUniId는 비어있지 않은 문자열이어야 합니다." };
  }
  if (typeof name !== "string" || typeof brandLabel !== "string") {
    return { ok: false, error: "name/brandLabel은 문자열이어야 합니다." };
  }
  if (![lat, lng, price].every((v) => typeof v === "number" && Number.isFinite(v))) {
    return { ok: false, error: "lat/lng/price는 숫자여야 합니다." };
  }

  return { ok: true, value: body as FavoriteSnapshotInput };
}

export async function GET() {
  const session = await auth();
  const userKey = session?.userKey;
  if (!userKey) return unauthorized();

  const favorites = await listFavorites(userKey);
  return Response.json(favorites);
}

export async function POST(request: Request) {
  const session = await auth();
  const userKey = session?.userKey;
  if (!userKey) return unauthorized();

  const body = await request.json();
  const validated = validateSnapshot(body);
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  const result = await toggleFavorite(userKey, validated.value);
  return Response.json(result);
}
