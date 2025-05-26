"use client"

import { useState, useEffect } from "react"
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
  const [username, setUsername] = useState("")
  const [profilePicture, setProfilePicture] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isClientReady, setIsClientReady] = useState(false)
  
  const { refreshClient } = usePaymentStore()
  const { createPaymentAccount, getUser } = usePaymentClient()
  const currentAccount = useCurrentAccount()
  const signTransaction = useSignTransaction()
  const suiClient = useSuiClient()
  const router = useRouter()
  
  // Ensure payment client is initialized
  useEffect(() => {
    const checkClientReady = async () => {
      try {
        if (currentAccount?.address) {
          await getUser(currentAccount.address)
          setIsClientReady(true)
        }
      } catch (err) {
        console.log("Payment client initializing...")
        // Wait and try again
        setTimeout(checkClientReady, 1000)
      }
    }
    
    checkClientReady()
  }, [currentAccount?.address, getUser])
  
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
      
      // Get current user to check if user has an ID
      let currentUser = null
      let retryCount = 0
      const maxRetries = 2
      
      // Retry getUser if it fails initially
      while (retryCount <= maxRetries) {
        try {
          currentUser = await getUser(currentAccount.address)
          break
        } catch (err) {
          retryCount++
          if (retryCount > maxRetries) {
            throw new Error("Failed to retrieve user data. Please try again.")
          }
          // Wait briefly before retrying
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      // Create a new transaction block
      const tx = new Transaction()
      
      // Set username to the trimmed input value, or use wallet address as fallback
      const userUsername = username.trim() || undefined
      
      // Use the provided profile picture URL if available
      const userProfilePicture = profilePicture.trim() || undefined
      
      // Check if user has an ID, if empty provide username and profile picture
      const newUserParams = !currentUser?.id
        ? { 
            username: userUsername || currentAccount.address, 
            profilePicture: userProfilePicture || "" 
          }
        : undefined
        
      // Call createPaymentAccount
      createPaymentAccount(currentAccount.address, tx, name, newUserParams)
      
      // Execute the transaction
      const txResult = await signAndExecute({
        suiClient,
        currentAccount,
        tx,
        signTransaction,
        toast
      }).catch(err => {
        // Handle user rejection of transaction
        if (err.message?.includes('User rejected')) {
          toast.error("Transaction canceled by user")
          return null
        }
        throw err
      })
      
      // If transaction was rejected, stop processing
      if (!txResult) {
        return
      }

      handleTxResult(txResult, toast)
      
      // Reset the client
      refreshClient()
      
      router.push("/merchant")
      
    } catch (err) {
      console.error("Error creating payment account:", err)
      setError(err instanceof Error ? err.message : "Failed to create payment account")
      toast.error(err instanceof Error ? err.message : "Failed to create payment account")
    } finally {
      setIsCreating(false)
    }
  }
  
  return (
    <div className="h-full w-full bg-[#1B1D22] flex flex-col items-center justify-center pt-24">
      <div className="w-[90%] max-w-md">
        <h1 className="text-4xl font-bold text-white mb-16 text-center">Create Account</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[#B2B2B2]">Name</Label>
            <Input
              id="name"
              placeholder="Enter account name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 bg-[#2A2A2F] border-[#595C5F] text-white"
              required
              autoComplete="off"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username" className="text-[#B2B2B2]">Username (Coming soon)</Label>
            <Input
              id="username"
              placeholder=""
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-12 bg-[#2A2A2F] border-[#595C5F] text-white"
              autoComplete="off"
              disabled
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="profilePicture" className="text-[#B2B2B2]">Profile Picture URL (Coming soon)</Label>
            <Input
              id="profilePicture"
              placeholder=""
              value={profilePicture}
              onChange={(e) => setProfilePicture(e.target.value)}
              className="h-12 bg-[#2A2A2F] border-[#595C5F] text-white"
              autoComplete="off"
              disabled
            />
          </div>
          
          {error && <div className="text-red-500 text-sm">{error}</div>}
          
          <Button
            type="submit"
            className="w-full h-12 rounded-full font-medium mt-8"
            style={{ backgroundColor: "#78BCDB", borderColor: "#78BCDB" }}
            disabled={isCreating || !currentAccount}
          >
            {isCreating ? "Creating..." : "Create Account"}
          </Button>
        </form>
      </div>
    </div>
  )
} 