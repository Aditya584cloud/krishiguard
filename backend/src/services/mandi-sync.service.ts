import { prisma } from "../lib/prisma.js";

const MANDI_API_URL =
  "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

const PAGE_SIZE = 1000;
const REQUEST_TIMEOUT_MS = 15000;

const MAX_PAGES = 500;

type MandiRecord = {
  state?: unknown;
  district?: unknown;
  market?: unknown;
  commodity?: unknown;
  arrival_date?: unknown;
  min_price?: unknown;
  max_price?: unknown;
  modal_price?: unknown;
};

type MandiApiResponse = {
  total?: number;
  count?: number;
  records?: MandiRecord[];
};

function parseArrivalDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (match) {
    const [, day, month, year] = match;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const iso = new Date(value);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asFinitePositiveNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

interface ValidatedRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  arrivalDate: Date;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
}

function validateRecord(record: MandiRecord): ValidatedRecord | null {
  const state = asNonEmptyString(record.state);
  const district = asNonEmptyString(record.district);
  const market = asNonEmptyString(record.market);
  const commodity = asNonEmptyString(record.commodity);
  const arrivalDate = parseArrivalDate(record.arrival_date);
  const minPrice = asFinitePositiveNumber(record.min_price);
  const maxPrice = asFinitePositiveNumber(record.max_price);
  const modalPrice = asFinitePositiveNumber(record.modal_price);

  if (
    !state || !district || !market || !commodity || !arrivalDate ||
    minPrice === null || maxPrice === null || modalPrice === null
  ) {
    return null;
  }

  return { state, district, market, commodity, arrivalDate, minPrice, maxPrice, modalPrice };
}

async function fetchPage(apiKey: string, offset: number, limit: number): Promise<MandiApiResponse> {
  const url = new URL(MANDI_API_URL);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Mandi API request failed with status ${response.status}`);
  }

  const data = (await response.json()) as MandiApiResponse;

  if (!Array.isArray(data.records)) {
    throw new Error("Mandi API returned an unexpected response shape");
  }

  return data;
}

export interface MandiSyncResult {
  success: boolean;
  pages: number;
  fetched: number;
  upserted: number;
  skippedMalformed: number;
  error?: string;
}

export async function syncMandiPrices(): Promise<MandiSyncResult> {
  const apiKey = process.env.DATA_GOV_API_KEY;

  if (!apiKey) {
    const error = "DATA_GOV_API_KEY is not configured — skipping mandi sync";
    console.warn(`Mandi sync: ${error}`);
    return { success: false, pages: 0, fetched: 0, upserted: 0, skippedMalformed: 0, error };
  }

  console.log("Mandi sync: started");

  let offset = 0;
  let pages = 0;
  let fetched = 0;
  let upserted = 0;
  let skippedMalformed = 0;

  try {
    while (pages < MAX_PAGES) {
      const page = await fetchPage(apiKey, offset, PAGE_SIZE);
      pages += 1;

      const records = page.records ?? [];
      fetched += records.length;

      for (const record of records) {
        const valid = validateRecord(record);
        if (!valid) {
          skippedMalformed += 1;
          continue;
        }

        await prisma.mandiPrice.upsert({
          where: {
            state_district_market_commodity_arrivalDate: {
              state: valid.state,
              district: valid.district,
              market: valid.market,
              commodity: valid.commodity,
              arrivalDate: valid.arrivalDate,
            },
          },
          create: valid,
          update: {
            minPrice: valid.minPrice,
            maxPrice: valid.maxPrice,
            modalPrice: valid.modalPrice,
            fetchedAt: new Date(),
          },
        });
        upserted += 1;
      }

      if (records.length < PAGE_SIZE) break;

      offset += PAGE_SIZE;
    }

    console.log(
      `Mandi sync: completed. pages=${pages} fetched=${fetched} upserted=${upserted} skippedMalformed=${skippedMalformed}`,
    );
    return { success: true, pages, fetched, upserted, skippedMalformed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(
      `Mandi sync: failed after ${pages} page(s) (${upserted} record(s) upserted before failure). Previously stored data is unchanged. Reason:`,
      error,
    );
    return { success: false, pages, fetched, upserted, skippedMalformed, error: message };
  }
}
