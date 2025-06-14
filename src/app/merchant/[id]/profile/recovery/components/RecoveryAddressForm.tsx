'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { toast } from 'sonner';
import { usePaymentClient } from '@/hooks/usePaymentClient';
import { signAndExecute } from '@/utils/Tx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSuiClient, useSignTransaction } from '@mysten/dapp-kit';
import { usePaymentStore } from '@/store/usePaymentStore';

// Validate SUI address format
const isValidSuiAddress = (address: string): boolean => {
  // SUI addresses start with 0x followed by 64 hex characters
  const suiAddressRegex = /^0x[a-fA-F0-9]{64}$/;
  return suiAddressRegex.test(address);
};

export function RecoveryAddressList({ recoveryAddresses, isLoading }: { 
  recoveryAddresses: Array<{ address: string, username?: string }>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <p className="text-sm text-gray-400">Loading recovery addresses...</p>;
  }
  
  if (recoveryAddresses.length === 0) {
    return <p className="text-sm text-gray-400">No recovery addresses set up yet.</p>;
  }
  
  return (
    <div className="space-y-2">
      {recoveryAddresses.map((address, index) => (
        <div key={index} className="p-3 bg-[#232326] border border-[#39393B] rounded-lg">
          <p className="text-sm font-mono break-all text-white">
            {address.username && (
              <span className="text-[#78BCDB] mr-2">{address.username}:</span>
            )}
            {address.address}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function RecoveryAddressForm({ accountId }: { accountId: string }) {
  const currentAccount = useCurrentAccount();
  const userAddress = currentAccount?.address;
  const [recoveryAddressString, setRecoveryAddressString] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [recoveryAddresses, setRecoveryAddresses] = useState<Array<{ address: string, username?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClientReady, setIsClientReady] = useState(false);
  const { setRecoveryAddress, getPaymentAccount } = usePaymentClient();
  const { refreshClient } = usePaymentStore();
  const refreshCounter = usePaymentStore(state => state.refreshCounter);
  const suiClient = useSuiClient();
  const signTransaction = useSignTransaction();

  // Fetch recovery addresses and ensure client is ready
  useEffect(() => {
    const fetchRecoveryAddresses = async () => {
      if (!userAddress) return;
      
      try {
        setIsLoading(true);
        const account = await getPaymentAccount(userAddress, accountId);
        
        if (account?.members && account.members.length > 1) {
          // Get all members after index 0 (which is the primary owner)
          const recoveryMemberList = account.members.slice(1).map(member => ({
            address: member.address,
            username: member.username
          }));
          
          setRecoveryAddresses(recoveryMemberList);
        }
        
        setIsClientReady(true);
      } catch (error) {
        console.error('Error fetching recovery addresses:', error);
        toast.error('Failed to load recovery addresses');
        setIsClientReady(false);
        // Retry after a delay
        setTimeout(fetchRecoveryAddresses, 1000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecoveryAddresses();
  }, [userAddress, accountId, refreshCounter]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRecoveryAddressString(value);
    
    // Clear error if field is empty
    if (!value) {
      setAddressError(null);
      return;
    }
    
    // Validate address format
    if (!isValidSuiAddress(value)) {
      setAddressError('Invalid SUI address format. Must start with 0x followed by 64 hex characters.');
    } else {
      setAddressError(null);
    }
  };

  const handleSetRecovery = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recoveryAddressString || !userAddress) {
      toast.error('Please enter a recovery address');
      return;
    }
    
    if (!isValidSuiAddress(recoveryAddressString)) {
      setAddressError('Invalid SUI address format. Must start with 0x followed by 64 hex characters.');
      toast.error('Invalid SUI address format');
      return;
    }

    if (!isClientReady) {
      toast.error('Payment client is still initializing. Please wait a moment and try again.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Retry logic for setRecoveryAddress
      let retryCount = 0;
      const maxRetries = 2;
      let lastError = null;
      
      while (retryCount <= maxRetries) {
        try {
          // Create a transaction block
          const tx = new Transaction();
          
          // Call setRecoveryAddress from the hook
          await setRecoveryAddress(userAddress, accountId, tx, recoveryAddressString);

          // Sign and execute the transaction
          const result = await signAndExecute({
            suiClient,
            currentAccount: userAddress,
            tx,
            signTransaction,
            toast,
          });

          if (result.effects?.status?.status === 'success') {
            // Reset client
            refreshClient();
            
            setRecoveryAddressString('');
            
            // Add the new recovery address to the list
            setRecoveryAddresses(prev => [...prev, { address: recoveryAddressString }]);
            
            return; // Success, exit the function
          } else {
            throw new Error('Transaction failed');
          }
        } catch (error: any) {
          lastError = error;
          retryCount++;
          
          // If it's a user rejection, don't retry
          if (error.message?.includes('User rejected')) {
            throw error;
          }
          
          if (retryCount <= maxRetries) {
            console.log(`Recovery address attempt ${retryCount} failed, retrying...`);
            // Wait briefly before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      // If we get here, all retries failed
      throw lastError;
      
    } catch (error: any) {
      console.error('Error setting recovery address:', error);
      
      // Handle user rejection of transaction
      if (error.message?.includes('User rejected')) {
        toast.error('Transaction canceled by user');
        return;
      }
      
      toast.error(error instanceof Error ? error.message : 'Failed to set recovery address');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSetRecovery} className="space-y-4">
      <div>
        <label htmlFor="recovery-address" className="block text-sm font-medium mb-1 text-[#c8c8c8]">
          Recovery Address
        </label>
        <Input
          id="recovery-address"
          value={recoveryAddressString}
          onChange={handleAddressChange}
          placeholder="Enter a Sui address (0x...)"
          className={`h-12 bg-transparent border-[#5E6164] rounded-lg text-white ${addressError ? 'border-amber-500' : ''}`}
          disabled={isSubmitting || !isClientReady}
          required
        />
        {addressError && (
          <p className="text-sm text-amber-500 mt-1">{addressError}</p>
        )}
      </div>
      <div className='w-full h-fit flex justify-center'>
      <Button
        type="submit"
        disabled={isSubmitting || !recoveryAddressString || addressError !== null || !isClientReady}
        className="w-max-[300px] px-6 h-13 mt-4 rounded-full bg-[#78BCDB] hover:bg-[#68ACCC] text-white font-medium text-lg"
      >
        {isSubmitting ? 'Setting up...' : isClientReady ? 'Set Recovery Address' : 'Initializing...'}
      </Button>
      </div>
    </form>
  );
} 