const CROP_TO_MANDI_COMMODITY: Record<string, string> = {
  paddy: "Paddy(Common)",
  bajra: "Bajra(Pearl Millet/Cumbu)",
};

export function toMandiCommodity(crop: string): string {
  const normalized = CROP_TO_MANDI_COMMODITY[crop.trim().toLowerCase()];
  return normalized ?? crop;
}
