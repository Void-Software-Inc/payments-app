import { useState, useEffect } from 'react';
import { getTokenPrices } from '../utils/aftermath';

type TokenId = 'sui';

interface UseTokenPriceOptions {
  refreshInterval?: number; // In milliseconds
  currency?: string;
}

/**
 * Hook to fetch real-time token prices from Aftermath API
 * @param tokenId - The token ID (e.g., 'sui')
 * @param options - Options for customizing the price fetching behavior
 * @returns Object containing price, loading state, and error information
 */
export function useTokenPrice(
  tokenId: TokenId, 
  options: UseTokenPriceOptions = {}
) {
  const { 
    refreshInterval = 60000, // Default to refresh every minute
  } = options;
  
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setLoading(true);
        
        // Map tokenId to the appropriate Aftermath coin type
        let coinType = '';
        if (tokenId === 'sui') {
          coinType = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
        }
        
        const priceData = await getTokenPrices([coinType]);
        
        if (!priceData || !priceData[coinType]) {
          throw new Error(`Failed to fetch price for ${tokenId}`);
        }
        
        // Handle -1 price which means token not found
        if (priceData[coinType].price === -1) {
          setPrice(0);
        } else {
          setPrice(priceData[coinType].price);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching token price:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        // Fallback price if API fails
        if (price === null) setPrice(0);
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
  }, [tokenId, refreshInterval, price]);

  return { price, loading, error };
} 