import { auth } from "@/lib/auth";
import { getUserSettings, upsertUserSettings } from "@/services/user-settings";
import type { UserSettingsPartial } from "@/types/user-settings";

function unauthorized() {
  return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
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

  const body = (await request.json()) as UserSettingsPartial;
  const settings = await upsertUserSettings(userKey, body);
  return Response.json(settings);
}
