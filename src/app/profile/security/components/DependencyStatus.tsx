'use client';

import { useState, useEffect, useRef } from 'react';
import { usePaymentClient, DepStatus } from '@/hooks/usePaymentClient';
import { Transaction } from '@mysten/sui/transactions';
import { toast } from 'sonner';
import { useCurrentAccount, useSignTransaction, useSuiClient } from '@mysten/dapp-kit';
import { signAndExecute, handleTxResult } from '@/utils/Tx';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function DependencyStatus() {
  const [deps, setDeps] = useState<DepStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { getDepsStatus, updateVerifiedDeps } = usePaymentClient();
  const currentAccount = useCurrentAccount();
  const signTransaction = useSignTransaction();
  const suiClient = useSuiClient();
  
  // Use a ref to track if we're already fetching to prevent multiple concurrent calls
  const isFetchingRef = useRef(false);
  
  const connected = !!currentAccount?.address;
  const address = currentAccount?.address || "";

  const fetchDeps = async () => {
    if (!connected || !address) return;
    
    // Skip if already fetching
    if (isFetchingRef.current) {
      return;
    }
    
    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      console.log("Fetching dependencies status for address:", address);
      const depsData = await getDepsStatus(address);
      console.log("Dependencies status fetched:", depsData);
      setDeps(depsData);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
      toast.error('Failed to fetch dependencies status');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchDeps();
  }, [connected, address]);

  const needsUpdate = deps.some(dep => dep.latestVersion > dep.currentVersion);

  const handleUpdate = async () => {
    if (!connected || !address) {
      toast.error("Please connect your wallet");
      return;
    }
    
    try {
      setUpdating(true);
      const tx = new Transaction();
      
      // Sign and execute the transaction
      const txResult = await signAndExecute({
        suiClient,
        currentAccount: { address },
        tx,
        signTransaction,
        toast,
      });
      
      // Handle transaction result with the proper toast notification
      handleTxResult(txResult, toast);
      
      // Call updateVerifiedDeps with the transaction
      await updateVerifiedDeps(address, tx);
      
      // Refresh deps status after update
      await fetchDeps();
      
      toast.success('Dependencies updated successfully');
    } catch (error) {
      console.error('Error updating dependencies:', error);
      toast.error('Failed to update dependencies');
    } finally {
      setUpdating(false);
    }
  };
  
  if (!connected) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-white">Please connect your wallet to view security settings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <Card className="w-full bg-[#2A2A2F]">
        <CardContent className="pt-6 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading dependencies status...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-[#2A2A2F] border-none">
      <CardHeader>
        <CardTitle className='text-white'>Dependencies</CardTitle>
      </CardHeader>
      <CardContent>
        {deps.length === 0 ? (
          <div className="flex items-center justify-center py-2">
            <p className="text-muted-foreground">No dependencies information available</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-2">
            {needsUpdate ? (
              <>
                <Shield className="h-5 w-5 text-amber-500" />
                <p className="text-amber-500">Updates available for one or more dependencies</p>
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5 text-green-500" />
                <p className="text-green-500">All dependencies are up to date</p>
              </>
            )}
          </div>
        )}
      </CardContent>
      {needsUpdate && (
        <CardFooter className='w-full h-fit flex justify-center'>
          <Button 
            onClick={handleUpdate} 
            disabled={updating}
            className="w-[80%] h-13 rounded-full bg-[#78BCDB] hover:bg-[#68ACCC] text-white font-medium text-md"
          >
            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {updating ? 'Updating Dependencies...' : 'Update Dependencies'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 