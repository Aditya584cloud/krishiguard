import type { MarketPriceInput } from "../schemas/market.schema.js";
import { getFarmerById } from "./farmer.service.js";
import { prisma } from "../lib/prisma.js";
import { toMandiCommodity } from "./market.commodity-map.js";
import { getNeighboringStates } from "./market.state-neighbors.js";

type MarketFarmer = {
  district: string;
  state: string;
};

const OTHER_MARKETS_LIMIT = 10;

export interface MarketPriceSignal {
  scope: "DISTRICT" | "STATE" | "OTHER_MARKETS" | "NO_DATA";
  message: string;
  markets: Array<{
    state: string;
    market: string;
    district: string;
    commodity: string;
    arrivalDate: string;
    minPrice: number;
    maxPrice: number;
    modalPrice: number;
  }>;
  comparison: {
    highestPrice: number;
    highestPriceMarket: string;
    lowestPrice: number;
    lowestPriceMarket: string;
    averagePrice: number;
  } | null;
  priceChangePercent: number | null;
  priceChangeBasis: string | null;
  dataSource: "DATA_GOV_IN";
}

type StoredMandiRecord = {
  state: string;
  market: string;
  district: string;
  commodity: string;
  arrivalDate: Date;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
};

const RECORD_SELECT = {
  state: true,
  market: true,
  district: true,
  commodity: true,
  arrivalDate: true,
  minPrice: true,
  maxPrice: true,
  modalPrice: true,
} as const;

function computePriceChangeSignal(
  markets: MarketPriceSignal["markets"],
): { priceChangePercent: number | null; priceChangeBasis: string | null } {
  const byDate = new Map<string, number[]>();

  for (const item of markets) {
    const bucket = byDate.get(item.arrivalDate) ?? [];
    bucket.push(item.modalPrice);
    byDate.set(item.arrivalDate, bucket);
  }

  const dates = [...byDate.keys()].sort();
  if (dates.length < 2) {
    return { priceChangePercent: null, priceChangeBasis: null };
  }

  const latestDate = dates[dates.length - 1]!;
  const latestPrices = byDate.get(latestDate)!;
  const olderPrices = dates
    .slice(0, -1)
    .flatMap((date) => byDate.get(date) ?? []);

  const avg = (values: number[]) =>
    values.reduce((sum, v) => sum + v, 0) / values.length;

  const currentAvg = avg(latestPrices);
  const referenceAvg = avg(olderPrices);

  if (referenceAvg <= 0) {
    return { priceChangePercent: null, priceChangeBasis: null };
  }

  const priceChangePercent =
    Math.round(((currentAvg - referenceAvg) / referenceAvg) * 1000) / 10;

  return {
    priceChangePercent,
    priceChangeBasis: `Latest synchronized arrival date (${latestDate}) vs. average of ${dates.length - 1} earlier synchronized date(s) for the same commodity/scope.`,
  };
}

async function queryStoredRecords(
  state: string,
  district: string | null,
  commodity: string,
): Promise<StoredMandiRecord[]> {
  return prisma.mandiPrice.findMany({
    where: {
      state,
      commodity,
      ...(district ? { district } : {}),
    },
    orderBy: { arrivalDate: "desc" },
    select: RECORD_SELECT,
  });
}

async function queryOtherStateRecords(
  farmerState: string,
  commodity: string,
  limit: number,
): Promise<StoredMandiRecord[]> {
  const neighbors = getNeighboringStates(farmerState);

  const neighborRecords = neighbors.length
    ? await prisma.mandiPrice.findMany({
        where: { state: { in: neighbors }, commodity },
        orderBy: { arrivalDate: "desc" },
        select: RECORD_SELECT,
        take: limit,
      })
    : [];

  if (neighborRecords.length >= limit) {
    return neighborRecords;
  }

  const excludedStates = [farmerState, ...neighbors];
  const otherRecords = await prisma.mandiPrice.findMany({
    where: { state: { notIn: excludedStates }, commodity },
    orderBy: { arrivalDate: "desc" },
    select: RECORD_SELECT,
    take: limit - neighborRecords.length,
  });

  return [...neighborRecords, ...otherRecords];
}

export async function getMarketSignal(
  farmer: MarketFarmer,
  crop: string,
): Promise<MarketPriceSignal> {
  const commodity = toMandiCommodity(crop);

  let records = await queryStoredRecords(farmer.state, farmer.district, commodity);
  let scope: "DISTRICT" | "STATE" | "OTHER_MARKETS" = "DISTRICT";

  if (records.length === 0) {
    records = await queryStoredRecords(farmer.state, null, commodity);
    scope = "STATE";
  }

  if (records.length === 0) {
    records = await queryOtherStateRecords(farmer.state, commodity, OTHER_MARKETS_LIMIT);
    scope = "OTHER_MARKETS";
  }

  if (records.length === 0) {
    return {
      scope: "NO_DATA",
      message: `No synchronized mandi prices found for ${crop} in ${farmer.district}, ${farmer.state}, or any other state.`,
      markets: [],
      comparison: null,
      priceChangePercent: null,
      priceChangeBasis: null,
      dataSource: "DATA_GOV_IN",
    };
  }

  const markets = records.map((r) => ({
    state: r.state,
    market: r.market,
    district: r.district,
    commodity: r.commodity,
    arrivalDate: r.arrivalDate.toISOString().slice(0, 10),
    minPrice: r.minPrice,
    maxPrice: r.maxPrice,
    modalPrice: r.modalPrice,
  }));

  const sortedByPrice = [...markets].sort((a, b) => b.modalPrice - a.modalPrice);
  const highestPrice = sortedByPrice[0]!;
  const lowestPrice = sortedByPrice[sortedByPrice.length - 1]!;
  const averagePrice =
    markets.reduce((sum, item) => sum + item.modalPrice, 0) / markets.length;

  const { priceChangePercent, priceChangeBasis } =
    scope === "OTHER_MARKETS"
      ? { priceChangePercent: null, priceChangeBasis: null }
      : computePriceChangeSignal(markets);

  const messages: Record<typeof scope, string> = {
    DISTRICT: `Showing synchronized mandi prices from ${farmer.district}.`,
    STATE: `No mandi prices found in ${farmer.district}. Showing synchronized ${crop} prices from other markets in ${farmer.state}.`,
    OTHER_MARKETS: `No mandi prices found for ${crop} anywhere in ${farmer.state}. Showing real prices from other markets outside the state — these are not local prices.`,
  };

  return {
    scope,
    message: messages[scope],
    markets,
    comparison: {
      highestPrice: highestPrice.modalPrice,
      highestPriceMarket: highestPrice.market,
      lowestPrice: lowestPrice.modalPrice,
      lowestPriceMarket: lowestPrice.market,
      averagePrice,
    },
    priceChangePercent,
    priceChangeBasis,
    dataSource: "DATA_GOV_IN",
  };
}

export const getMarketComparison = async (data: MarketPriceInput) => {
  const farmer = await getFarmerById(data.farmerId);

  if (!farmer) {
    throw new Error("Farmer not found");
  }

  const crop = data.crop ?? farmer.primaryCrop;
  const signal = await getMarketSignal(farmer, crop);

  return {
    farmer: {
      id: farmer.id,
      name: farmer.name,
      village: farmer.village,
      district: farmer.district,
      state: farmer.state,
    },
    crop,
    ...signal,
  };
};
