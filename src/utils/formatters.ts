/**
 * Format and truncate addresses in the middle
 * @param address The full address string
 * @param startChars Number of characters to keep at the start (default: 6)
 * @param endChars Number of characters to keep at the end (default: 4)
 * @returns Formatted address with middle truncated
 */
export function truncateMiddle(address: string, startChars = 6, endChars = 4): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  
  const start = address.slice(0, startChars);
  const end = address.slice(-endChars);
  
  return `${start}...${end}`;
}

/**
 * Format SUI balance from raw bigint value
 * @param balance The balance in MIST (raw units)
 * @returns Formatted string with proper decimal places
 */
export function formatSuiBalance(balance: bigint): string {
  const suiBalance = Number(balance) / 1_000_000_000;
  return suiBalance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format USD balance from SUI amount and price
 * @param balance The balance in MIST (raw units)
 * @param suiPrice The price of SUI in USD
 * @returns Formatted USD string
 */
export function formatUsdBalance(balance: bigint, suiPrice: number | null): string {
  const suiBalance = Number(balance) / 1_000_000_000;
  // Use actual price data, fallback to 1.0 if price is still loading
  const suiToUsdRate = suiPrice ?? 1.0;
  const usdBalance = suiBalance * suiToUsdRate;
  return usdBalance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
} 