import { CoinMeta } from "@polymedia/suitcase-core";
import { CoinMetaFetcher } from "@polymedia/suitcase-core";
import { Coin } from "@account.tech/core";
import { balanceToString } from "@polymedia/suitcase-core";

// Constants for SUI token addresses and defaults
const DEFAULT_DECIMALS = 9;
const FULL_SUI_TYPE = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
const SUI_IDENTIFIER = 'sui::SUI';

// Efficient cache using Map
const coinMetaCache = new Map<string, CoinMeta>();

/**
 * Fast normalization of SUI token addresses to full format
 * @param coinType The coin type address to normalize
 */
function normalizeSuiAddress(coinType: string): string {
  // Quick return if not a SUI token
  if (!coinType.includes(SUI_IDENTIFIER)) return coinType;
  
  // Handle all SUI variants
  return coinType === FULL_SUI_TYPE ? coinType : FULL_SUI_TYPE;
}

/**
 * Gets coin decimals with efficient caching
 * @param coinType The coin type address
 * @param client Optional RPC client
 */
export async function getCoinDecimals(
  coinType: string,
  client?: any
): Promise<number> {
  const normalizedType = normalizeSuiAddress(coinType);
  
  // Fast cache lookup
  const cached = coinMetaCache.get(normalizedType);
  if (cached) return cached.decimals;

  // Fetch metadata if client available
  if (client) {
    try {
      const meta = await new CoinMetaFetcher({ client }).getCoinMeta(normalizedType);
      if (meta) {
        coinMetaCache.set(normalizedType, meta);
        return meta.decimals;
      }
    } catch (error) {
      console.warn(`[getCoinDecimals] Failed to fetch metadata for ${normalizedType}`);
    }
  }

  return DEFAULT_DECIMALS;
}

/**
 * Efficiently gets decimals for multiple coin types
 * @param coinTypes Array of coin type addresses
 * @param client RPC client
 */
export async function getMultipleCoinDecimals(
  coinTypes: string[],
  client: any
): Promise<Map<string, number>> {
  if (!coinTypes.length) return new Map();

  // Pre-allocate result map
  const result = new Map<string, number>();
  
  // Create normalized type mapping and identify unique uncached types
  const normalizedMap = new Map<string, string>();
  const uncachedTypes = new Set<string>();
  
  for (const type of coinTypes) {
    const normalizedType = normalizeSuiAddress(type);
    normalizedMap.set(type, normalizedType);
    
    if (!coinMetaCache.has(normalizedType)) {
      uncachedTypes.add(normalizedType);
    }
  }

  // Bulk fetch uncached metadata
  if (uncachedTypes.size && client) {
    try {
      const metas = await new CoinMetaFetcher({ client })
        .getCoinMetas(Array.from(uncachedTypes));
      
      metas.forEach((meta, type) => {
        if (meta) coinMetaCache.set(type, meta);
      });
    } catch (error) {
      console.warn('[getMultipleCoinDecimals] Batch metadata fetch failed');
    }
  }

  // Map results using normalized addresses
  for (const [originalType, normalizedType] of normalizedMap) {
    const decimals = coinMetaCache.get(normalizedType)?.decimals ?? DEFAULT_DECIMALS;
    result.set(originalType, decimals);
  }

  return result;
}

/**
 * Gets full coin metadata with efficient caching
 * @param coinType The coin type address
 * @param client Optional RPC client
 * @returns CoinMeta object or null if not found
 */
export async function getCoinMeta(
  coinType: string,
  client?: any
): Promise<CoinMeta | null> {
  const normalizedType = normalizeSuiAddress(coinType);
  
  // Fast cache lookup
  const cached = coinMetaCache.get(normalizedType);
  if (cached) return cached;

  // Fetch metadata if client available
  if (client) {
    try {
      const meta = await new CoinMetaFetcher({ client }).getCoinMeta(normalizedType);
      if (meta) {
        coinMetaCache.set(normalizedType, meta);
        return meta;
      }
    } catch (error) {
      console.warn(`[getCoinMeta] Failed to fetch metadata for ${normalizedType}`);
    }
  }

  return null;
}