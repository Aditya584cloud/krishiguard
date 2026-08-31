// Real, static Indian state-adjacency geography — used only as a soft
// preference when the other-state market fallback has to pick which
// non-local records to show first. This is common-knowledge geography, not
// data derived from mandi prices or coordinates (MandiPrice rows carry no
// lat/lon), and it never determines *whether* a market is shown — only
// which real records are tried first. If a farmer's state isn't listed
// here, the fallback simply queries any other state without a preference,
// rather than guessing.
const STATE_NEIGHBORS: Record<string, string[]> = {
  "Andhra Pradesh": ["Telangana", "Odisha", "Chhattisgarh", "Karnataka", "Tamil Nadu"],
  "Arunachal Pradesh": ["Assam", "Nagaland"],
  Assam: ["Arunachal Pradesh", "Nagaland", "Manipur", "Mizoram", "Tripura", "Meghalaya", "West Bengal"],
  Bihar: ["Uttar Pradesh", "Jharkhand", "West Bengal"],
  Chhattisgarh: ["Madhya Pradesh", "Maharashtra", "Telangana", "Andhra Pradesh", "Odisha", "Jharkhand", "Uttar Pradesh"],
  Goa: ["Maharashtra", "Karnataka"],
  Gujarat: ["Rajasthan", "Madhya Pradesh", "Maharashtra"],
  Haryana: ["Punjab", "Himachal Pradesh", "Uttar Pradesh", "Rajasthan", "Delhi"],
  "Himachal Pradesh": ["Jammu and Kashmir", "Punjab", "Haryana", "Uttarakhand"],
  Jharkhand: ["Bihar", "West Bengal", "Odisha", "Chhattisgarh", "Uttar Pradesh"],
  Karnataka: ["Goa", "Maharashtra", "Telangana", "Andhra Pradesh", "Tamil Nadu", "Kerala"],
  Kerala: ["Karnataka", "Tamil Nadu"],
  "Madhya Pradesh": ["Uttar Pradesh", "Chhattisgarh", "Maharashtra", "Gujarat", "Rajasthan"],
  Maharashtra: ["Gujarat", "Madhya Pradesh", "Chhattisgarh", "Telangana", "Karnataka", "Goa"],
  Manipur: ["Nagaland", "Mizoram", "Assam"],
  Meghalaya: ["Assam"],
  Mizoram: ["Assam", "Manipur", "Tripura"],
  Nagaland: ["Assam", "Manipur", "Arunachal Pradesh"],
  Odisha: ["West Bengal", "Jharkhand", "Chhattisgarh", "Andhra Pradesh"],
  Punjab: ["Jammu and Kashmir", "Himachal Pradesh", "Haryana", "Rajasthan"],
  Rajasthan: ["Punjab", "Haryana", "Uttar Pradesh", "Madhya Pradesh", "Gujarat"],
  Sikkim: ["West Bengal"],
  "Tamil Nadu": ["Kerala", "Karnataka", "Andhra Pradesh"],
  Telangana: ["Maharashtra", "Chhattisgarh", "Andhra Pradesh", "Karnataka"],
  Tripura: ["Assam", "Mizoram"],
  "Uttar Pradesh": ["Uttarakhand", "Himachal Pradesh", "Haryana", "Rajasthan", "Madhya Pradesh", "Chhattisgarh", "Jharkhand", "Bihar"],
  Uttarakhand: ["Himachal Pradesh", "Uttar Pradesh"],
  "West Bengal": ["Odisha", "Jharkhand", "Bihar", "Sikkim", "Assam"],
};

/** Returns the real neighboring states for a given state, or [] if unlisted. */
export function getNeighboringStates(state: string): string[] {
  return STATE_NEIGHBORS[state] ?? [];
}
