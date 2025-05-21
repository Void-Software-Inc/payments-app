"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePaymentClient } from "@/hooks/usePaymentClient"
import { useCurrentAccount, useSignTransaction } from "@mysten/dapp-kit"
import { useSuiClient } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { toast } from "sonner"

import ToastNotification from "@/utils/Notification"
import { handleTxResult, signAndExecute } from "@/utils/Tx"
import { usePaymentStore } from "@/store/usePaymentStore"

// USDC coin type
const USDC_COIN_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"
// Gas budget (in MIST, where 1 SUI = 10^9 MIST)
const GAS_BUDGET = 50000000 // 0.05 SUI - Increased to handle complex transactions

interface WithdrawFormProps {
  accountId: string
  isOwner: boolean
  isBackup: boolean
  pendingWithdraws: Record<string, any>
}

export function WithdrawForm({ accountId, isOwner, isBackup, pendingWithdraws }: WithdrawFormProps) {
  const { initiateWithdraw, completeWithdraw, getPaymentAccount } = usePaymentClient()
  const currentAccount = useCurrentAccount()
  const suiClient = useSuiClient()
  const signTransaction = useSignTransaction()
  
  const [amount, setAmount] = useState("")
  const [recipient, setRecipient] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { resetClient } = usePaymentStore()
  const [accountBalance, setAccountBalance] = useState<bigint>(BigInt(0))
  
  const hasPendingWithdraws = Object.keys(pendingWithdraws).length > 0
  
  // Fetch account balance for debugging
  useEffect(() => {
    const fetchAccountBalance = async () => {
      if (!currentAccount?.address || !accountId) return;
      
      try {
        // Get payment account
        const account = await getPaymentAccount(currentAccount.address, accountId);
        console.log("Payment Account:", account);
        
        // Get coins for the account
        const coins = await suiClient.getCoins({
          owner: accountId,
          coinType: USDC_COIN_TYPE
        });
        
        console.log("Account USDC Coins:", coins);
        
        // Calculate total balance
        const total = coins.data.reduce((acc, coin) => acc + BigInt(coin.balance), BigInt(0));
        setAccountBalance(total);
        console.log("Total USDC Balance:", total.toString());
        
        // Also check SUI balance for gas
        const suiCoins = await suiClient.getCoins({
          owner: currentAccount.address,
          coinType: "0x2::sui::SUI"
        });
        
        const totalSui = suiCoins.data.reduce((acc, coin) => acc + BigInt(coin.balance), BigInt(0));
        console.log("User SUI Balance for gas:", totalSui.toString());
        
      } catch (error) {
        console.error("Error fetching account balance:", error);
      }
    };
    
    fetchAccountBalance();
  }, [currentAccount, accountId, suiClient, getPaymentAccount]);
  
  const handleInitiateWithdraw = async () => {
    if (!currentAccount?.address || !amount || !recipient) return
    
    try {
      setIsSubmitting(true);
      
      // Check if amount is valid and available
      const amountBigInt = BigInt(parseFloat(amount) * 1_000_000); // 6 decimals for USDC
      
      console.log("Withdraw Request:", {
        amount: amountBigInt.toString(),
        formattedAmount: parseFloat(amount),
        accountBalance: accountBalance.toString(),
        recipient,
        accountId,
        gasAmount: GAS_BUDGET.toString()
      });
      
      // Verify sufficient balance
      if (amountBigInt > accountBalance) {
        toast.error(`Insufficient balance. Available: ${Number(accountBalance) / 1_000_000} USDC`);
        setIsSubmitting(false);
        return;
      }
      
      // Create transaction with gas budget
      const tx = new Transaction();
      tx.setGasBudget(GAS_BUDGET);
      
      const key = `withdraw_${Date.now()}`;
      
      try {
        // Add withdraw action to transaction
        await initiateWithdraw(
          currentAccount.address,
          accountId,
          tx,
          key,
          USDC_COIN_TYPE,
          amountBigInt,
          recipient
        );
        
        console.log("Transaction Built:", {
          userAddress: currentAccount.address,
          accountId,
          key,
          coinType: USDC_COIN_TYPE,
          amount: amountBigInt.toString(),
          recipient
        });

        // Execute transaction
        const txResult = await signAndExecute({
          suiClient,
          currentAccount,
          tx,
          signTransaction,
          options: {showEffects: true},
          toast
        }).catch(err => {
          if (err.message?.includes('User rejected')) {
            toast.error("Transaction canceled by user");
            setIsSubmitting(false);
            return null;
          }
          throw err;
        });
        
        if (txResult) {
          console.log("Transaction Result:", txResult);
          handleTxResult(txResult, toast);
          
          // Clear form and reset client
          setAmount("");
          setRecipient("");
          resetClient();
          usePaymentStore.getState().triggerRefresh();
          
          // Refresh page after successful transaction
          setTimeout(() => window.location.reload(), 2000);
        } else {
          setIsSubmitting(false);
        }
      } catch (initiateError: any) {
        console.error("Error initiating:", initiateError);
        toast.error(initiateError.message || "Failed to initiate withdraw");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error initiating withdraw:", error);
      console.error("Failed to initiate withdrawal: " + ((error as Error).message || String(error)));
      toast.error("Failed to initiate withdrawal: " + ((error as Error).message || String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCompleteWithdraw = async (key: string) => {
    if (!currentAccount?.address) return;
    
    try {
      setIsSubmitting(true);
      
      // Create transaction with gas budget
      const tx = new Transaction();
      tx.setGasBudget(GAS_BUDGET);
      
      console.log("Completing Withdraw:", {
        userAddress: currentAccount.address,
        accountId,
        key
      });
      
      // Add complete withdraw action to transaction
      await completeWithdraw(
        currentAccount.address,
        accountId,
        tx,
        key
      );
      
      const result = await signAndExecute({
        suiClient,
        currentAccount,
        tx,
        signTransaction,
        options: {showEffects: true},
        toast
      });
      
      console.log("Complete Result:", result);
      handleTxResult(result, toast);
      resetClient();
      usePaymentStore.getState().triggerRefresh();
      
      // Refresh page after successful transaction
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error("Error completing withdraw:", error);
      toast.error("Failed to complete withdrawal: " + ((error as Error).message || String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Display current USDC balance above the form
  const displayBalance = () => {
    const formatted = (Number(accountBalance) / 1_000_000).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
    return `${formatted} USDC`;
  };
  
  // If user is backup and there are pending withdraws, show complete button
  if (isBackup && hasPendingWithdraws) {
    return (
      <Card className="bg-[#2A2A2F] border-none shadow-lg w-full my-4">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold text-white mb-4">Complete Withdrawal</h2>
          
          <div className="space-y-4">
            {Object.entries(pendingWithdraws).map(([key, intent]) => (
              <div key={key} className="p-4 border border-gray-700 rounded-lg">
                <div className="text-sm text-gray-300 mb-1">Amount: {parseInt(intent.args.amount) / 1_000_000} USDC</div>
                <div className="text-sm text-gray-300 mb-3">Recipient: {intent.args.recipient}</div>
                
                <Button 
                  onClick={() => handleCompleteWithdraw(key)}
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? "Processing..." : "Complete Withdraw"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // If user is owner, show form to initiate withdraw
  if (isOwner) {
    return (
      <Card className="bg-[#2A2A2F] border-none shadow-lg w-full my-4">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold text-white mb-4">Initiate Withdrawal</h2>
          
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">Available balance:</span>
            <span className="text-sm font-medium text-white">{displayBalance()}</span>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USDC)</Label>
              <Input
                id="amount"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                min="0"
                step="0.000001"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            
            <Button 
              onClick={handleInitiateWithdraw}
              disabled={!amount || !recipient || isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Processing..." : "Initiate Withdraw"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // If user is neither owner nor backup with pending withdraws
  return (
    <Card className="bg-[#2A2A2F] border-none shadow-lg w-full my-4">
      <CardContent className="pt-6">
        <p className="text-center text-gray-400">
          You don't have permission to initiate or complete withdrawals for this account.
        </p>
      </CardContent>
    </Card>
  )
} 