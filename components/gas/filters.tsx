"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { BRAND_KEYS, BRAND_LABEL_MAP } from "@/config/opinet";
import type { BrandKey } from "@/types/station";

export type FiltersProps = {
  brands: BrandKey[];
  onBrandsChange: (brands: BrandKey[]) => void;
  selfOnly: boolean;
  onSelfOnlyChange: (selfOnly: boolean) => void;
};

export function Filters({ brands, onBrandsChange, selfOnly, onSelfOnlyChange }: FiltersProps) {
  function toggleBrand(brand: BrandKey, checked: boolean) {
    if (checked) {
      onBrandsChange([...brands, brand]);
    } else {
      onBrandsChange(brands.filter((b) => b !== brand));
    }
  }

  return (
    <FieldSet>
      <FieldLegend variant="label">필터</FieldLegend>
      <FieldGroup className="gap-3">
        <div className="flex flex-wrap gap-3">
          {BRAND_KEYS.map((brand) => (
            <Field key={brand} orientation="horizontal" className="w-auto">
              <Checkbox
                id={`brand-${brand}`}
                checked={brands.includes(brand)}
                onCheckedChange={(checked) => toggleBrand(brand, checked === true)}
              />
              <FieldLabel htmlFor={`brand-${brand}`} className="font-normal">
                {BRAND_LABEL_MAP[brand]}
              </FieldLabel>
            </Field>
          ))}
        </div>
        <Field orientation="horizontal">
          <Switch id="self-only" checked={selfOnly} onCheckedChange={onSelfOnlyChange} />
          <FieldLabel htmlFor="self-only" className="font-normal">
            셀프주유소만 보기
          </FieldLabel>
        </Field>
        <FieldDescription>이름 기준 추정치이며 정확하지 않을 수 있어요</FieldDescription>
      </FieldGroup>
    </FieldSet>
  );
}
