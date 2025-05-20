"use client"

import { useState } from "react"
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
const GAS_BUDGET = 10000000 // 0.01 SUI

interface WithdrawFormProps {
  accountId: string
  isOwner: boolean
  isBackup: boolean
  pendingWithdraws: Record<string, any>
}

export function WithdrawForm({ accountId, isOwner, isBackup, pendingWithdraws }: WithdrawFormProps) {
  const { initiateWithdraw, completeWithdraw } = usePaymentClient()
  const currentAccount = useCurrentAccount()
  const suiClient = useSuiClient()
  const signTransaction = useSignTransaction()
  
  const [amount, setAmount] = useState("")
  const [recipient, setRecipient] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { resetClient } = usePaymentStore()
  
  const hasPendingWithdraws = Object.keys(pendingWithdraws).length > 0
  
  
  
  const handleInitiateWithdraw = async () => {
    if (!currentAccount?.address || !amount || !recipient) return
    
    try {
      setIsSubmitting(true)
      
      // Create transaction with gas budget
      const tx = new Transaction()
      
      // Convert amount to USDC with 6 decimals
      const amountBigInt = BigInt(parseFloat(amount) * 1_000_000) // 6 decimals for USDC
      const key = `withdraw_${Date.now()}`
      
      // Add withdraw action to transaction
      await initiateWithdraw(
        currentAccount.address,
        accountId,
        tx,
        key,
        USDC_COIN_TYPE,
        amountBigInt,
        recipient
      )

      console.log("currentAccount = ", currentAccount.address)
      console.log("accountId = ", accountId)
      console.log("tx = ", tx)
      console.log("key = ", key)
      console.log("USDC_COIN_TYPE = ", USDC_COIN_TYPE)
      console.log("amountBigInt = ", amountBigInt)
      console.log("recipient = ", recipient)
      
      const result = await signAndExecute({
        suiClient,
        currentAccount,
        tx,
        signTransaction,
        options: {showEffect: true},
        toast
      });

      handleTxResult(result, toast);
      resetClient();
      usePaymentStore.getState().triggerRefresh();
      
    } catch (error) {
      console.error("Error initiating withdraw:", error)
      toast.error("Failed to initiate withdrawal: " + ((error as Error).message || String(error)))
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleCompleteWithdraw = async (key: string) => {
    if (!currentAccount?.address) return
    
    try {
      setIsSubmitting(true)
      
      // Create transaction
      const tx = new Transaction()
      
      // Add complete withdraw action to transaction
      await completeWithdraw(
        currentAccount.address,
        accountId,
        tx,
        key
      )
      
      const result = await signAndExecute({
        suiClient,
        currentAccount,
        tx,
        signTransaction,
        options: {showEffect: true},
        toast
      });

      handleTxResult(result, toast);
      resetClient();
      usePaymentStore.getState().triggerRefresh();

    } catch (error) {
      console.error("Error completing withdraw:", error)
      toast.error("Failed to complete withdrawal: " + ((error as Error).message || String(error)))
    } finally {
      setIsSubmitting(false)
    }
  }
  
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