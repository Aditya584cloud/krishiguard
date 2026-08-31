// Farmer-facing crop names (as stored on Farmer.primaryCrop, or typed on the
// Market page) don't always match data.gov.in's commodity naming. This is
// the single place that translation happens — nothing else in the codebase
// should hardcode a commodity string.
//
// IMPORTANT: "Paddy" and "Rice" are distinct commodities in the government
// dataset. Only "Paddy" is normalized (to "Paddy(Common)", the actual
// commodity value that carries real Odisha records) — "Rice" is left
// untouched and must never be mapped to "Paddy(Common)".
//
// Each mapping below was verified against the actual synced MandiPrice data
// (or a live data.gov.in query) before being added — never guessed.
const CROP_TO_MANDI_COMMODITY: Record<string, string> = {
  paddy: "Paddy(Common)",
  bajra: "Bajra(Pearl Millet/Cumbu)",
};

/** Maps a farmer-facing crop name to the data.gov.in commodity name used for storage/lookup. */
export function toMandiCommodity(crop: string): string {
  const normalized = CROP_TO_MANDI_COMMODITY[crop.trim().toLowerCase()];
  return normalized ?? crop;
}
