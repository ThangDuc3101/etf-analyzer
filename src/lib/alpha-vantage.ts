/**
 * Thin client for the Alpha Vantage REST API (https://www.alphavantage.co/documentation/).
 *
 * Alpha Vantage always responds 200 OK, even on errors — it signals problems via
 * the JSON body ("Error Message" for a bad symbol, "Note" / "Information" for rate
 * limiting). `request()` normalizes all of those into thrown errors so callers only
 * ever deal with the happy path.
 */

const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query";

export class AlphaVantageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlphaVantageError";
  }
}

function getApiKey(): string {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new AlphaVantageError(
      "ALPHA_VANTAGE_API_KEY is not set. Copy .env.example to .env.local and add your key.",
    );
  }
  return apiKey;
}

async function request<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(ALPHA_VANTAGE_BASE_URL);
  url.searchParams.set("apikey", getApiKey());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new AlphaVantageError(
      `Alpha Vantage request failed with status ${response.status}`,
    );
  }

  const body = (await response.json()) as Record<string, unknown>;

  if (typeof body["Error Message"] === "string") {
    throw new AlphaVantageError(body["Error Message"]);
  }
  // Rate limiting and other soft errors come back as 200s with a "Note" or
  // "Information" field instead of the requested data.
  if (typeof body["Note"] === "string") {
    throw new AlphaVantageError(body["Note"]);
  }
  if (typeof body["Information"] === "string") {
    throw new AlphaVantageError(body["Information"]);
  }

  return body as T;
}

export interface EtfSectorWeight {
  sector: string;
  weight: string;
}

export interface EtfHolding {
  symbol: string;
  description: string;
  weight: string;
}

export interface EtfProfile {
  symbol: string;
  net_assets: string;
  net_expense_ratio: string;
  portfolio_turnover: string;
  dividend_yield: string;
  inception_date: string;
  sectors: EtfSectorWeight[];
  holdings: EtfHolding[];
}

/** `function=ETF_PROFILE` — composition, expense ratio, and top holdings for an ETF symbol. */
export async function getEtfProfile(symbol: string): Promise<EtfProfile> {
  return request<EtfProfile>({ function: "ETF_PROFILE", symbol });
}

export interface GlobalQuote {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  latestTradingDay: string;
}

interface RawGlobalQuoteResponse {
  "Global Quote": {
    "01. symbol": string;
    "05. price": string;
    "09. change": string;
    "10. change percent": string;
    "07. latest trading day": string;
  };
}

/** `function=GLOBAL_QUOTE` — latest price snapshot for a symbol. */
export async function getGlobalQuote(symbol: string): Promise<GlobalQuote> {
  const raw = await request<RawGlobalQuoteResponse>({
    function: "GLOBAL_QUOTE",
    symbol,
  });
  const quote = raw["Global Quote"];
  if (!quote || !quote["01. symbol"]) {
    throw new AlphaVantageError(`No quote found for symbol "${symbol}"`);
  }
  return {
    symbol: quote["01. symbol"],
    price: quote["05. price"],
    change: quote["09. change"],
    changePercent: quote["10. change percent"],
    latestTradingDay: quote["07. latest trading day"],
  };
}
