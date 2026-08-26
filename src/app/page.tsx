"use client";

import { useState } from "react";
import type { EtfProfile, GlobalQuote } from "@/lib/alpha-vantage";
import type { VnPricePoint, VnQuote } from "@/lib/vietcap";
import type { TechnicalAnalysis } from "@/lib/technical-analysis";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";

interface EtfLookupResult {
  profile: EtfProfile | null;
  quote: (GlobalQuote | VnQuote) & { currency: "USD" | "VND" };
  priceHistory: VnPricePoint[] | null;
  technicalAnalysis: TechnicalAnalysis | null;
}

const RSI_ZONE_LABEL: Record<TechnicalAnalysis["rsi14"]["zone"], string> = {
  overbought: "Quá mua (>70)",
  oversold: "Quá bán (<30)",
  neutral: "Trung tính",
  unknown: "Chưa đủ dữ liệu",
};

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
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
        throw new Error(data.error ?? "Tra cứu thất bại");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tra cứu thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">ETF Analyzer</h1>
        <p className="text-sm text-gray-500">
          Tra cứu mã ETF để xem giá và cơ cấu danh mục.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="vd. QQQ hoặc E1VFVN30"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "Đang tải…" : "Tìm kiếm"}
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
              ({result.quote.changePercent}) tại phiên{" "}
              {result.quote.latestTradingDay}
            </p>
          </div>

          {result.priceHistory && result.priceHistory.length > 1 && (
            <div>
              <h3 className="text-sm font-medium">
                Lịch sử giá {result.priceHistory.length} ngày
              </h3>
              <PriceHistoryChart
                points={result.priceHistory}
                sma20={result.technicalAnalysis?.sma20}
                sma50={result.technicalAnalysis?.sma50}
                currency={result.quote.currency}
              />
            </div>
          )}

          {result.technicalAnalysis && (
            <div>
              <h3 className="text-sm font-medium">Hiệu suất &amp; rủi ro</h3>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-gray-500">Thay đổi 7 ngày</dt>
                <dd>{formatPercent(result.technicalAnalysis.performance.changePercent7d)}</dd>
                <dt className="text-gray-500">Thay đổi 30 ngày</dt>
                <dd>{formatPercent(result.technicalAnalysis.performance.changePercent30d)}</dd>
                <dt className="text-gray-500">Thay đổi 90 ngày</dt>
                <dd>{formatPercent(result.technicalAnalysis.performance.changePercent90d)}</dd>
                <dt className="text-gray-500">Cao/thấp nhất 90 ngày</dt>
                <dd>
                  {result.technicalAnalysis.performance.periodHigh.toLocaleString("en-US")} /{" "}
                  {result.technicalAnalysis.performance.periodLow.toLocaleString("en-US")}
                </dd>
                <dt className="text-gray-500">Độ biến động (năm hóa)</dt>
                <dd>
                  {result.technicalAnalysis.performance.volatilityPercent === null
                    ? "—"
                    : `${result.technicalAnalysis.performance.volatilityPercent.toFixed(1)}%`}
                </dd>
                <dt className="text-gray-500">Sụt giảm tối đa</dt>
                <dd>{result.technicalAnalysis.performance.maxDrawdownPercent.toFixed(2)}%</dd>
                <dt className="text-gray-500">RSI(14)</dt>
                <dd>
                  {result.technicalAnalysis.rsi14.value === null
                    ? "—"
                    : result.technicalAnalysis.rsi14.value.toFixed(1)}{" "}
                  <span className="text-gray-500">
                    ({RSI_ZONE_LABEL[result.technicalAnalysis.rsi14.zone]})
                  </span>
                </dd>
              </dl>
              <p className="mt-2 text-xs text-gray-400">
                Chỉ số kỹ thuật khách quan tính từ lịch sử giá — không phải khuyến nghị đầu tư.
              </p>
            </div>
          )}

          {result.profile ? (
            <>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-gray-500">Tổng tài sản</dt>
                <dd>{result.profile.net_assets}</dd>
                <dt className="text-gray-500">Tỷ lệ chi phí</dt>
                <dd>{result.profile.net_expense_ratio}</dd>
                <dt className="text-gray-500">Tỷ suất cổ tức</dt>
                <dd>{result.profile.dividend_yield}</dd>
                <dt className="text-gray-500">Ngày thành lập</dt>
                <dd>{result.profile.inception_date}</dd>
              </dl>

              {result.profile.sectors?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium">Nhóm ngành hàng đầu</h3>
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
              Không có dữ liệu cơ cấu danh mục cho mã này.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
