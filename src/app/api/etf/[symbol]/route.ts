import { NextResponse } from "next/server";
import {
  AlphaVantageConfigError,
  AlphaVantageError,
  getEtfProfile,
  getGlobalQuote,
  type EtfProfile,
  type GlobalQuote,
} from "@/lib/alpha-vantage";
import { getVnQuote, stripVnSuffix, VietcapError, type VnQuote } from "@/lib/vietcap";

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
  try {
    quote = { ...(await getGlobalQuote(upperSymbol)), currency: "USD" };
  } catch (error) {
    if (error instanceof AlphaVantageConfigError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (!(error instanceof AlphaVantageError)) throw error;

    // Not found on Alpha Vantage — fall back to Vietcap's public API for
    // Vietnam-listed symbols (e.g. the ETF "E1VFVN30" on HOSE).
    try {
      quote = { ...(await getVnQuote(stripVnSuffix(upperSymbol))), currency: "VND" };
    } catch (vnError) {
      if (!(vnError instanceof VietcapError)) throw vnError;
      return NextResponse.json({ error: vnError.message }, { status: 502 });
    }
  }

  return NextResponse.json({ profile, quote });
}
