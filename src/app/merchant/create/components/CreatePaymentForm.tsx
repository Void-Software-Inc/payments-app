"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePaymentStore } from "@/store/usePaymentStore"
import { usePaymentClient } from "@/hooks/usePaymentClient"
import { useCurrentAccount, useSignTransaction, useSuiClient } from "@mysten/dapp-kit"
import { useRouter } from "next/navigation"
import { Transaction } from "@mysten/sui/transactions"
import { signAndExecute, handleTxResult } from "@/utils/Tx"
import { toast } from "sonner"

export function CreatePaymentForm() {
  const [name, setName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { getOrInitClient, triggerRefresh, resetClient } = usePaymentStore()
  const { createPaymentAccount } = usePaymentClient()
  const currentAccount = useCurrentAccount()
  const signTransaction = useSignTransaction()
  const suiClient = useSuiClient()
  const router = useRouter()
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError("Please enter a name for the payment account")
      return
    }
    
    if (!currentAccount?.address) {
      setError("Please connect your wallet")
      return
    }
    
    try {
      setIsCreating(true)
      setError(null)
      
      const client = await getOrInitClient(currentAccount.address)
      
      if (!client) {
        throw new Error("Client not initialized")
      }
      
      // Check if user has an ID, if empty provide username and profile picture
      const newUserParams = !client.user?.id 
        ? { username: currentAccount.address, profilePicture: "" }
        : undefined;

     // Create a new transaction block
      const tx = new Transaction();
        
      // Call createPaymentAccount
      createPaymentAccount(currentAccount.address ,tx, name, newUserParams)
      
      // Execute the transaction using the Tx utility
      const txResult = await signAndExecute({
        suiClient,
        currentAccount,
        tx,
        signTransaction,
        toast
      });

      handleTxResult(txResult, toast);
      
      console.log("Transaction result:", txResult);
      
      // Reset the client to force a fresh load on the next page
      resetClient();
      
      // Trigger a refresh in the store
      triggerRefresh();
      
      router.push("/merchant");
      
    } catch (err) {
      console.error("Error creating payment account:", err)
      setError("Failed to create payment account");
      console.error("Error creating payment account:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create payment account");
    } finally {
      setIsCreating(false)
    }
  }
  
  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-white">Payment Account Name</Label>
          <Input
            id="name"
            placeholder="Enter account name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12"
            required
          />
        </div>
        
        {error && <div className="text-red-500 text-sm">{error}</div>}
        
        <Button
          type="submit"
          className="w-full h-12 rounded-full font-medium"
          style={{ backgroundColor: "#78BCDB", borderColor: "#78BCDB" }}
          disabled={isCreating}
        >
          {isCreating ? "Creating..." : "Create Payment Account"}
        </Button>
      </form>
    </div>
  )
} 