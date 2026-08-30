// next-auth JWT 콜백과 API Route Handler가 공유하는 단일 파생 함수.
// provider별 별개 계정 취급(spec 범위)을 이 포맷 하나로 고정한다.
export function deriveUserKey(provider: string, providerAccountId: string): string {
  return `${provider}:${providerAccountId}`;
}
