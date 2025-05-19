"use client";

import React, { useEffect, useState, useRef } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { 
  useSuiClient, 
  useCurrentAccount, 
  useSignTransaction 
} from "@mysten/dapp-kit";
import { toast } from "sonner";
import { usePaymentClient, DepStatus } from "@/hooks/usePaymentClient";
import { signAndExecute, handleTxResult } from "@/utils/Tx";
import { DependencyStatus } from "./components/DependencyStatus";

export default function SecurityPage() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const signTransaction = useSignTransaction();
  const { getDepsStatus, updateVerifiedDeps } = usePaymentClient();
  
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [depsStatus, setDepsStatus] = useState<DepStatus[]>([]);
  
  // Use a ref to track if we're already fetching to prevent multiple concurrent calls
  const isFetchingRef = useRef(false);
  
  const connected = !!currentAccount?.address;
  const address = currentAccount?.address || "";
  
  // Simple effect to fetch deps status on mount and when address changes
  useEffect(() => {
    // Skip if not connected or no address
    if (!connected || !address) {
      return;
    }
    
    // Skip if already fetching
    if (isFetchingRef.current) {
      return;
    }
    
    const fetchData = async () => {
      try {
        // Mark as fetching
        isFetchingRef.current = true;
        setLoading(true);
        
        const status = await getDepsStatus(address);
        setDepsStatus(status);
      } catch (error) {
        console.error("Failed to fetch dependencies status:", error);
      } finally {
        setLoading(false);
        // Mark as no longer fetching
        isFetchingRef.current = false;
      }
    };
    
    fetchData();
  }, [connected, address]); // Do NOT include getDepsStatus here
  
  const handleUpdateDeps = async () => {
    if (!connected || !address) {
      toast.error("Please connect your wallet");
      return;
    }
    
    try {
      setUpdating(true);
      
      // Create a new transaction
      const tx = new Transaction();
      
      // Sign and execute the transaction
      const txResult = await signAndExecute({
        suiClient,
        currentAccount: { address },
        tx,
        signTransaction: signTransaction,
        toast,
      });
      
      // Handle transaction result with the proper toast notification
      handleTxResult(txResult, toast);
      
      // Call updateVerifiedDeps with the transaction
      await updateVerifiedDeps(address, tx);
      
      // Fetch updated deps status
      if (!isFetchingRef.current) {
        isFetchingRef.current = true;
        try {
          const updatedStatus = await getDepsStatus(address);
          setDepsStatus(updatedStatus);
        } finally {
          isFetchingRef.current = false;
        }
      }
      
    } catch (error) {
      console.error("Failed to update dependencies:", error);
      toast.error("Failed to update dependencies");
    } finally {
      setUpdating(false);
    }
  };
  
  if (!connected) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Security</h1>
        <p>Please connect your wallet to view security settings.</p>
      </div>
    );
  }
  
  return (
    <div className="w-dvw h-dvh container mx-auto px-4 max-w-md pt-6 overflow-y-auto">
        <div className="mb-6 flex justify-center items-center">
            <h1 className="text-2xl font-bold mb-4 text-white">Security Settings</h1>
        </div>
      
      <DependencyStatus
        depsStatus={depsStatus}
        loading={loading}
        updating={updating}
        onUpdate={handleUpdateDeps}
      />
    </div>
  );
} 