import { syncMandiPrices } from "./mandi-sync.service.js";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export async function runSyncSafely(): Promise<void> {
  try {
    await syncMandiPrices();
  } catch (error) {
    console.error("Mandi scheduler: unexpected error during sync", error);
  }
}

export function startMandiScheduler(): void {
  void runSyncSafely();
  setInterval(() => void runSyncSafely(), TWO_HOURS_MS);
}
