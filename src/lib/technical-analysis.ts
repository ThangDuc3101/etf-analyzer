/**
 * Derived statistics and technical indicators computed from a series of
 * daily close prices — no extra API calls, since we already fetch this
 * history for the price chart (see vietcap.ts's `getVnPriceHistory`).
 *
 * These are standard, objective technical-analysis formulas (moving
 * averages, RSI, drawdown, realized volatility) — not a recommendation
 * engine. This module never emits a buy/sell signal; it reports numbers and
 * lets the reader interpret them.
 */

import { RSI, SMA } from "trading-signals";

export interface PerformanceStats {
  changePercent7d: number | null;
  changePercent30d: number | null;
  changePercent90d: number | null;
  periodHigh: number;
  periodLow: number;
  /** Annualized volatility (%) from the standard deviation of daily returns. */
  volatilityPercent: number | null;
  /** Largest peak-to-trough decline (%) within the period. */
  maxDrawdownPercent: number;
}

function percentChange(from: number, to: number): number {
  return ((to - from) / from) * 100;
}

/** `closes` must be ordered oldest first (as returned by `getVnPriceHistory`). */
export function computePerformanceStats(closes: number[]): PerformanceStats {
  const latest = closes[closes.length - 1];

  const changeOverLastNDays = (days: number): number | null => {
    const index = closes.length - 1 - days;
    if (index < 0) return null;
    return percentChange(closes[index], latest);
  };

  const dailyReturns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  let volatilityPercent: number | null = null;
  if (dailyReturns.length > 1) {
    const mean = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) /
      (dailyReturns.length - 1);
    // Annualized from daily std dev, ~252 trading days/year — the standard convention.
    volatilityPercent = Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  let peak = closes[0];
  let maxDrawdown = 0;
  for (const price of closes) {
    peak = Math.max(peak, price);
    maxDrawdown = Math.min(maxDrawdown, percentChange(peak, price));
  }

  return {
    changePercent7d: changeOverLastNDays(7),
    changePercent30d: changeOverLastNDays(30),
    changePercent90d: changeOverLastNDays(90),
    periodHigh: Math.max(...closes),
    periodLow: Math.min(...closes),
    volatilityPercent,
    maxDrawdownPercent: maxDrawdown,
  };
}

/**
 * Simple moving average, aligned to `closes` (same length) — `null` for
 * indices before there are `period` prices to average.
 */
export function computeSMA(closes: number[], period: number): (number | null)[] {
  const sma = new SMA(period);
  return closes.map((price) => sma.update(price, false));
}

export interface RsiResult {
  /** Latest RSI(interval) value, or null if there isn't enough history yet. */
  value: number | null;
  zone: "overbought" | "oversold" | "neutral" | "unknown";
}

export interface TechnicalAnalysis {
  performance: PerformanceStats;
  rsi14: RsiResult;
  sma20: (number | null)[];
  sma50: (number | null)[];
}

/** Relative Strength Index — a momentum oscillator, 0-100. >70 conventionally "overbought", <30 "oversold". */
export function computeRSI(closes: number[], interval = 14): RsiResult {
  const rsi = new RSI(interval);
  let value: number | null = null;
  for (const price of closes) {
    value = rsi.update(price, false);
  }
  if (value === null) return { value: null, zone: "unknown" };
  const zone = value > 70 ? "overbought" : value < 30 ? "oversold" : "neutral";
  return { value, zone };
}
