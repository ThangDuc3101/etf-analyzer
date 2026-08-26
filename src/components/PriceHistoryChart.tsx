"use client";

import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";

export interface PricePoint {
  date: string; // ISO yyyy-mm-dd
  close: number;
}

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 24, left: 16 };

function buildLinePath(
  values: (number | null)[],
  toCoord: (index: number, value: number) => { x: number; y: number },
): string {
  let path = "";
  let drawing = false;
  values.forEach((value, i) => {
    if (value === null) {
      drawing = false;
      return;
    }
    const { x, y } = toCoord(i, value);
    path += `${drawing ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)} `;
    drawing = true;
  });
  return path.trim();
}

/**
 * A daily close-price line chart with optional SMA overlays. One series
 * (price only) needs no legend box — the title names it; with SMAs added,
 * a legend keys each line by the fixed categorical color order.
 */
export function PriceHistoryChart({
  points,
  sma20,
  sma50,
  currency,
}: {
  points: PricePoint[];
  sma20?: (number | null)[];
  sma50?: (number | null)[];
  currency: "USD" | "VND";
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const { pricePath, sma20Path, sma50Path, coords, minClose, maxClose } = useMemo(() => {
    if (points.length === 0) {
      return {
        pricePath: "",
        sma20Path: "",
        sma50Path: "",
        coords: [] as { x: number; y: number }[],
        minClose: 0,
        maxClose: 0,
      };
    }
    const closes = points.map((p) => p.close);
    const smaValues = [...(sma20 ?? []), ...(sma50 ?? [])].filter(
      (v): v is number => v !== null && v !== undefined,
    );
    const allValues = [...closes, ...smaValues];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    // Pad the domain a little so lines don't hug the top/bottom edge.
    const domainPad = (max - min) * 0.1 || max * 0.05 || 1;
    const domainMin = min - domainPad;
    const domainMax = max + domainPad;
    const xStep = points.length > 1 ? plotWidth / (points.length - 1) : 0;

    const toCoord = (i: number, value: number) => ({
      x: PADDING.left + i * xStep,
      y:
        PADDING.top +
        plotHeight -
        ((value - domainMin) / (domainMax - domainMin)) * plotHeight,
    });

    const coords = closes.map((close, i) => toCoord(i, close));

    return {
      pricePath: buildLinePath(closes, toCoord),
      sma20Path: sma20 ? buildLinePath(sma20, toCoord) : "",
      sma50Path: sma50 ? buildLinePath(sma50, toCoord) : "",
      coords,
      minClose: Math.min(...closes),
      maxClose: Math.max(...closes),
    };
  }, [points, sma20, sma50, plotWidth, plotHeight]);

  if (points.length === 0) {
    return null;
  }

  const last = points[points.length - 1];
  const lastCoord = coords[coords.length - 1];
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hoveredCoord = hoverIndex !== null ? coords[hoverIndex] : null;
  const hoveredSma20 = hoverIndex !== null ? sma20?.[hoverIndex] ?? null : null;
  const hoveredSma50 = hoverIndex !== null ? sma50?.[hoverIndex] ?? null : null;
  const showLegend = Boolean(sma20?.some((v) => v !== null) || sma50?.some((v) => v !== null));

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const xStep = points.length > 1 ? plotWidth / (points.length - 1) : 0;
    if (xStep === 0) {
      setHoverIndex(0);
      return;
    }
    const index = Math.round((relativeX - PADDING.left) / xStep);
    setHoverIndex(Math.min(Math.max(index, 0), points.length - 1));
  }

  const formatPrice = (value: number) =>
    currency === "VND" ? `${value.toLocaleString("en-US")}₫` : `$${value.toLocaleString("en-US")}`;

  return (
    <div className="etf-price-chart relative">
      <style>{`
        .etf-price-chart {
          --surface-1: #fcfcfb;
          --text-secondary: #52514e;
          --text-muted: #898781;
          --grid: #e1e0d9;
          --series-1: #2a78d6;
          --series-2: #eb6834;
          --series-3: #1baf7a;
        }
        @media (prefers-color-scheme: dark) {
          .etf-price-chart {
            --surface-1: #1a1a19;
            --text-secondary: #c3c2b7;
            --text-muted: #898781;
            --grid: #2c2c2a;
            --series-1: #3987e5;
            --series-2: #d95926;
            --series-3: #199e70;
          }
        }
      `}</style>

      {showLegend && (
        <div className="mb-1 flex gap-4 text-xs text-[var(--text-secondary)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ backgroundColor: "var(--series-1)" }} />
            Giá
          </span>
          {sma20 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4" style={{ backgroundColor: "var(--series-2)" }} />
              SMA20
            </span>
          )}
          {sma50 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4" style={{ backgroundColor: "var(--series-3)" }} />
              SMA50
            </span>
          )}
        </div>
      )}

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
        role="img"
        aria-label={`Lịch sử giá từ ${points[0].date} đến ${last.date}, dao động từ ${formatPrice(minClose)} đến ${formatPrice(maxClose)}`}
      >
        {/* Reference gridlines, hairline, recessive */}
        <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={PADDING.top} y2={PADDING.top} stroke="var(--grid)" strokeWidth={1} />
        <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={HEIGHT - PADDING.bottom} y2={HEIGHT - PADDING.bottom} stroke="var(--grid)" strokeWidth={1} />

        {/* Crosshair */}
        {hoveredCoord && (
          <line x1={hoveredCoord.x} x2={hoveredCoord.x} y1={PADDING.top} y2={HEIGHT - PADDING.bottom} stroke="var(--grid)" strokeWidth={1} />
        )}

        {/* SMA overlays drawn under the price line */}
        {sma50Path && (
          <path d={sma50Path} fill="none" stroke="var(--series-3)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {sma20Path && (
          <path d={sma20Path} fill="none" stroke="var(--series-2)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* The price line, on top */}
        <path d={pricePath} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* End marker: >=8px, surface ring */}
        <circle cx={lastCoord.x} cy={lastCoord.y} r={5} fill="var(--surface-1)" />
        <circle cx={lastCoord.x} cy={lastCoord.y} r={4} fill="var(--series-1)" />

        {/* Hover markers */}
        {hoveredCoord && (
          <>
            <circle cx={hoveredCoord.x} cy={hoveredCoord.y} r={5} fill="var(--surface-1)" />
            <circle cx={hoveredCoord.x} cy={hoveredCoord.y} r={4} fill="var(--series-1)" />
          </>
        )}

        {/* Direct end-label: value at the line's end, text token (not series color) */}
        <text x={lastCoord.x} y={lastCoord.y - 10} textAnchor="end" fontSize={11} fill="var(--text-secondary)">
          {formatPrice(last.close)}
        </text>

        {/* Axis: first/last date */}
        <text x={PADDING.left} y={HEIGHT - 6} fontSize={10} fill="var(--text-muted)">
          {points[0].date}
        </text>
        <text x={WIDTH - PADDING.right} y={HEIGHT - 6} textAnchor="end" fontSize={10} fill="var(--text-muted)">
          {last.date}
        </text>
      </svg>

      {hovered && hoveredCoord && (
        <div
          className="pointer-events-none absolute rounded border border-gray-200 bg-white px-2 py-1 text-xs shadow-sm dark:border-gray-700 dark:bg-gray-900"
          style={{
            left: `${(hoveredCoord.x / WIDTH) * 100}%`,
            top: `${(hoveredCoord.y / HEIGHT) * 100}%`,
            transform: "translate(-50%, -130%)",
          }}
        >
          <div className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(hovered.close)}</div>
          {hoveredSma20 !== null && (
            <div className="text-gray-500">SMA20: {formatPrice(hoveredSma20)}</div>
          )}
          {hoveredSma50 !== null && (
            <div className="text-gray-500">SMA50: {formatPrice(hoveredSma50)}</div>
          )}
          <div className="text-gray-500">{hovered.date}</div>
        </div>
      )}
    </div>
  );
}
