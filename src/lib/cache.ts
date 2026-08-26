import { unstable_cache } from "next/cache";

/**
 * Caches a successful result for `revalidateSeconds`, keyed by `keyParts`.
 * Because `unstable_cache` only stores what the wrapped thunk *returns*, a
 * thrown error is never cached — the next call retries against the live
 * source instead of replaying the error. This matters for upstreams like
 * Alpha Vantage and Vietcap that report soft errors (rate limits, unknown
 * symbols) inside an otherwise-200 response instead of an HTTP error status.
 */
export function cached<T>(
  keyParts: string[],
  fetchData: () => Promise<T>,
  revalidateSeconds = 3600,
): Promise<T> {
  return unstable_cache(fetchData, keyParts, {
    revalidate: revalidateSeconds,
  })();
}
