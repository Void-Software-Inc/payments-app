"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { getCoinDecimals } from "@/utils/helpers";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// USDC coin type - replace with the actual USDC coin type for your network
const USDC_COIN_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC";

export function BalanceDisplay() {
  const [balanceInUsdc, setBalanceInUsdc] = useState<bigint>(BigInt(0));
  const [usdcDecimals, setUsdcDecimals] = useState<number>(6); // Default USDC decimals is usually 6
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();

  useEffect(() => {
    const fetchUsdcBalance = async () => {
      if (currentAccount?.address) {
        try {
          // Get all coins owned by the address
          const allCoinsResponse = await suiClient.getAllCoins({
            owner: currentAccount.address
          });
          
          // Get USDC decimals
          try {
            const decimals = await getCoinDecimals(USDC_COIN_TYPE, suiClient);
            setUsdcDecimals(decimals);
          } catch (error) {
            console.warn("Failed to get USDC decimals, using default:", error);
          }
          
          // Calculate total USDC balance
          let totalUsdcBalance = BigInt(0);
          for (const coin of allCoinsResponse.data) {
            if (coin.coinType === USDC_COIN_TYPE) {
              totalUsdcBalance += BigInt(coin.balance);
            }
          }
          
          setBalanceInUsdc(totalUsdcBalance);
        } catch (error) {
          console.error("Failed to fetch USDC balance:", error);
        }
      }
    };

    fetchUsdcBalance();
  }, [currentAccount, suiClient]);

  // Format USDC balance
  const formatUsdcBalance = (balance: bigint, decimals: number): string => {
    const divisor = BigInt(10) ** BigInt(decimals);
    const usdcBalance = Number(balance) / Number(divisor);
    return usdcBalance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (  
    <div className="bg-[#7AC0E0] p-8 h-24 border-none rounded-4xl shadow-lg w-full flex justify-start items-center">
        <div className="">
          {/* Balance Header */}
          <h2 className="text-sm font-bold text-white/80">Available Balance</h2>
          
          {/* Balance Amount */}
          <div className="text-white text-4xl font-semibold line leading-9 tracking-tight">
            {formatUsdcBalance(balanceInUsdc, usdcDecimals)} <span className="text-2xl text-white/80">USDC</span>
          </div>
        </div>
    </div>
  );
} 