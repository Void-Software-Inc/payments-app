"use client"

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useSignTransaction } from "@mysten/dapp-kit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePaymentClient } from "@/hooks/usePaymentClient";
import { signAndExecute, handleTxResult } from "@/utils/Tx";
import { toast } from "sonner";
import { usePaymentStore } from "@/store/usePaymentStore";
import { Input } from "@/components/ui/input";

export default function ChangeShopNamePage() {
  const currentAccount = useCurrentAccount();
  const router = useRouter();
  const params = useParams();
  const suiClient = useSuiClient();
  const signTransaction = useSignTransaction();
  const { modifyName, getPaymentAccount } = usePaymentClient();
  const { refreshClient} = usePaymentStore();
  const refreshCounter = usePaymentStore(state => state.refreshCounter);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentName, setCurrentName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  const merchantId = params.id as string;

  // Fetch current name on page load
  useEffect(() => {
    if (!currentAccount?.address) {
      router.push('/login');
      return;
    }

    const fetchPaymentAccount = async () => {
      try {
        setIsFetching(true);
        const account = await getPaymentAccount(currentAccount.address, merchantId);
        // Get name from metadata
        const name = account?.metadata?.find(item => item.key === "name")?.value || "";
        setCurrentName(name);
        
        // Set the input value directly
        if (inputRef.current) {
          inputRef.current.value = name;
        }
      } catch (error) {
        console.error("Error fetching payment account:", error);
        toast.error("Failed to load payment account details");
      } finally {
        setIsFetching(false);
      }
    };

    fetchPaymentAccount();
  }, [currentAccount?.address, merchantId, refreshCounter]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get value directly from input
    const newName = inputRef.current?.value || "";
    
    if (!currentAccount?.address) {
      toast.error("Wallet not connected");
      return;
    }
    
    if (!newName.trim()) {
      toast.error("Shop name cannot be empty");
      return;
    }
    
    if (newName === currentName) {
      toast.info("Name unchanged");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Create a new transaction block
      const tx = new Transaction();
      
      // Call the modifyName function on the payment client
      await modifyName(currentAccount.address, merchantId, tx, newName);
      
      // Execute the transaction
      const result = await signAndExecute({
        suiClient,
        currentAccount,
        tx,
        signTransaction,
        toast,
      });
      
      // Handle the result
      handleTxResult(result, toast);
      
      // Update the current name on success
      if (result.effects?.status?.status === "success") {
        setCurrentName(newName);
        
        // Reset client
        refreshClient();
        
        // Navigate immediately
        router.push(`/merchant/${merchantId}/profile`);
      }
    } catch (error) {
      console.error("Error updating shop name:", error);
      toast.error("Failed to update shop name");
    } finally {
      setIsLoading(false);
    }
  };
  
  // If fetching data, show loading
  if (isFetching) {
    return (
      <div className="w-dvw h-dvh container mx-auto px-4 max-w-md pt-10">
        <div className="flex justify-center py-10">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-dvw h-dvh container mx-auto px-4 max-w-md pt-6 flex justify-center">
      <div className="w-[90%] h-full">
        <div className="mb-6 flex justify-center">  
          <h1 className="text-2xl font-bold text-white">Shop Name</h1>
        </div>

        <div className="w-full h-fit rounded-lg bg-[#2A2A2F] px-6 border-2 border-[#39393B] py-8">
          <div className="">
            <form onSubmit={handleUpdateName} className="space-y-1">
              <div className="space-y-3">
                <Label htmlFor="shopName" className="text-[#A1A1A2] text-md">Shop Name</Label>
                <Input
                  id="shopName"
                  ref={inputRef}
                  defaultValue={currentName}
                  placeholder="Enter shop name"
                  className="flex h-12 w-full rounded-md border border-[#7C8083] bg-transparent px-3 py-2 text-white text-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={isLoading}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 mt-4 rounded-full bg-[#78BCDB] hover:bg-[#68ACCC] text-white font-medium text-md"
                disabled={isLoading}
              >
                {isLoading ? "Updating..." : "Update"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 