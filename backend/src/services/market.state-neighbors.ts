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
