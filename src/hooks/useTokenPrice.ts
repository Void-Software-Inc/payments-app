import { useState, useEffect } from 'react';

type TokenId = 'sui';

interface UseTokenPriceOptions {
  refreshInterval?: number; // In milliseconds
  currency?: string;
}

/**
 * Hook to fetch real-time token prices from CoinGecko API
 * @param tokenId - The token ID in CoinGecko (e.g., 'sui', 'bitcoin')
 * @param options - Options for customizing the price fetching behavior
 * @returns Object containing price, loading state, and error information
 */
export function useTokenPrice(
  tokenId: TokenId, 
  options: UseTokenPriceOptions = {}
) {
  const { 
    refreshInterval = 60000, // Default to refresh every minute
    currency = 'usd' 
  } = options;
  
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setLoading(true);
        // CoinGecko free API for price data
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=${currency}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch price: ${response.status}`);
        }
        
        const data = await response.json();
        setPrice(data[tokenId][currency]);
        setError(null);
      } catch (err) {
        console.error('Error fetching token price:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        // Fallback price if API fails
        if (price === null) setPrice(1.00);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchPrice();
    
    // Set up interval for refreshing
    const intervalId = setInterval(fetchPrice, refreshInterval);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [tokenId, currency, refreshInterval, price]);

  return { price, loading, error };
} 