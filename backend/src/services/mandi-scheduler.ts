import { syncMandiPrices } from "./mandi-sync.service.js";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/**
 * Runs syncMandiPrices, guaranteeing it never throws — even if the sync
 * itself has an unexpected bug — so a bad sync can never crash the server.
 * Exported (separately from startMandiScheduler) so it can be tested
 * directly without leaving a live setInterval running after the test.
 */
export async function runSyncSafely(): Promise<void> {
  try {
    // syncMandiPrices already catches its own failures and returns a result
    // object rather than throwing, but this guards the scheduler against
    // any unexpected error so a bad sync can never crash the server.
    await syncMandiPrices();
  } catch (error) {
    console.error("Mandi scheduler: unexpected error during sync", error);
  }
}

/**
 * Starts the in-process mandi sync scheduler: an immediate sync on startup,
 * then every 2 hours. Deliberately not using a job-queue library — a
 * `setInterval` is all a single-process prototype backend needs.
 */
export function startMandiScheduler(): void {
  void runSyncSafely();
  setInterval(() => void runSyncSafely(), TWO_HOURS_MS);
}
