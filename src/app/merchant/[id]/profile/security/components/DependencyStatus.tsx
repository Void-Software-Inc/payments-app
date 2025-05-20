'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { usePaymentClient, DepStatus } from '@/hooks/usePaymentClient';
import { Transaction } from '@mysten/sui/transactions';
import { toast } from 'sonner';
import { useCurrentAccount, useSignTransaction, useSuiClient } from '@mysten/dapp-kit';
import { signAndExecute } from '@/utils/Tx';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function DependencyStatus() {
  const [deps, setDeps] = useState<DepStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { getDepsStatus, updateVerifiedDeps } = usePaymentClient();
  const params = useParams();
  const paymentAccountId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
  const currentAccount = useCurrentAccount();
  const signTransaction = useSignTransaction();
  const suiClient = useSuiClient();

  const fetchDeps = async () => {
    if (!currentAccount?.address) return;
    
    try {
      setLoading(true);
      const depsData = await getDepsStatus(
        currentAccount.address, 
        paymentAccountId
      );
      setDeps(depsData);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
      toast.error('Failed to fetch dependencies status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeps();
  }, [currentAccount?.address, paymentAccountId]);

  const needsUpdate = deps.some(dep => dep.latestVersion > dep.currentVersion);

  const handleUpdate = async () => {
    if (!currentAccount?.address || !suiClient) return;
    
    try {
      setUpdating(true);
      const tx = new Transaction();
      
      // Prepare transaction for updating deps
      // No need to await here as it doesn't return a Promise
      updateVerifiedDeps(currentAccount.address, tx, paymentAccountId);
      
      // Sign and execute the transaction
      await signAndExecute({
        suiClient,
        currentAccount,
        tx,
        signTransaction,
        toast,
      });
      
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
