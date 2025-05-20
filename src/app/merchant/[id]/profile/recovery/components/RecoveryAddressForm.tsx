'use client';

import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { toast } from 'sonner';
import { usePaymentClient } from '@/hooks/usePaymentClient';
import { signAndExecute } from '@/utils/Tx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSuiClient, useSignTransaction } from '@mysten/dapp-kit';

// Validate SUI address format
const isValidSuiAddress = (address: string): boolean => {
  // SUI addresses start with 0x followed by 64 hex characters
  const suiAddressRegex = /^0x[a-fA-F0-9]{64}$/;
  return suiAddressRegex.test(address);
};

export default function RecoveryAddressForm({ accountId }: { accountId: string }) {
  const currentAccount = useCurrentAccount();
  const userAddress = currentAccount?.address;
  const [recoveryAddressString, setRecoveryAddressString] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const { setRecoveryAddress } = usePaymentClient();
  const suiClient = useSuiClient();
  const signTransaction = useSignTransaction();

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
    
    try {
      setIsSubmitting(true);
      
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
        setRecoveryAddressString('');
      } else {
        toast.error('Failed to set recovery address');
      }
    } catch (error) {
      console.error('Error setting recovery address:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to set recovery address');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSetRecovery} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="recovery-address" className="block text-sm font-medium mb-1">
          Recovery Address
        </label>
        <Input
          id="recovery-address"
          value={recoveryAddressString}
          onChange={handleAddressChange}
          placeholder="Enter a Sui address (0x...)"
          className={`w-full ${addressError ? 'border-red-500' : ''}`}
          disabled={isSubmitting}
          required
        />
        {addressError && (
          <p className="text-sm text-red-500 mt-1">{addressError}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          The recovery address must be a valid SUI address (starts with 0x followed by 64 hex characters)
        </p>
      </div>
      
      <Button
        type="submit"
        disabled={isSubmitting || !recoveryAddressString || addressError !== null}
        className="w-full"
      >
        {isSubmitting ? 'Setting up...' : 'Set Recovery Address'}
      </Button>
    </form>
  );
} 