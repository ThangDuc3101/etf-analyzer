/**
 * Thin client for the Alpha Vantage REST API (https://www.alphavantage.co/documentation/).
 *
 * Alpha Vantage always responds 200 OK, even on errors — it signals problems via
 * the JSON body ("Error Message" for a bad symbol, "Note" / "Information" for rate
 * limiting). `request()` normalizes all of those into thrown errors so callers only
 * ever deal with the happy path.
 */

import { cached } from "./cache";

const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query";

export class AlphaVantageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlphaVantageError";
  }
}

/**
 * A missing/misconfigured API key, as opposed to a symbol Alpha Vantage
 * simply has no data for. Callers that fall back to another data source on
 * `AlphaVantageError` should let this one through instead — falling back
 * here would mask a setup mistake as "symbol not found".
 */
export class AlphaVantageConfigError extends AlphaVantageError {}

function getApiKey(): string {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new AlphaVantageConfigError(
      "ALPHA_VANTAGE_API_KEY is not set. Copy .env.example to .env.local and add your key.",
    );
  }
  return apiKey;
}

/**
 * Alpha Vantage's rate-limit message echoes the caller's own API key back
 * in plain text (e.g. "We have detected your API key as XXXX..."), and that
 * message flows straight into API responses shown to whoever is using this
 * app. Strip it before it leaves this module.
 */
function redactApiKey(message: string): string {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  return apiKey ? message.split(apiKey).join("[REDACTED]") : message;
}

async function request<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(ALPHA_VANTAGE_BASE_URL);
  url.searchParams.set("apikey", getApiKey());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  // `cache: "no-store"` here on purpose: Alpha Vantage always responds 200 OK
  // even for soft errors (rate limiting, bad symbol), so Next's fetch cache
  // can't tell a real result from an error and would otherwise cache the
  // error for the full revalidate window. Callers cache the parsed,
  // validated result instead — see `cachedRequest` below.
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new AlphaVantageError(
      `Alpha Vantage request failed with status ${response.status}`,
    );
  }

  const body = (await response.json()) as Record<string, unknown>;

  if (typeof body["Error Message"] === "string") {
    throw new AlphaVantageError(redactApiKey(body["Error Message"]));
  }
  // Rate limiting and other soft errors come back as 200s with a "Note" or
  // "Information" field instead of the requested data.
  if (typeof body["Note"] === "string") {
    throw new AlphaVantageError(redactApiKey(body["Note"]));
  }
  if (typeof body["Information"] === "string") {
    throw new AlphaVantageError(redactApiKey(body["Information"]));
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
  return cached(["alpha-vantage", "ETF_PROFILE", symbol], async () => {
    const profile = await request<EtfProfile>({
      function: "ETF_PROFILE",
      symbol,
    });
    // Unlike GLOBAL_QUOTE, Alpha Vantage doesn't wrap "no data" in an
    // "Error Message" here — it just responds with `{}`.
    if (!profile.net_assets) {
      throw new AlphaVantageError(`No ETF profile found for symbol "${symbol}"`);
    }
    return profile;
  });
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
  return cached(["alpha-vantage", "GLOBAL_QUOTE", symbol], async () => {
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
  });
}
