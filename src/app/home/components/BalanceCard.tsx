"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, Download, Upload, Wallet2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSuiClient } from "@mysten/dapp-kit";

export function BalanceCard() {
  const [balance, setBalance] = useState<string>("0.00");
  const [percentChange, setPercentChange] = useState<number>(0.0);
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();

  useEffect(() => {
    const fetchBalance = async () => {
      if (currentAccount?.address) {
        try {
          // Fetch coins owned by the address
          const { data: coins } = await suiClient.getCoins({
            owner: currentAccount.address,
          });

          // Calculate total balance
          const totalBalance = coins.reduce((total, coin) => {
            return total + BigInt(coin.balance);
          }, BigInt(0));

          // Format balance with commas
          const formatted = formatSuiBalance(totalBalance);
          setBalance(formatted);
        } catch (error) {
          console.error("Failed to fetch balance:", error);
        }
      }
    };

    fetchBalance();
  }, [currentAccount, suiClient]);

  // Helper function to format balance
  const formatSuiBalance = (balance: bigint): string => {
    // Divide by 10^9 to convert from MIST to SUI
    const suiBalance = Number(balance) / 1_000_000_000;
    return suiBalance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <Card className="bg-[#2A2A2F] border-none shadow-lg w-full max-w-xl mx-auto">
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Balance Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-gray-400 text-lg font-medium">Total Balance</h2>
            <div className="flex items-center text-cyan-400">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span className="text-sm">{percentChange}%(1d)</span>
            </div>
          </div>

          {/* Balance Amount */}
          <div className="text-white text-5xl font-semibold">
            ${balance}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 py-2">
            <button className="flex flex-col items-center justify-center py-4 rounded-lg border border-gray-700 hover:bg-gray-800 transition">
              <Download className="h-6 w-6 mb-2 text-white" />
              <span className="text-sm text-white">Deposit</span>
            </button>
            
            <button className="flex flex-col items-center justify-center py-4 rounded-lg border border-gray-700 hover:bg-gray-800 transition">
              <Upload className="h-6 w-6 mb-2 text-white" />
              <span className="text-sm text-white">Withdraw</span>
            </button>
            
            <button className="flex flex-col items-center justify-center py-4 rounded-lg border border-gray-700 hover:bg-gray-800 transition">
              <Wallet2 className="h-6 w-6 mb-2 text-white" />
              <span className="text-sm text-white">Earn</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 