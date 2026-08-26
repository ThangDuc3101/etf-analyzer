"use client";

import { useState } from "react";
import type { EtfProfile, GlobalQuote } from "@/lib/alpha-vantage";
import type { VnPricePoint, VnQuote } from "@/lib/vietcap";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";

interface EtfLookupResult {
  profile: EtfProfile | null;
  quote: (GlobalQuote | VnQuote) & { currency: "USD" | "VND" };
  priceHistory: VnPricePoint[] | null;
}

export default function Home() {
  const [symbol, setSymbol] = useState("");
  const [result, setResult] = useState<EtfLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!symbol.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `/api/etf/${encodeURIComponent(symbol.trim())}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Lookup failed");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">ETF Analyzer</h1>
        <p className="text-sm text-gray-500">
          Look up an ETF symbol to see its price and composition.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="e.g. QQQ or E1VFVN30"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "Loading…" : "Search"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="flex flex-col gap-4 rounded border border-gray-200 p-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-medium">{result.quote.symbol}</h2>
            <p className="text-sm text-gray-500">
              {result.quote.currency === "VND"
                ? `${result.quote.price}₫`
                : `$${result.quote.price}`}{" "}
              ({result.quote.changePercent}) as of{" "}
              {result.quote.latestTradingDay}
            </p>
          </div>

          {result.priceHistory && result.priceHistory.length > 1 && (
            <div>
              <h3 className="text-sm font-medium">
                {result.priceHistory.length}-day price history
              </h3>
              <PriceHistoryChart
                points={result.priceHistory}
                currency={result.quote.currency}
              />
            </div>
          )}

          {result.profile ? (
            <>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-gray-500">Net assets</dt>
                <dd>{result.profile.net_assets}</dd>
                <dt className="text-gray-500">Expense ratio</dt>
                <dd>{result.profile.net_expense_ratio}</dd>
                <dt className="text-gray-500">Dividend yield</dt>
                <dd>{result.profile.dividend_yield}</dd>
                <dt className="text-gray-500">Inception date</dt>
                <dd>{result.profile.inception_date}</dd>
              </dl>

              {result.profile.sectors?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium">Top sectors</h3>
                  <ul className="text-sm text-gray-500">
                    {result.profile.sectors.slice(0, 5).map((sector) => (
                      <li key={sector.sector}>
                        {sector.sector} — {sector.weight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              No composition data available for this symbol.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
