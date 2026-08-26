/**
 * Thin client for Vietcap's (formerly VCI Securities) public trading API
 * (https://trading.vietcap.com.vn) — used to look up price data for
 * instruments listed on Vietnam's exchanges (HOSE, HNX, UPCOM), including
 * domestic ETFs like E1VFVN30 that Alpha Vantage has no data for.
 *
 * There is no official, documented, or free API for Vietnam-listed
 * instruments. This is the undocumented endpoint that community tools like
 * `vnstock` (https://github.com/thinh-vu/vnstock) rely on: no API key, but
 * also no SLA — treat it as more likely to change shape or rate-limit
 * without notice than a vendored API like Alpha Vantage's.
 *
 * Unlike Alpha Vantage, this endpoint has no separate "profile" data
 * (composition, expense ratio) for ETFs — only price history.
 */

import { cached } from "./cache";

const VIETCAP_CHART_URL =
  "https://trading.vietcap.com.vn/api/chart/OHLCChart/gap-chart";

export class VietcapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VietcapError";
  }
}

/** Strips a trailing ".VN" some users type for Vietnam-listed symbols — Vietcap expects the bare ticker (e.g. "E1VFVN30"). */
export function stripVnSuffix(symbol: string): string {
  return symbol.replace(/\.VN$/i, "");
}

export interface VnQuote {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  latestTradingDay: string;
}

interface OhlcChartBars {
  symbol: string;
  c: number[];
  t: string[];
}

async function fetchDailyBars(symbol: string): Promise<OhlcChartBars | undefined> {
  const response = await fetch(VIETCAP_CHART_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      // Vietcap rejects requests with no User-Agent at all; the value itself
      // isn't checked.
      "User-Agent": "Mozilla/5.0 (compatible; etf-analyzer)",
    },
    body: JSON.stringify({
      timeFrame: "ONE_DAY",
      symbols: [symbol],
      to: Math.floor(Date.now() / 1000),
      countBack: 2, // today + previous close, for a change calculation
    }),
  });

  if (!response.ok) {
    throw new VietcapError(
      `Vietcap request failed with status ${response.status}`,
    );
  }

  const body = (await response.json()) as OhlcChartBars[];
  return body[0];
}

/** Latest daily close + change for a HOSE/HNX/UPCOM-listed symbol (stock or ETF). */
export async function getVnQuote(symbol: string): Promise<VnQuote> {
  return cached(["vietcap", "quote", symbol], async () => {
    const bars = await fetchDailyBars(symbol);
    if (!bars || bars.c.length === 0) {
      throw new VietcapError(`No quote found for symbol "${symbol}"`);
    }

    const closes = bars.c;
    const latest = closes[closes.length - 1];
    const previous = closes.length > 1 ? closes[closes.length - 2] : latest;
    const change = latest - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
    const latestTimestampMs = Number(bars.t[bars.t.length - 1]) * 1000;

    return {
      symbol: bars.symbol,
      price: latest.toString(),
      change: change.toFixed(2),
      changePercent: `${changePercent.toFixed(2)}%`,
      latestTradingDay: new Date(latestTimestampMs).toISOString().slice(0, 10),
    };
  });
}
