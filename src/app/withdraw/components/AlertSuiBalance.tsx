"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import { formatSuiBalance } from "@/utils/formatters";

export function AlertSuiBalance() {
  const [balanceInSui, setBalanceInSui] = useState<bigint>(BigInt(0));
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  
  useEffect(() => {
    const fetchSuiBalance = async () => {
      if (currentAccount?.address) {
        try {
          const suiBalanceResponse = await suiClient.getBalance({
            owner: currentAccount.address,
            coinType: "0x2::sui::SUI",
          });
          setBalanceInSui(BigInt(suiBalanceResponse.totalBalance));
        } catch (error) {
          console.error("Failed to fetch SUI balance:", error);
        }
      }
    };
    
    fetchSuiBalance();
  }, [currentAccount, suiClient]);

  const formattedSuiBalance = formatSuiBalance(balanceInSui);

  return (
    <Alert className="bg-gray-800 border-gray-700 text-gray-400 mb-10">
      <Info />
      <AlertDescription className="text-gray-400">
        <p>Only USDC can be withdrawn. SUI is exclusively used for gas fees.</p>
        <p>Current SUI Balance: {formattedSuiBalance} SUI</p>
      </AlertDescription>
    </Alert>
  );
}
