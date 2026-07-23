import { InfoIcon, MapPinOffIcon, RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PartialResultsBanner({ count }: { count: number }) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-md border p-3 text-sm">
      <InfoIcon className="size-4" />
      10km 내 {count}곳만 찾았어요
    </div>
  );
}

export function EmptyResultsMessage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <MapPinOffIcon className="size-8" />
      <span className="text-sm">10km 내에 조건에 맞는 주유소가 없어요</span>
      <span className="text-xs text-muted-foreground">필터를 조정해 다시 시도해보세요</span>
    </div>
  );
}

export function LocationDeniedMessage({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <MapPinOffIcon className="size-8" />
      <span className="text-sm">위치 권한이 필요해요</span>
      <span className="text-xs text-muted-foreground">브라우저 설정에서 위치 접근을 허용해주세요</span>
      <Button type="button" className="mt-2" onClick={onRetry}>
        <RotateCwIcon data-icon="inline-start" />
        다시 시도
      </Button>
    </div>
  );
}

export function ApiErrorMessage({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <TriangleAlertIcon className="size-8" />
      <span className="text-sm">가격 정보를 불러오지 못했어요</span>
      <span className="text-xs text-muted-foreground">잠시 후 다시 시도해주세요</span>
      <Button type="button" className="mt-2" onClick={onRetry}>
        <RotateCwIcon data-icon="inline-start" />
        다시 시도
      </Button>
    </div>
  );
}
