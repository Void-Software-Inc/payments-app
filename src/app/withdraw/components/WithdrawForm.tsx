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
import { coinWithBalance } from "@mysten/sui/transactions";
import { toast } from "sonner";
import { signAndExecute, handleTxResult } from "@/utils/Tx";
import { formatSuiBalance } from "@/utils/formatters";

export function WithdrawForm() {
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceInSui, setBalanceInSui] = useState<bigint>(BigInt(0));
  
  const currentAccount = useCurrentAccount();
  const signTransaction = useSignTransaction();
  const suiClient = useSuiClient();
  
  // Fetch the current balance when the component loads
  useEffect(() => {
    const fetchBalance = async () => {
      if (currentAccount?.address) {
        try {
          const balanceResponse = await suiClient.getBalance({
            owner: currentAccount.address,
            coinType: "0x2::sui::SUI",
          });
          
          setBalanceInSui(BigInt(balanceResponse.totalBalance));
        } catch (error) {
          console.error("Failed to fetch balance:", error);
        }
      }
    };
    
    fetchBalance();
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
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
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
    
    // Convert amount to MIST (SUI's smallest unit) for comparison
    const amountInMist = BigInt(Math.floor(parseFloat(amount) * 1_000_000_000));
    
    // Check if user has enough balance (leaving some for gas)
    const gasBuffer = BigInt(20_000_000); // 0.02 SUI for gas
    if (amountInMist + gasBuffer > balanceInSui) {
      setError("Insufficient balance. Please leave some SUI for gas fees.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Create a new transaction
      const tx = new Transaction();
      
      // Important: Set the sender for the transaction
      tx.setSender(currentAccount.address);
      
      // Use the coinWithBalance intent to create a coin with the exact amount
      // We must use the gas coin for SUI transfers since we need it for gas fees
      const transferObjects = [
        coinWithBalance({ 
          balance: amountInMist,
        })
      ];
      
      // Transfer the coin to the recipient
      tx.transferObjects(transferObjects, recipient.trim());
      
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
      }
      
    } catch (err) {
      console.error("Error withdrawing funds:", err);
      setError(err instanceof Error ? err.message : "Failed to withdraw funds");
      toast.error(err instanceof Error ? err.message : "Failed to withdraw funds");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Format balance for display
  const formattedBalance = formatSuiBalance(balanceInSui);
  
  return (
    <Card className="bg-[#2A2A2F] border-none shadow-lg">
      <CardHeader>
        <CardTitle className="text-white text-2xl">Withdraw SUI</CardTitle>
        <CardDescription className="text-gray-400">
          Transfer SUI tokens to another wallet address
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="recipient" className="text-white">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipient}
              onChange={handleRecipientChange}
              className="h-12"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-white">
              Amount (SUI)
              <span className="text-sm ml-2 text-gray-400">
                Available: {formattedBalance} SUI
              </span>
            </Label>
            <div className="relative">
              <Input
                id="amount"
                placeholder="0.0"
                value={amount}
                onChange={handleAmountChange}
                className="h-12 pr-16"
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-400">SUI</span>
              </div>
            </div>
            <button 
              type="button" 
              className="text-xs text-cyan-400 hover:text-cyan-300"
              onClick={() => {
                // Set max amount (leave some for gas)
                const gasBuffer = 0.02; // 0.02 SUI for gas
                const maxAmount = Math.max(0, 
                  parseFloat(formatSuiBalance(balanceInSui)) - gasBuffer
                );
                setAmount(maxAmount.toString());
              }}
            >
              Use max (less gas fees)
            </button>
          </div>
          
          {error && <div className="text-red-500 text-sm">{error}</div>}
          
          <Button
            type="submit"
            className="w-full h-12 rounded-full font-medium mt-4"
            style={{ backgroundColor: "#78BCDB", borderColor: "#78BCDB" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Processing..." : "Withdraw SUI"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 