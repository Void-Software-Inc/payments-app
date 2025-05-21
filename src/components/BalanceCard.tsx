"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, Download, Upload, Wallet2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSuiClient } from "@mysten/dapp-kit";
import { formatSuiBalance } from "@/utils/formatters";
import Link from "next/link";
import { getCoinDecimals } from "@/utils/helpers";

// SUI coin type for SUI token
const SUI_COIN_TYPE = "0x2::sui::SUI";
// USDC coin type - replace with the actual USDC coin type for your network
const USDC_COIN_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC";

interface BalanceCardProps {
  accountId?: string;
  title?: string;
  customBalance?: bigint;
  customUsdcBalance?: bigint;
  disableActions?: boolean;
}

export function BalanceCard({ 
  accountId,
  title = "Total Balance",
  customBalance,
  customUsdcBalance,
  disableActions = false
}: BalanceCardProps) {
  const [balanceInSui, setBalanceInSui] = useState<bigint>(BigInt(0));
  const [balanceInUsdc, setBalanceInUsdc] = useState<bigint>(BigInt(0));
  const [showSui, setShowSui] = useState<boolean>(false);
  const [percentChange, setPercentChange] = useState<number>(5.3);
  const [usdcDecimals, setUsdcDecimals] = useState<number>(6); // Default USDC decimals is usually 6
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  
  useEffect(() => {
    // If customBalance and customUsdcBalance are provided, use them instead of fetching
    if (customBalance !== undefined) {
      setBalanceInSui(customBalance);
    }
    
    if (customUsdcBalance !== undefined) {
      setBalanceInUsdc(customUsdcBalance);
    }
    
    // Only fetch balances if custom balances are not provided
    if (customBalance === undefined || customUsdcBalance === undefined) {
      const fetchBalances = async () => {
        if (currentAccount?.address) {
          try {
            // Get all coins owned by the address using getAllCoins
            const allCoinsResponse = await suiClient.getAllCoins({
              owner: currentAccount.address
            });
            
            // Find SUI coins and calculate total SUI balance
            let totalSuiBalance = BigInt(0);
            let totalUsdcBalance = BigInt(0);
            
            // Get USDC decimals
            try {
              const decimals = await getCoinDecimals(USDC_COIN_TYPE, suiClient);
              setUsdcDecimals(decimals);
            } catch (error) {
              console.warn("Failed to get USDC decimals, using default:", error);
            }
            
            // Calculate total balances for each coin type
            for (const coin of allCoinsResponse.data) {
              if (coin.coinType === SUI_COIN_TYPE) {
                totalSuiBalance += BigInt(coin.balance);
              } else if (coin.coinType === USDC_COIN_TYPE) {
                totalUsdcBalance += BigInt(coin.balance);
              }
            }
            
            // Only set values if custom values weren't provided
            if (customBalance === undefined) {
              setBalanceInSui(totalSuiBalance);
            }
            if (customUsdcBalance === undefined) {
              setBalanceInUsdc(totalUsdcBalance);
            }
            
          } catch (error) {
            console.error("Failed to fetch balances:", error);
          }
        }
      };

      fetchBalances();
    }
    
    // Always get USDC decimals regardless of custom balances
    const getUsdcDecimals = async () => {
      try {
        const decimals = await getCoinDecimals(USDC_COIN_TYPE, suiClient);
        setUsdcDecimals(decimals);
      } catch (error) {
        console.warn("Failed to get USDC decimals, using default:", error);
      }
    };
    
    getUsdcDecimals();
  }, [currentAccount, suiClient]);

  // Toggle between SUI and USDC display
  const toggleBalanceDisplay = () => {
    setShowSui(!showSui);
  };

  // Format USDC balance
  const formatUsdcBalance = (balance: bigint, decimals: number): string => {
    const divisor = BigInt(10) ** BigInt(decimals);
    const usdcBalance = Number(balance) / Number(divisor);
    return usdcBalance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Get displayed balance based on current toggle state
  const displayedBalance = showSui
    ? `${formatSuiBalance(balanceInSui)} SUI`
    : `${formatUsdcBalance(balanceInUsdc, usdcDecimals)} USDC`;

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
          </div>

          {/* Action Buttons - preventing click propagation so they work independently */}
          {!disableActions && (
            <div className="grid grid-cols-3 gap-2 py-2">
              <Link 
                href={accountId ? `/merchant/${accountId}/deposit` : "/deposit"} 
                className="flex flex-col items-center justify-center py-4 rounded-lg border border-gray-700 hover:bg-gray-800 transition"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-6 w-6 mb-2 text-white" />
                <span className="text-sm text-white">Deposit</span>
              </Link>
              
              <Link 
                href={accountId ? `/merchant/${accountId}/withdraw` : "/withdraw"} 
                className="flex flex-col items-center justify-center py-4 rounded-lg border border-gray-700 hover:bg-gray-800 transition"
                onClick={(e) => e.stopPropagation()}
              >
                <Upload className="h-6 w-6 mb-2 text-white" />
                <span className="text-sm text-white">Withdraw</span>
              </Link>
              
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