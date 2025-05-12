const AFTERMATH_API_URL = 'https://aftermath.finance/api/price-info';

interface TokenPriceInfo {
  price: number;
  priceChange24HoursPercentage: number;
}

interface AftermathPriceResponse {
  [coinType: string]: TokenPriceInfo;
}

export async function getTokenPrices(coinTypes: string[]): Promise<AftermathPriceResponse | null> {
  try {
    const response = await fetch(AFTERMATH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        coins: coinTypes
      }),
      // Use Next.js cache configuration
      next: {
        revalidate: 60 // Revalidate every 60 seconds
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token prices: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Aftermath price data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching token prices from Aftermath:', error);
    return null;
  }
}

// Example usage:
// const prices = await getTokenPrices([
//   "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"
// ]);