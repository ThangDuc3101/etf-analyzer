# ETF Analyzer

A Next.js web app for looking up ETF price and composition data via the [Alpha Vantage](https://www.alphavantage.co/) API.

## Getting started

1. Copy `.env.example` to `.env.local` and add your [Alpha Vantage API key](https://www.alphavantage.co/support/#api-key):

   ```bash
   cp .env.example .env.local
   ```

2. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) and search for an ETF symbol (e.g. `QQQ`).

## Project structure

- `src/app/page.tsx` — search UI
- `src/app/api/etf/[symbol]/route.ts` — API route wrapping the Alpha Vantage client
- `src/lib/alpha-vantage.ts` — typed Alpha Vantage client (`ETF_PROFILE`, `GLOBAL_QUOTE`)

## Agent-facing docs

See `AGENTS.md` and `docs/agents/` for how coding agents should work in this repo (issue tracker, domain docs conventions).
