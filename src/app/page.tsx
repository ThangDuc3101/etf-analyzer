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

/** Text color for a signed value — green for gains, red for losses. Never the only signal (the +/- sign carries the same meaning). */
function deltaColorClass(value: number): string {
  return value >= 0 ? "text-positive" : "text-negative";
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
      {children}
    </h3>
  );
}

function StatTile({ label, value, valueClassName }: { label: string; value: React.ReactNode; valueClassName?: string }) {
  // `valueClassName` (text-positive/text-negative) fully replaces, rather than
  // combines with, the default gray — a dark: variant of the default and a
  // semantic color class both set `color`, and whichever is later in the
  // generated stylesheet wins regardless of source order in `className`, so
  // mixing them silently drops the semantic color in dark mode.
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className={`text-sm font-semibold ${valueClassName || "text-gray-900 dark:text-gray-100"}`}>
        {value}
      </dd>
    </div>
  );
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

  const changeIsPositive = result ? !result.quote.changePercent.trim().startsWith("-") : true;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ETF Analyzer</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Tra cứu mã ETF để xem giá, biểu đồ và cơ cấu danh mục.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="vd. QQQ hoặc E1VFVN30"
          className="flex-1 rounded-lg border border-gray-300 bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent-soft focus:ring-2 focus:ring-accent-soft/30 dark:border-gray-700"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 dark:text-background"
        >
          {loading && (
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-background/40 dark:border-t-background"
              aria-hidden="true"
            />
          )}
          {loading ? "Đang tải…" : "Tìm kiếm"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg border-l-4 border-negative bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 shadow-sm dark:divide-gray-800 dark:border-gray-800 dark:shadow-none">
          <div className="p-5">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {result.quote.symbol}
            </h2>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-bold tracking-tight tabular-nums">
                {result.quote.currency === "VND"
                  ? `${result.quote.price}₫`
                  : `$${result.quote.price}`}
              </span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  changeIsPositive ? "text-positive" : "text-negative"
                }`}
              >
                {result.quote.changePercent}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tại phiên {result.quote.latestTradingDay}
            </p>
          </div>

          {result.priceHistory && result.priceHistory.length > 1 && (
            <div className="flex flex-col gap-3 p-5">
              <SectionLabel>Lịch sử giá {result.priceHistory.length} ngày</SectionLabel>
              <PriceHistoryChart
                points={result.priceHistory}
                sma20={result.technicalAnalysis?.sma20}
                sma50={result.technicalAnalysis?.sma50}
                currency={result.quote.currency}
              />
            </div>
          )}

          {result.technicalAnalysis && (
            <div className="flex flex-col gap-4 p-5">
              <SectionLabel>Hiệu suất &amp; rủi ro</SectionLabel>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                <StatTile
                  label="Thay đổi 7 ngày"
                  value={formatPercent(result.technicalAnalysis.performance.changePercent7d)}
                  valueClassName={
                    result.technicalAnalysis.performance.changePercent7d === null
                      ? ""
                      : deltaColorClass(result.technicalAnalysis.performance.changePercent7d)
                  }
                />
                <StatTile
                  label="Thay đổi 30 ngày"
                  value={formatPercent(result.technicalAnalysis.performance.changePercent30d)}
                  valueClassName={
                    result.technicalAnalysis.performance.changePercent30d === null
                      ? ""
                      : deltaColorClass(result.technicalAnalysis.performance.changePercent30d)
                  }
                />
                <StatTile
                  label="Thay đổi 90 ngày"
                  value={formatPercent(result.technicalAnalysis.performance.changePercent90d)}
                  valueClassName={
                    result.technicalAnalysis.performance.changePercent90d === null
                      ? ""
                      : deltaColorClass(result.technicalAnalysis.performance.changePercent90d)
                  }
                />
                <StatTile
                  label="Cao/thấp nhất 90 ngày"
                  value={
                    <>
                      {result.technicalAnalysis.performance.periodHigh.toLocaleString("en-US")}
                      {" / "}
                      {result.technicalAnalysis.performance.periodLow.toLocaleString("en-US")}
                    </>
                  }
                />
                <StatTile
                  label="Độ biến động (năm hóa)"
                  value={
                    result.technicalAnalysis.performance.volatilityPercent === null
                      ? "—"
                      : `${result.technicalAnalysis.performance.volatilityPercent.toFixed(1)}%`
                  }
                />
                <StatTile
                  label="Sụt giảm tối đa"
                  value={`${result.technicalAnalysis.performance.maxDrawdownPercent.toFixed(2)}%`}
                  valueClassName="text-negative"
                />
                <StatTile
                  label="RSI(14)"
                  value={
                    <>
                      {result.technicalAnalysis.rsi14.value === null
                        ? "—"
                        : result.technicalAnalysis.rsi14.value.toFixed(1)}{" "}
                      <span className="font-normal text-gray-500 dark:text-gray-400">
                        ({RSI_ZONE_LABEL[result.technicalAnalysis.rsi14.zone]})
                      </span>
                    </>
                  }
                />
              </dl>
              <p className="text-xs text-gray-400">
                Chỉ số kỹ thuật khách quan tính từ lịch sử giá — không phải khuyến nghị đầu tư.
              </p>
            </div>
          )}

          <div className="p-5">
            {result.profile ? (
              <div className="flex flex-col gap-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
                  <StatTile label="Tổng tài sản" value={result.profile.net_assets} />
                  <StatTile label="Tỷ lệ chi phí" value={result.profile.net_expense_ratio} />
                  <StatTile label="Tỷ suất cổ tức" value={result.profile.dividend_yield} />
                  <StatTile label="Ngày thành lập" value={result.profile.inception_date} />
                </dl>

                {result.profile.sectors?.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <SectionLabel>Nhóm ngành hàng đầu</SectionLabel>
                    <ul className="flex flex-col gap-1.5 text-sm">
                      {result.profile.sectors.slice(0, 5).map((sector) => (
                        <li key={sector.sector} className="flex justify-between gap-4">
                          <span className="text-gray-700 dark:text-gray-300">{sector.sector}</span>
                          <span className="font-medium tabular-nums text-gray-500 dark:text-gray-400">
                            {sector.weight}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Không có dữ liệu cơ cấu danh mục cho mã này.
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
