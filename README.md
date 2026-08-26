# ETF Analyzer

A Next.js web app for looking up ETF price, composition, and technical data.

- **US-listed ETFs** (e.g. `QQQ`, `SPY`, `VOO`) via the [Alpha Vantage](https://www.alphavantage.co/) API — price quote plus composition (net assets, expense ratio, dividend yield, sectors, holdings).
- **Vietnam-listed ETFs** (e.g. `E1VFVN30`) via [Vietcap](https://trading.vietcap.com.vn)'s public trading API, since Alpha Vantage has no HOSE/HNX/UPCOM data. No composition data is available for these — instead you get a 91-day price chart and technical indicators.

## Features

- Symbol search that auto-detects which market to use — no need to pick US vs. VN, or type an exchange suffix.
- Live price quote (USD or VND, shown with the right symbol).
- Composition breakdown for US ETFs: net assets, expense ratio, dividend yield, inception date, top sectors, top holdings.
- For VN-listed lookups: a 91-day price-history chart (hover for a crosshair + tooltip) with SMA20/SMA50 overlays, plus performance & risk stats — 7/30/90-day change, period high/low, annualized volatility, max drawdown, and RSI(14). These are objective indicators computed from price history, not investment advice.

## Getting started

1. Copy `.env.example` to `.env.local` and add your [Alpha Vantage API key](https://www.alphavantage.co/support/#api-key) (free, no card required):

   ```bash
   cp .env.example .env.local
   ```

2. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) and search for a symbol (e.g. `QQQ` or `E1VFVN30`).

### A note on API limits

Alpha Vantage's free tier caps out at **25 requests/day** and **1 request/second**. Each US-symbol lookup uses up to 2 requests (profile + quote); results are cached for an hour per symbol, so repeat searches within that window don't count against the quota. VN-symbol lookups don't hit Alpha Vantage for price data (Vietcap is used instead and has no published rate limit, but also no SLA — it's an unofficial, undocumented API with no API key, the same one community tools like [vnstock](https://github.com/thinh-vu/vnstock) rely on).

## Project structure

- `src/app/page.tsx` — search UI: quote, chart, technical stats, composition
- `src/app/api/etf/[symbol]/route.ts` — API route: tries Alpha Vantage first, falls back to Vietcap for symbols it has no data for
- `src/lib/alpha-vantage.ts` — typed Alpha Vantage client (`ETF_PROFILE`, `GLOBAL_QUOTE`)
- `src/lib/vietcap.ts` — typed Vietcap client (daily price bars → quote + price history) for VN-listed symbols
- `src/lib/technical-analysis.ts` — performance stats, SMA, and RSI computed from price history (via [`trading-signals`](https://github.com/bennycode/trading-signals))
- `src/lib/cache.ts` — shared result cache: caches successful lookups for an hour, never caches errors
- `src/components/PriceHistoryChart.tsx` — the price chart (SVG, no charting library)

## Agent-facing docs

See `AGENTS.md` and `docs/agents/` for how coding agents should work in this repo (issue tracker, domain docs conventions).
