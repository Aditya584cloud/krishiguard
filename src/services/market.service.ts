import type { MarketPriceInput } from "../schemas/market.schema.js";
import { getFarmerById } from "./farmer.service.js";

const MANDI_API_URL =
  "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

type MandiRecord = {
  state: string;
  district: string;
  market: string;
  commodity: string;
  arrival_date: string;
  min_price: string | number;
  max_price: string | number;
  modal_price: string | number;
};

type MandiApiResponse = {
  records?: MandiRecord[];
};

export const getMarketComparison = async (data: MarketPriceInput) => {
  const farmer = await getFarmerById(data.farmerId);

  if (!farmer) {
    throw new Error("Farmer not found");
  }

  const apiKey = process.env.DATA_GOV_API_KEY;

  if (!apiKey) {
    throw new Error("DATA_GOV_API_KEY is not configured");
  }

  const fetchMarketData = async (
    includeDistrict: boolean,
  ): Promise<MandiRecord[]> => {
    const url = new URL(MANDI_API_URL);

    url.searchParams.set("api-key", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "100");

    url.searchParams.set(
      "filters[state.keyword]",
      farmer.state,
    );

    if (includeDistrict) {
      url.searchParams.set(
        "filters[district]",
        farmer.district,
      );
    }

    url.searchParams.set(
      "filters[commodity]",
      data.crop,
    );

    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(
        `Mandi API request failed with status ${response.status}`,
      );
    }

    const result = (await response.json()) as MandiApiResponse;

    return result.records ?? [];
  };

  let records = await fetchMarketData(true);

  let scope: "DISTRICT" | "STATE" = "DISTRICT";

  if (records.length === 0) {
    records = await fetchMarketData(false);
    scope = "STATE";
  }

  if (records.length === 0) {
    return {
      farmer: {
        id: farmer.id,
        name: farmer.name,
        village: farmer.village,
        district: farmer.district,
        state: farmer.state,
      },

      crop: data.crop,

      scope: "NO_DATA",

      message:
        `No mandi prices found for ${data.crop} in ` +
        `${farmer.district}, ${farmer.state}, ` +
        `or elsewhere in the state.`,

      markets: [],

      comparison: null,
    };
  }

  const prices = records.map((item) => ({
    market: item.market,
    district: item.district,
    commodity: item.commodity,
    arrivalDate: item.arrival_date,

    minPrice: Number(item.min_price),
    maxPrice: Number(item.max_price),
    modalPrice: Number(item.modal_price),
  }));

  const validPrices = prices.filter(
    (item) =>
      Number.isFinite(item.minPrice) &&
      Number.isFinite(item.maxPrice) &&
      Number.isFinite(item.modalPrice),
  );

  if (validPrices.length === 0) {
    return {
      farmer: {
        id: farmer.id,
        name: farmer.name,
        village: farmer.village,
        district: farmer.district,
        state: farmer.state,
      },

      crop: data.crop,

      scope: "NO_DATA",

      message:
        `Market records were found for ${data.crop}, ` +
        `but no valid price data was available.`,

      markets: [],

      comparison: null,
    };
  }

  const sortedByPrice = [...validPrices].sort(
    (a, b) => b.modalPrice - a.modalPrice,
  );

  const highestPrice = sortedByPrice[0];
  const lowestPrice = sortedByPrice[sortedByPrice.length - 1];

  if (!highestPrice || !lowestPrice) {
    throw new Error("No market prices available");
  }

  const averagePrice =
    validPrices.reduce(
      (sum, item) => sum + item.modalPrice,
      0,
    ) / validPrices.length;

  return {
    farmer: {
      id: farmer.id,
      name: farmer.name,
      village: farmer.village,
      district: farmer.district,
      state: farmer.state,
    },

    crop: data.crop,

  
    scope,

    message:
      scope === "DISTRICT"
        ? `Showing mandi prices from ${farmer.district}.`
        : `No mandi prices found in ${farmer.district}. Showing available ${data.crop} prices from other markets in ${farmer.state}.`,

    markets: validPrices,

    comparison: {
      highestPrice: highestPrice.modalPrice,
      highestPriceMarket: highestPrice.market,

      lowestPrice: lowestPrice.modalPrice,
      lowestPriceMarket: lowestPrice.market,

      averagePrice,
    },
  };
};