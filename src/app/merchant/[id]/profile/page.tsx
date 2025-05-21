"use client"
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useRouter, useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { usePaymentClient } from '@/hooks/usePaymentClient';
import { usePaymentStore } from "@/store/usePaymentStore";

// Import components from profile folder
import { ProfileHeader } from '@/app/profile/components/ProfileHeader';
import { ProfileAvatar } from '@/app/profile/components/ProfileAvatar';
import { ProfileInfo } from '@/app/profile/components/ProfileInfo';
import { MerchantProfileSections } from './components/MerchantProfileSections';

// Define our local Profile type that accepts null values
interface UserProfile {
  avatar?: string | null;
  username?: string | null;
}

interface UserData {
  accountType?: string;
  accountId?: string;
  profile?: UserProfile;
  [key: string]: any;
}

export default function MerchantProfilePage() {
  const currentAccount = useCurrentAccount();
  const router = useRouter();
  const params = useParams();
  const paymentAccountId = params.id as string;
  const { getUserProfile, getUser, getPaymentAccount } = usePaymentClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentAccount, setPaymentAccount] = useState<any>(null);
  
  // Redirect to login if wallet is not connected
  useEffect(() => {
    if (!currentAccount?.address) {
      router.push('/login');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    
    // Get payment account data
    getPaymentAccount(currentAccount.address, paymentAccountId)
      .then(paymentAccount => {
        if (!isMounted) return;
        
        // Get user data for this payment account
        getUser(currentAccount.address)
          .then(user => {
            if (!isMounted) return;
            
            setUserData(user || null);
            
            // If user has profile info, use that
            if (user?.profile) {
              setProfile(user.profile);
              setIsLoading(false);
            } else {
              // Otherwise try getUserProfile as fallback
              getUserProfile(currentAccount.address)
                .then(profileData => {
                  if (isMounted) {
                    setProfile(profileData);
                    setIsLoading(false);
                  }
                })
                .catch(err => {
                  console.error("Error loading profile:", err);
                  if (isMounted) {
                    // Just show the page without profile data
                    setIsLoading(false);
                  }
                });
            }
          })
          .catch(err => {
            console.error("Error loading user data:", err);
            if (isMounted) {
              setError("Failed to load profile data");
              setIsLoading(false);
            }
          });
      })
      .catch(err => {
        console.error("Error loading payment account:", err);
        if (isMounted) {
          setError("Failed to load payment account");
          setIsLoading(false);
        }
      });
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [currentAccount?.address, paymentAccountId, router]);

  // If not connected, show nothing while redirecting
  if (!currentAccount?.address) {
    return null;
  }

  return (
    <div className="w-dvw h-dvh container mx-auto px-4 max-w-md pt-6">
      <div className="mb-6 flex justify-center items-center">
        <h1 className="text-2xl font-bold text-white">Merchant Profile</h1>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-pulse">Loading profile...</div>
        </div>
      ) : error ? (
        <div className="text-center py-10 text-red-500">{error}</div>
      ) : (
        <div className="py-4">
          <ProfileAvatar avatar={profile?.avatar} />
          <div className="flex flex-col items-center">
            <ProfileInfo 
              username={profile?.username} 
              address={paymentAccount?.id || paymentAccountId} 
            />
          </div>
          <MerchantProfileSections username={profile?.username} />
        </div>
      )}
    </div>
  );
} 