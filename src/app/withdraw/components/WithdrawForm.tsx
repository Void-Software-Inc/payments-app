"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, QrCode, ArrowDown } from "lucide-react";
import { 
  useCurrentAccount, 
  useSignTransaction, 
  useSuiClient 
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { toast } from "sonner";
import { signAndExecute, handleTxResult } from "@/utils/Tx";
import { formatSuiBalance } from "@/utils/formatters";
import { getCoinDecimals } from "@/utils/helpers";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FiatButton } from "@/components/FiatButton";

// USDC coin type - ensure this matches the BalanceCard.tsx definition
const USDC_COIN_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC";
const SUI_COIN_TYPE = "0x2::sui::SUI";

// Custom styles to ensure white text everywhere
const selectStyles = {
  trigger: "h-8 w-[105px] pl-2 pr-2 bg-transparent border-0 focus:ring-0 text-white [&>svg]:text-white [&_svg]:text-white [&_svg]:opacity-100",
  item: "text-white focus:bg-gray-700 focus:text-white hover:text-white data-[highlighted]:text-white data-[state=checked]:text-white data-[disabled]:text-white"
};

export function WithdrawForm() {
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceInSui, setBalanceInSui] = useState<bigint>(BigInt(0));
  const [balanceInUsdc, setBalanceInUsdc] = useState<bigint>(BigInt(0));
  const [usdcDecimals, setUsdcDecimals] = useState<number>(6); // Default USDC decimals is usually 6
  const [usdcCoins, setUsdcCoins] = useState<any[]>([]);
  
  const currentAccount = useCurrentAccount();
  const signTransaction = useSignTransaction();
  const suiClient = useSuiClient();
  const router = useRouter();
  
  // Fetch balances when the component loads
  useEffect(() => {
    const fetchBalances = async () => {
      if (currentAccount?.address) {
        try {
          // Get SUI balance for gas fees
          const suiBalanceResponse = await suiClient.getBalance({
            owner: currentAccount.address,
            coinType: SUI_COIN_TYPE,
          });
          
          setBalanceInSui(BigInt(suiBalanceResponse.totalBalance));
          
          // Get USDC balance and coins
          const usdcCoinsResponse = await suiClient.getCoins({
            owner: currentAccount.address,
            coinType: USDC_COIN_TYPE,
          });
          
          // Store USDC coins for later use in transactions
          setUsdcCoins(usdcCoinsResponse.data);
          
          // Calculate total USDC balance
          const totalUsdcBalance = usdcCoinsResponse.data.reduce(
            (acc, coin) => acc + BigInt(coin.balance),
            BigInt(0)
          );
          
          setBalanceInUsdc(totalUsdcBalance);
          
          // Get USDC decimals
          try {
            const decimals = await getCoinDecimals(USDC_COIN_TYPE, suiClient);
            setUsdcDecimals(decimals);
          } catch (error) {
            console.warn("Failed to get USDC decimals, using default:", error);
          }
        } catch (error) {
          console.error("Failed to fetch balances:", error);
        }
      }
    };
    
    fetchBalances();
  }, [currentAccount, suiClient]);
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric input with decimals
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value) || value === "") {
      setAmount(value);
    }
  };
  
  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipient(e.target.value);
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
  
  const withdraw = async () => {
    if (!currentAccount?.address) {
      setError("Please connect your wallet");
      return;
    }
    
    if (!recipient.trim()) {
      setError("Please enter a recipient address");
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    
    // Check if user has enough SUI for gas
    const gasBuffer = BigInt(20_000_000); // 0.02 SUI for gas
    if (balanceInSui < gasBuffer) {
      setError("Insufficient SUI balance for gas fees. Please maintain at least 0.02 SUI.");
      return;
    }
    
    // Convert amount to the smallest USDC unit based on decimals
    const amountInSmallestUnit = BigInt(
      Math.floor(parseFloat(amount) * 10 ** usdcDecimals)
    );
    
    if (amountInSmallestUnit > balanceInUsdc) {
      setError("Insufficient USDC balance.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Create a new transaction
      const tx = new Transaction();
      
      // Set the sender for the transaction
      tx.setSender(currentAccount.address);
      
      // For USDC transfer, find coins that satisfy the amount
      let remainingAmount = amountInSmallestUnit;
      const coinsToUse = [];
      
      // Sort coins by balance (descending) to minimize number of coins used
      const sortedCoins = [...usdcCoins].sort((a, b) => 
        BigInt(b.balance) > BigInt(a.balance) ? 1 : -1
      );
      
      for (const coin of sortedCoins) {
        const coinBalance = BigInt(coin.balance);
        coinsToUse.push(coin.coinObjectId);
        
        if (coinBalance >= remainingAmount) {
          break;
        }
        
        remainingAmount -= coinBalance;
        
        if (remainingAmount <= BigInt(0)) {
          break;
        }
      }
      
      // If we found enough coins to cover the amount
      if (coinsToUse.length > 0) {
        // If we need to use multiple coins, merge them first
        if (coinsToUse.length > 1) {
          // Use the first coin as the destination
          tx.mergeCoins(coinsToUse[0], coinsToUse.slice(1));
          
          // Then split the exact amount needed
          const [splitCoin] = tx.splitCoins(coinsToUse[0], [amountInSmallestUnit]);
          
          // Transfer the split coin to the recipient
          tx.transferObjects([splitCoin], recipient.trim());
        } else {
          // If we're using a single coin, simply split and transfer
          const [splitCoin] = tx.splitCoins(coinsToUse[0], [amountInSmallestUnit]);
          tx.transferObjects([splitCoin], recipient.trim());
        }
      } else {
        throw new Error("Unable to find suitable USDC coins for this transaction");
      }
      
      // Execute the transaction
      const txResult = await signAndExecute({
        suiClient,
        currentAccount,
        tx,
        signTransaction,
        toast
      });
      
      // Handle the transaction result
      handleTxResult(txResult, toast);
      
      // Reset form if successful
      if (txResult.effects?.status?.status === "success") {
        setAmount("");
        setRecipient("");
        
        setTimeout(() => {
          router.back();
        }, 1500);
      }
      
    } catch (err) {
      console.error("Error withdrawing USDC:", err);
      setError(err instanceof Error ? err.message : "Failed to withdraw USDC");
      toast.error(err instanceof Error ? err.message : "Failed to withdraw USDC");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Format balances for display
  const formattedSuiBalance = formatSuiBalance(balanceInSui);
  const formattedUsdcBalance = formatUsdcBalance(balanceInUsdc, usdcDecimals);
  
  return (
    <div>
        <Card className="w-full bg-[#2A2A2F] border-[#33363A] rounded-lg shadow-lg">
        <CardContent className="space-y-6 mt-1 mb-3">
        
            
            {/* Amount Input */}
            <div className="space-y-2">
            <Label htmlFor="amount" className="text-md text-[#c8c8c8] font-medium">
                Amount
            </Label>
            <div className="relative">
                <Input
                id="amount"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="h-14 bg-transparent border-[#5E6164] rounded-lg text-white pr-24 text-lg"
                autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <div className="h-8 bg-transparent text-white flex items-center gap-2">
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-transparent text-white flex items-center justify-center">
                                <Image src="/usdc-logo.webp" alt="USDC" width={26} height={26} className="rounded-full" />
                            </div>
                            <span className="text-sm font-medium text-white">USDC</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                <div className="flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                <span>{formattedUsdcBalance} USDC</span>
                </div>
                <div className="flex items-center gap-1">
                <ArrowDown className="h-3 w-3" />
                <span>{balanceInSui > BigInt(0) ? `${formattedSuiBalance} SUI (gas)` : "Insufficient SUI for gas"}</span>
                </div>
            </div>
            </div>
            
            {/* Recipient Address Input */}
            <div className="space-y-2 mt-2">
            <Label htmlFor="recipient" className="text-md text-[#c8c8c8] font-medium">
                Recipient Address
            </Label>
            <div className="flex items-center gap-2">
                <Input
                id="recipient"
                value={recipient}
                onChange={handleRecipientChange}
                placeholder="0x..."
                className="h-14 bg-transparent border-[#5E6164] rounded-lg text-white text-lg"
                autoComplete="off"
                />
                <Button 
                variant="outline"
                className="flex-shrink-0 h-14 w-14 rounded-md bg-transparent border-[#5E6164] flex items-center justify-center hover:bg-[#353550]"
                onClick={() => {}} // No functionality for now
                >
                <QrCode className="size-7 text-gray-300" />
                </Button>
            </div>
            </div>
            
            {error && (
            <div className="text-red-500 text-sm mt-2">{error}</div>
            )}
            
            {/* Withdrawal Button */}
            <Button
            onClick={withdraw}
            className="w-full h-14 mt-4 rounded-full bg-[#78BCDB] hover:bg-[#68ACCC] text-white font-medium text-lg"
            disabled={isSubmitting}
            >
            {isSubmitting ? "Processing..." : "Withdraw USDC"}
            </Button>
        </CardContent>
        </Card>

    <FiatButton />
   
  </div>
  );
} 