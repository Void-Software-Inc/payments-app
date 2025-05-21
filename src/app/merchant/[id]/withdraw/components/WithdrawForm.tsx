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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

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
}

interface BalanceInfo {
  total: bigint;
  locked: bigint;
  available: bigint;
}

export function WithdrawForm({ accountId, isOwner }: WithdrawFormProps) {
  const { initiateWithdraw, getPaymentAccount, getLockedObjectsId, getCoinInstances } = usePaymentClient()
  const currentAccount = useCurrentAccount()
  const suiClient = useSuiClient()
  const signTransaction = useSignTransaction()
  
  const [amount, setAmount] = useState("")
  const [recipient, setRecipient] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { refreshClient } = usePaymentStore()
  const refreshCounter = usePaymentStore(state => state.refreshCounter);
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo>({
    total: BigInt(0),
    locked: BigInt(0),
    available: BigInt(0)
  })
  const [amountError, setAmountError] = useState<string | null>(null);
  
  // Fetch account balance information
  useEffect(() => {
    const fetchBalanceInfo = async () => {
      if (!currentAccount?.address || !accountId) return;
      
      try {
        // Get payment account
        await getPaymentAccount(currentAccount.address, accountId);
        
        // Get all USDC coin instances
        const coinInstances = await getCoinInstances(
          currentAccount.address,
          accountId,
          USDC_COIN_TYPE
        );
        
        // Get locked objects
        const lockedObjects = await getLockedObjectsId(
          currentAccount.address,
          accountId
        );
        
        // Calculate total and locked balances
        let totalBalance = BigInt(0);
        let lockedBalance = BigInt(0);
        
        // Sum up all coin instances
        coinInstances.forEach(coin => {
          const amount = BigInt(coin.amount);
          totalBalance += amount;
          
          // If this coin is locked, add to locked balance
          if (lockedObjects.includes(coin.objectId)) {
            lockedBalance += amount;
          }
        });
        
        // Calculate available balance
        const availableBalance = totalBalance - lockedBalance;
        
        setBalanceInfo({
          total: totalBalance,
          locked: lockedBalance,
          available: availableBalance
        });
        
      } catch (error) {
        console.error("Error fetching balance information:", error);
      }
    };
    
    fetchBalanceInfo();
  }, [currentAccount, accountId, suiClient, refreshCounter]);
  
  // Add validation function
  const validateAmount = (value: string) => {
    if (!value) {
      setAmountError(null);
      return;
    }

    try {
      const amountBigInt = BigInt(parseFloat(value) * 1_000_000);
      if (amountBigInt <= BigInt(0)) {
        setAmountError("Amount must be greater than 0");
        return;
      }
      
      if (amountBigInt > balanceInfo.available) {
        setAmountError(`Amount exceeds available balance (${formatUSDC(balanceInfo.available)} USDC)`);
        return;
      }

      setAmountError(null);
    } catch (error) {
      setAmountError("Invalid amount");
    }
  };

  // Update amount change handler
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    validateAmount(value);
  };

  const handleInitiateWithdraw = async () => {
    if (!currentAccount?.address || !amount || !recipient) return
    
    try {
      setIsSubmitting(true);
      
      // Check if amount is valid and available
      const amountBigInt = BigInt(parseFloat(amount) * 1_000_000); // 6 decimals for USDC
      
      console.log("Withdraw Request:", {
        amount: amountBigInt.toString(),
        formattedAmount: parseFloat(amount),
        availableBalance: balanceInfo.available.toString(),
        recipient,
        accountId,
        gasAmount: GAS_BUDGET.toString()
      });
      
      // Verify sufficient balance
      if (amountBigInt > balanceInfo.available) {
        toast.error(`Insufficient available balance. Available: ${formatUSDC(balanceInfo.available)} USDC`);
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
          handleTxResult(txResult, toast);
          
          // Clear form and reset client
          setAmount("");
          setRecipient("");
          refreshClient();
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
      toast.error("Failed to initiate withdrawal: " + ((error as Error).message || String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Helper function to format USDC amounts
  const formatUSDC = (amount: bigint): string => {
    return (Number(amount) / 1_000_000).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };
  
  // If user is owner, show form to initiate withdraw
  if (isOwner) {
    return (
      <Card className="bg-[#2A2A2F] border-none shadow-lg w-full my-4">
        <CardContent className="py-1">
          <h2 className="text-xl font-semibold text-white mb-4">Initiate Withdrawal</h2>
          
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Total balance:</span>
              <span className="text-sm font-medium text-white">{formatUSDC(balanceInfo.total)} USDC</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Locked in withdrawals:</span>
              <span className="text-sm font-medium text-orange-400">{formatUSDC(balanceInfo.locked)} USDC</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Available balance:</span>
              <span className="text-sm font-medium text-green-400">{formatUSDC(balanceInfo.available)} USDC</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount"><p className="text-zinc-400 text-md">Amount (USDC)</p></Label>
              <Input
                id="amount"
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                type="number"
                min="0"
                step="0.000001"
                className={`bg-transparent border-zinc-700 text-white text-md ${amountError ? "border-red-500" : ""}`}
                autoComplete="off"
              />
              {amountError && (
                <Alert variant="destructive" className="bg-red-900/50 border-red-500/50 text-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {amountError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="space-y-2 pb-3">
              <Label htmlFor="recipient"><p className="text-zinc-400 text-md">Recipient Address</p></Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="bg-transparent border-zinc-700 text-white text-md"
              />
            </div>
            
            <Button 
              onClick={handleInitiateWithdraw}
              disabled={!amount || !recipient || isSubmitting || !!amountError}
              className="w-full h-13 rounded-full bg-[#78BCDB] hover:bg-[#68ACCC] text-white font-medium text-md"
            >
              {isSubmitting ? "Processing..." : "Initiate Withdraw"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return null;
} 