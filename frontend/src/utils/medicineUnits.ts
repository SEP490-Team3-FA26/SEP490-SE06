export interface MedicineUnitOption {
  unitName: string;
  exchangeValue?: number;
  price?: number;
  isBaseUnit?: boolean;
  barcode?: string;
}

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

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

export const isPackageOnlyUnit = (unitName: unknown): boolean =>
  PACKAGE_ONLY_UNITS.has(normalize(unitName));

export const getUnitFactor = (unit?: MedicineUnitOption | null): number => {
  const factor = Number(unit?.exchangeValue);
  return Number.isFinite(factor) && factor > 0 ? factor : 1;
};

export const buildUnitOptions = (medicine: any): MedicineUnitOption[] => {
  const source = Array.isArray(medicine?.units) && medicine.units.length > 0
    ? medicine.units
    : Array.isArray(medicine?.unitOptions) && medicine.unitOptions.length > 0
      ? medicine.unitOptions
      : [{
          unitName: medicine?.unit || 'Hộp',
          exchangeValue: 1,
          price: Number(medicine?.price) || 0,
          isBaseUnit: true,
        }];

  const unique = new Map<string, MedicineUnitOption>();
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

/** The base unit is the smallest physical unit, not the array position or isBaseUnit flag. */
export const getBaseUnitOption = (medicineOrUnits: any): MedicineUnitOption => {
  const units = Array.isArray(medicineOrUnits)
    ? medicineOrUnits
    : buildUnitOptions(medicineOrUnits);
  return [...units].sort((a, b) => getUnitFactor(a) - getUnitFactor(b))[0] || {
    unitName: 'đơn vị',
    exchangeValue: 1,
  };
};

export const getDefaultUnitOption = (medicine: any): MedicineUnitOption => {
  const units = buildUnitOptions(medicine);
  const preferred = normalize(medicine?.unit);
  return units.find(unit => normalize(unit.unitName) === preferred)
    || units.find(unit => isPackageOnlyUnit(unit.unitName))
    || getBaseUnitOption(units);
};

/** Resolve the price for the selected selling unit. */
export const getUnitPrice = (medicine: any, selectedUnit?: MedicineUnitOption | null): number => {
  const units = buildUnitOptions(medicine);
  const unit = selectedUnit || getDefaultUnitOption(medicine);
  const explicitPrice = Number(unit?.price);
  if (Number.isFinite(explicitPrice) && explicitPrice > 0) return Math.round(explicitPrice);

  const preferredName = normalize(medicine?.unit);
  const referenceUnit = units.find(item => normalize(item.unitName) === preferredName)
    || units.find(item => item.isBaseUnit)
    || [...units].sort((a, b) => getUnitFactor(b) - getUnitFactor(a))[0];
  const referenceFactor = getUnitFactor(referenceUnit);
  const referencePrice = Number(medicine?.price) || 0;
  return Math.round(referencePrice * getUnitFactor(unit) / referenceFactor);
};

export const calculateRetailQuantity = ({
  unit,
  dailyDose,
  durationDays,
  currentQuantity = 1,
}: {
  unit: MedicineUnitOption;
  dailyDose: number;
  durationDays: number;
  currentQuantity?: number;
}): number => {
  // A tube/bottle is sold as an intact package. Dosage frequency must not
  // turn a 7-day topical course into seven tubes.
  if (isPackageOnlyUnit(unit?.unitName)) return Math.max(1, Number(currentQuantity) || 1);
  const totalBaseUnits = Math.max(1, Math.ceil((Number(dailyDose) || 1) * (Number(durationDays) || 1)));
  return Math.max(1, Math.ceil(totalBaseUnits / getUnitFactor(unit)));
};

export const buildRetailDosageInstruction = ({
  unitName,
  dosageForm,
  dosePerTime = 1,
  timesPerDay = 2,
  durationDays = 7,
  baseUnitName = 'viên',
}: {
  unitName?: string;
  dosageForm?: string;
  dosePerTime?: number;
  timesPerDay?: number;
  durationDays?: number;
  baseUnitName?: string;
}): string => {
  const unit = normalize(unitName);
  const form = normalize(dosageForm);
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
