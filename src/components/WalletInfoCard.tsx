"use client"
import { useCurrentAccount } from '@mysten/dapp-kit';
import { ChevronRight, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { truncateMiddle } from '@/utils/formatters';
import { usePaymentClient } from '@/hooks/usePaymentClient';
import { useEffect, useState } from 'react';

// Define our local Profile type that accepts null values
interface UserProfile {
  avatar?: string | null;
  username?: string | null;
}

interface WalletInfoCardProps {
  merchantId?: string;
}

export function WalletInfoCard({ merchantId }: WalletInfoCardProps) {
  const currentAccount = useCurrentAccount();
  const router = useRouter();
  const { getUserProfile } = usePaymentClient();
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only run this if we have an address
    if (!currentAccount?.address) return;
    
    let isMounted = true;
    setIsLoading(true);
    
    getUserProfile(currentAccount.address)
      .then(profile => {
        if (isMounted && profile?.avatar) {
          setProfilePic(profile.avatar);
        }
      })
      .catch(err => {
        console.error('Error fetching profile:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [currentAccount?.address]);

  if (!currentAccount?.address) return null;

  const handleProfileClick = () => {
    if (merchantId) {
      router.push(`/merchant/${merchantId}/profile`);
    } else {
      router.push('/profile');
    }
  };

  return (
    <div 
      onClick={handleProfileClick}
      className="p-5 rounded-lg border border-gray-700 bg-[#2A2A2F] shadow-lg cursor-pointer hover:bg-[#33333A] transition-colors"
    >
      <div className="flex justify-between items-center">
        <div className="flex flex-col w-1/2">
          <h2 className="text-lg font-semibold mb-2 text-gray-300">Connected Wallet</h2>
          <p className="font-mono text-sm text-gray-400">
            {truncateMiddle(currentAccount.address, 8, 6)}
          </p>
        </div>
        <div className="w-1/2 flex items-center justify-end space-x-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-gray-700">
            {profilePic ? (
              <div 
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${profilePic})` }}
              />
            ) : (
              <User size={20} className="text-gray-300" />
            )}
          </div>
          <ChevronRight size={24} className="text-gray-400" />
        </div>
      </div>
    </div>
  );
}
