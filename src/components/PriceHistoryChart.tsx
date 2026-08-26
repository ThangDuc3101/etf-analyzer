"use client";

import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";

export interface PricePoint {
  date: string; // ISO yyyy-mm-dd
  close: number;
}

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 24, left: 16 };

/**
 * A single-series daily close-price line chart. No legend box (one series —
 * the title names it); a crosshair + tooltip tracks the pointer, snapping to
 * the nearest trading day, since trading days aren't evenly spaced by
 * calendar date.
 */
export function PriceHistoryChart({
  points,
  currency,
}: {
  points: PricePoint[];
  currency: "USD" | "VND";
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const { path, coords, minClose, maxClose } = useMemo(() => {
    if (points.length === 0) {
      return { path: "", coords: [] as { x: number; y: number }[], minClose: 0, maxClose: 0 };
    }
    const closes = points.map((p) => p.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    // Pad the domain a little so the line doesn't hug the top/bottom edge.
    const domainPad = (max - min) * 0.1 || max * 0.05 || 1;
    const domainMin = min - domainPad;
    const domainMax = max + domainPad;
    const xStep = points.length > 1 ? plotWidth / (points.length - 1) : 0;

    const coords = points.map((p, i) => ({
      x: PADDING.left + i * xStep,
      y:
        PADDING.top +
        plotHeight -
        ((p.close - domainMin) / (domainMax - domainMin)) * plotHeight,
    }));

    const path = coords
      .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
      .join(" ");

    return { path, coords, minClose: min, maxClose: max };
  }, [points, plotWidth, plotHeight]);

  if (points.length === 0) {
    return null;
  }

  const last = points[points.length - 1];
  const lastCoord = coords[coords.length - 1];
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hoveredCoord = hoverIndex !== null ? coords[hoverIndex] : null;

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
        }
        @media (prefers-color-scheme: dark) {
          .etf-price-chart {
            --surface-1: #1a1a19;
            --text-secondary: #c3c2b7;
            --text-muted: #898781;
            --grid: #2c2c2a;
            --series-1: #3987e5;
          }
        }
      `}</style>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
        role="img"
        aria-label={`Price history from ${points[0].date} to ${last.date}, ranging from ${formatPrice(minClose)} to ${formatPrice(maxClose)}`}
      >
        {/* Reference gridlines at min/max, hairline, recessive */}
        <line
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={PADDING.top}
          y2={PADDING.top}
          stroke="var(--grid)"
          strokeWidth={1}
        />
        <line
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={HEIGHT - PADDING.bottom}
          y2={HEIGHT - PADDING.bottom}
          stroke="var(--grid)"
          strokeWidth={1}
        />

        {/* Crosshair */}
        {hoveredCoord && (
          <line
            x1={hoveredCoord.x}
            x2={hoveredCoord.x}
            y1={PADDING.top}
            y2={HEIGHT - PADDING.bottom}
            stroke="var(--grid)"
            strokeWidth={1}
          />
        )}

        {/* The line */}
        <path
          d={path}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* End marker: >=8px, surface ring */}
        <circle cx={lastCoord.x} cy={lastCoord.y} r={5} fill="var(--surface-1)" />
        <circle cx={lastCoord.x} cy={lastCoord.y} r={4} fill="var(--series-1)" />

        {/* Hover marker */}
        {hoveredCoord && (
          <>
            <circle cx={hoveredCoord.x} cy={hoveredCoord.y} r={5} fill="var(--surface-1)" />
            <circle cx={hoveredCoord.x} cy={hoveredCoord.y} r={4} fill="var(--series-1)" />
          </>
        )}

        {/* Direct end-label: value at the line's end, text token (not series color) */}
        <text
          x={lastCoord.x}
          y={lastCoord.y - 10}
          textAnchor="end"
          fontSize={11}
          fill="var(--text-secondary)"
        >
          {formatPrice(last.close)}
        </text>

        {/* Axis: first/last date */}
        <text x={PADDING.left} y={HEIGHT - 6} fontSize={10} fill="var(--text-muted)">
          {points[0].date}
        </text>
        <text
          x={WIDTH - PADDING.right}
          y={HEIGHT - 6}
          textAnchor="end"
          fontSize={10}
          fill="var(--text-muted)"
        >
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
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {formatPrice(hovered.close)}
          </div>
          <div className="text-gray-500">{hovered.date}</div>
        </div>
      )}
    </div>
  );
}
