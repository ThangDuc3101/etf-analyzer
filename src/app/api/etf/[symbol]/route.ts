import { NextResponse } from "next/server";
import {
  AlphaVantageError,
  getEtfProfile,
  getGlobalQuote,
} from "@/lib/alpha-vantage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  try {
    // Alpha Vantage's free tier caps requests at 1/second. Firing these two
    // calls in parallel routinely trips that limit, so we run them in
    // sequence with a small gap instead.
    const profile = await getEtfProfile(upperSymbol);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const quote = await getGlobalQuote(upperSymbol);
    return NextResponse.json({ profile, quote });
  } catch (error) {
    if (error instanceof AlphaVantageError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
