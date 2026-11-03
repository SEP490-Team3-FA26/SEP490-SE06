export interface UnitOptionLike {
  unitName?: string;
  exchangeValue?: number;
  price?: number;
  isBaseUnit?: boolean;
}

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

const PACKAGE_ONLY_UNITS = new Set([
  'tuýp',
  'tuyp',
  'tube',
  'chai',
  'lọ',
  'lo',
  'bình',
  'binh',
  'ống',
  'ong',
]);

export const isPackageOnlyUnit = (unitName: unknown): boolean =>
  PACKAGE_ONLY_UNITS.has(normalize(unitName));

export const getUnitFactor = (unit?: UnitOptionLike | null): number => {
  const factor = Number(unit?.exchangeValue);
  return Number.isFinite(factor) && factor > 0 ? factor : 1;
};

export const getUnitOptions = (medicine: any): UnitOptionLike[] => {
  const source = Array.isArray(medicine?.units) && medicine.units.length > 0
    ? medicine.units
    : [{ unitName: medicine?.unit || 'Hộp', exchangeValue: 1, price: medicine?.price }];
  const unique = new Map<string, UnitOptionLike>();
  source.forEach((raw: any) => {
    const unitName = String(raw?.unitName || raw?.name || '').trim();
    if (!unitName) return;
    const key = normalize(unitName);
    if (!unique.has(key)) {
      unique.set(key, {
        ...raw,
        unitName,
        exchangeValue: getUnitFactor(raw),
        price: Number.isFinite(Number(raw?.price)) ? Number(raw.price) : undefined,
      });
    }
  });
  return Array.from(unique.values());
};

export const getSelectedUnit = (medicine: any, unitName?: string): UnitOptionLike => {
  const units = getUnitOptions(medicine);
  const selected = units.find(unit => normalize(unit.unitName) === normalize(unitName));
  if (selected) return selected;
  return units.find(unit => normalize(unit.unitName) === normalize(medicine?.unit))
    || units.find(unit => unit.isBaseUnit)
    || units.sort((a, b) => getUnitFactor(a) - getUnitFactor(b))[0]
    || { unitName: medicine?.unit || 'Hộp', exchangeValue: 1 };
};

/** Resolve the price for the exact selling unit. Client price is deliberately ignored. */
export const resolveUnitPrice = (medicine: any, selectedUnit: UnitOptionLike, referencePrice?: number): number => {
  const explicitPrice = Number(selectedUnit?.price);
  if (Number.isFinite(explicitPrice) && explicitPrice > 0) return Math.round(explicitPrice);

  const units = getUnitOptions(medicine);
  const referenceUnit = units.find(unit => normalize(unit.unitName) === normalize(medicine?.unit))
    || units.find(unit => unit.isBaseUnit)
    || [...units].sort((a, b) => getUnitFactor(b) - getUnitFactor(a))[0];
  const price = Number(referencePrice ?? medicine?.price) || 0;
  return Math.round(price * getUnitFactor(selectedUnit) / getUnitFactor(referenceUnit));
};

export const buildRetailDosageInstruction = ({
  medicine,
  selectedUnit,
  dosePerTime = 1,
  timesPerDay = 2,
  durationDays = 7,
  baseUnitName = 'viên',
}: {
  medicine: any;
  selectedUnit: UnitOptionLike;
  dosePerTime?: number;
  timesPerDay?: number;
  durationDays?: number;
  baseUnitName?: string;
}): string => {
  const unit = normalize(selectedUnit?.unitName);
  const form = normalize(medicine?.dosage_form);
  const days = Number(durationDays) || 1;
  const times = Number(timesPerDay) || 2;
  if (unit === 'tuýp' || unit === 'tuyp' || unit === 'tube' || /kem|cream|gel|mỡ|mo|ointment|bôi/.test(form)) {
    return `Bôi một lượng vừa đủ, ${times} lần/ngày - Dùng trong ${days} ngày`;
  }
  if (unit === 'chai' || unit === 'lọ' || unit === 'lo' || unit === 'ống' || unit === 'ong') {
    return `Dùng theo hướng dẫn trên nhãn/đơn thuốc - Dự kiến trong ${days} ngày`;
  }
  return `Uống ${Number(dosePerTime) || 1} ${baseUnitName}/lần, ${times} lần/ngày sau ăn - Dùng trong ${days} ngày`;
};
