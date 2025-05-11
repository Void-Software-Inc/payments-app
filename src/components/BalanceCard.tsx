"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, Download, Upload, Wallet2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSuiClient } from "@mysten/dapp-kit";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { formatSuiBalance, formatUsdBalance } from "@/utils/formatters";

// SUI coin type for SUI token
const SUI_COIN_TYPE = "0x2::sui::SUI";
// For USDC, replace with actual USDC coin type when available
// const USDC_COIN_TYPE = "0x...::usdc::USDC";

interface BalanceCardProps {
  accountId?: string;
  title?: string;
  customBalance?: bigint;
  disableActions?: boolean;
}

export function BalanceCard({ 
  accountId,
  title = "Total Balance",
  customBalance,
  disableActions = false
}: BalanceCardProps) {
  const [balanceInSui, setBalanceInSui] = useState<bigint>(BigInt(0));
  const [showInDollars, setShowInDollars] = useState<boolean>(true);
  const [percentChange, setPercentChange] = useState<number>(5.3);
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  
  // Get real-time SUI price in USD using our custom hook
  const { price: suiPrice, loading: priceLoading } = useTokenPrice('sui', {
    refreshInterval: 60000 // Update price every minute
  });

  useEffect(() => {
    // If customBalance is provided, use it instead of fetching
    if (customBalance !== undefined) {
      setBalanceInSui(customBalance);
      return;
    }
    
    const fetchBalance = async () => {
      if (currentAccount?.address) {
        try {
          // Get the total balance directly using getBalance
          const balanceResponse = await suiClient.getBalance({
            owner: currentAccount.address,
            coinType: SUI_COIN_TYPE,
          });

          setBalanceInSui(BigInt(balanceResponse.totalBalance));
        } catch (error) {
          console.error("Failed to fetch balance:", error);
        }
      }
    };

    fetchBalance();
  }, [currentAccount, suiClient, customBalance]);

  // Toggle between SUI and USD display
  const toggleBalanceDisplay = () => {
    setShowInDollars(!showInDollars);
  };

  // Get displayed balance based on current toggle state
  const displayedBalance = showInDollars 
    ? `$${formatUsdBalance(balanceInSui, suiPrice)}` 
    : `${formatSuiBalance(balanceInSui)} SUI`;

  return (
    <Card 
      className="bg-[#2A2A2F] border-none shadow-lg w-full max-w-xl mx-auto cursor-pointer transition-all hover:shadow-xl"
      onClick={toggleBalanceDisplay}
    >
      <CardContent>
        <div className="space-y-6">
          {/* Balance Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-gray-400 text-lg font-medium">{title}</h2>
            <div className="flex items-center text-cyan-400">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span className="text-sm">{percentChange}%(1d)</span>
            </div>
          </div>

          {/* Balance Amount */}
          <div className="text-white text-5xl font-semibold">
            {displayedBalance}
            {priceLoading && showInDollars && (
              <span className="text-xs ml-2 text-gray-400">(updating...)</span>
            )}
          </div>

          {/* Action Buttons - preventing click propagation so they work independently */}
          {!disableActions && (
            <div className="grid grid-cols-3 gap-2 py-2">
              <button 
                className="flex flex-col items-center justify-center py-4 rounded-lg border border-gray-700 hover:bg-gray-800 transition"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-6 w-6 mb-2 text-white" />
                <span className="text-sm text-white">Deposit</span>
              </button>
              
              <button 
                className="flex flex-col items-center justify-center py-4 rounded-lg border border-gray-700 hover:bg-gray-800 transition"
                onClick={(e) => e.stopPropagation()}
              >
                <Upload className="h-6 w-6 mb-2 text-white" />
                <span className="text-sm text-white">Withdraw</span>
              </button>
              
              <button 
                className="flex flex-col items-center justify-center py-4 rounded-lg border border-gray-700 hover:bg-gray-800 transition"
                onClick={(e) => e.stopPropagation()}
              >
                <Wallet2 className="h-6 w-6 mb-2 text-white" />
                <span className="text-sm text-white">Earn</span>
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 