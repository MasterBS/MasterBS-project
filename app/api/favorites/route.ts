import { auth } from "@/lib/auth";
import { listFavorites, toggleFavorite } from "@/services/favorites";
import type { FavoriteSnapshotInput } from "@/types/favorite";

function unauthorized() {
  return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
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

  const body = (await request.json()) as FavoriteSnapshotInput;
  const result = await toggleFavorite(userKey, body);
  return Response.json(result);
}
