"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Upload } from "lucide-react";

// USDC coin type - ensure this matches the BalanceCard.tsx definition
const USDC_COIN_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC";
const SUI_COIN_TYPE = "0x2::sui::SUI";

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
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-6">
        <div className="relative mb-20">
          <div className="absolute text-sm left-5 top-4 font-medium text-white/70 pointer-events-none">
            Recipient Address
          </div>

          <Input
            id="recipient"
            value={recipient}
            onChange={handleRecipientChange}
            className="px-5 pt-10 pb-4 h-20 bg-[#1A1A20] focus:bg-[#1A1A20] border-white/10 text-white text-md focus:ring-1 rounded-3xl"
            style={{
              WebkitAppearance: 'none',
              appearance: 'none',
              color: 'white'
            }}
            autoComplete="off"
            required
          />
        {error && <div className="text-red-500 text-sm">{error}</div>}

        </div>

        <div className="relative">
          <div className="relative h-20 bg-transparent rounded-xl flex items-center justify-center">
            <div className="flex items-center justify-center">
              <Input
                id="amount"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="text-white -ml-16 text-3xl font-semibold text-right bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{ 
                  width: 'auto', 
                  minWidth: '80px',
                  maxWidth: '200px',
                  outline: 'none',
                  boxShadow: 'none'
                }}
                autoComplete="off"
                required
              />
              <span className="text-white/70 text-2xl font-medium ml-1">USDC</span>
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-400 p-3 bg-gray-800 rounded-lg">
          <p>SUI will be used for gas fees.</p>
          <p className="mb-1">SUI Balance: {formattedSuiBalance} SUI</p>
        </div>
      </div>
      
      <div className="mt-auto pt-8 fixed bottom-6 left-4 right-4">
        <Button
          onClick={withdraw}
          className="w-full h-12 rounded-full font-semiobold text-lg"
          style={{ backgroundColor: "#78BCDB", borderColor: "#78BCDB" }}
          disabled={isSubmitting}
        >
        <Upload className="size-5 text-white" />

          {isSubmitting ? "Processing..." : "Withdraw"}
        </Button>
      </div>
    </div>
  );
} 