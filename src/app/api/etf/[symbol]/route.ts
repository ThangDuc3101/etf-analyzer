import { NextResponse } from "next/server";
import {
  AlphaVantageConfigError,
  AlphaVantageError,
  getEtfProfile,
  getGlobalQuote,
  type EtfProfile,
  type GlobalQuote,
} from "@/lib/alpha-vantage";
import {
  getVnPriceHistory,
  getVnQuote,
  stripVnSuffix,
  VietcapError,
  type VnPricePoint,
  type VnQuote,
} from "@/lib/vietcap";
import {
  computePerformanceStats,
  computeRSI,
  computeSMA,
  type TechnicalAnalysis,
} from "@/lib/technical-analysis";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  // Alpha Vantage has no data for Vietnam-listed instruments (HOSE/HNX/
  // UPCOM), so its profile lookup is best-effort: a miss there just means
  // "no composition data available", not a failed request overall.
  let profile: EtfProfile | null = null;
  try {
    profile = await getEtfProfile(upperSymbol);
  } catch (error) {
    if (!(error instanceof AlphaVantageError)) throw error;
    if (error instanceof AlphaVantageConfigError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    // else: no profile data for this symbol — leave `profile` as null.
  }

  // Alpha Vantage's free tier caps requests at 1/second. Firing the profile
  // and quote calls back to back routinely trips that limit, so we leave a
  // small gap before the second one.
  await new Promise((resolve) => setTimeout(resolve, 1100));

  let quote: (GlobalQuote | VnQuote) & { currency: "USD" | "VND" };
  let priceHistory: VnPricePoint[] | null = null;
  let technicalAnalysis: TechnicalAnalysis | null = null;
  try {
    quote = { ...(await getGlobalQuote(upperSymbol)), currency: "USD" };
  } catch (error) {
    if (error instanceof AlphaVantageConfigError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (!(error instanceof AlphaVantageError)) throw error;

    // Not found on Alpha Vantage — fall back to Vietcap's public API for
    // Vietnam-listed symbols (e.g. the ETF "E1VFVN30" on HOSE). Vietcap has
    // no composition data, but it does give us daily price history, which
    // Alpha Vantage's GLOBAL_QUOTE doesn't — so VN lookups get a chart.
    const vnSymbol = stripVnSuffix(upperSymbol);
    try {
      quote = { ...(await getVnQuote(vnSymbol)), currency: "VND" };
      priceHistory = await getVnPriceHistory(vnSymbol);
      const closes = priceHistory.map((point) => point.close);
      technicalAnalysis = {
        performance: computePerformanceStats(closes),
        rsi14: computeRSI(closes, 14),
        sma20: computeSMA(closes, 20),
        sma50: computeSMA(closes, 50),
      };
    } catch (vnError) {
      if (!(vnError instanceof VietcapError)) throw vnError;
      // Neither source has this symbol. Lead with Alpha Vantage's message —
      // if that failure was a rate limit rather than "not found", losing it
      // behind Vietcap's generic "no quote" would hide the real cause.
      return NextResponse.json(
        { error: `${error.message} (Vietcap: ${vnError.message})` },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ profile, quote, priceHistory, technicalAnalysis });
}
