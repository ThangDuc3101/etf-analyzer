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
    const [profile, quote] = await Promise.all([
      getEtfProfile(upperSymbol),
      getGlobalQuote(upperSymbol),
    ]);
    return NextResponse.json({ profile, quote });
  } catch (error) {
    if (error instanceof AlphaVantageError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
