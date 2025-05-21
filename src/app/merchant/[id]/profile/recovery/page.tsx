'use client';

import { useParams } from 'next/navigation';
import RecoveryAddressForm, { RecoveryAddressList } from './components/RecoveryAddressForm';
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { usePaymentClient } from '@/hooks/usePaymentClient';
import { toast } from 'sonner';
import { usePaymentStore } from '@/store/usePaymentStore';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

export default function RecoveryPage() {
  const params = useParams();
  const id = params.id as string;
  const currentAccount = useCurrentAccount();
  const userAddress = currentAccount?.address;
  const { getPaymentAccount, isOwnerAddress } = usePaymentClient();
  const refreshCounter = usePaymentStore(state => state.refreshCounter);
  const [recoveryAddresses, setRecoveryAddresses] = useState<Array<{ address: string, username?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  // Fetch recovery addresses and check owner status on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!userAddress) return;
      
      try {
        setIsLoading(true);
        
        // Check if current user is owner
        const ownerStatus = await isOwnerAddress(userAddress, id);
        setIsOwner(ownerStatus);
        
        // Only fetch recovery addresses if user is owner
        if (ownerStatus) {
          const account = await getPaymentAccount(userAddress, id);
          
          if (account?.members && account.members.length > 1) {
            // Get all members after index 0 (which is the primary owner)
            const recoveryMemberList = account.members.slice(1).map(member => ({
              address: member.address,
              username: member.username
            }));
            
            setRecoveryAddresses(recoveryMemberList);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load account data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userAddress, id, refreshCounter]);

  return (
    <div className="h-dvh w-dvw flex justify-center items-center">
      <div className="w-[90%] h-full pt-6 space-y-6">
        {/* Main Content */}
        <div className="flex items-center justify-center mb-6">
          <h1 className='text-2xl font-bold text-white'>Account Recovery</h1>
        </div>
        
        {!isLoading && !isOwner ? (
          <Alert variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>
              Only the owner of this payment account can manage recovery addresses. 
              If you need to be added as a recovery address, please contact the account owner.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Form Card */}
            <Card className="w-full bg-[#2A2A2F] border-[#33363A] rounded-lg shadow-lg">
              <CardContent className="space-y-6 my-3">
                <p className="text-gray-400 text-sm">
                  Set up a recovery address that can help you regain access to your account if you lose your keys.
                </p>
                <RecoveryAddressForm accountId={id} />
              </CardContent>
            </Card>
            
            {/* Recovery Addresses Card */}
            {(isLoading || recoveryAddresses.length > 0) && (
              <Card className="w-full bg-[#2A2A2F] border-[#33363A] rounded-lg shadow-lg mt-6">
                <CardContent className="space-y-4 my-0">
                  <h3 className="text-md font-medium text-[#c8c8c8]">Current Recovery Addresses</h3>
                  <RecoveryAddressList 
                    recoveryAddresses={recoveryAddresses} 
                    isLoading={isLoading} 
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
} 