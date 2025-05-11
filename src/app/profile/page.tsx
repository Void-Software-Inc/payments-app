"use client"
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, User } from "lucide-react";
import { usePaymentClient } from '@/hooks/usePaymentClient';

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

export default function ProfilePage() {
  const currentAccount = useCurrentAccount();
  const router = useRouter();
  const { getUserProfile, getUser } = usePaymentClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Redirect to login if wallet is not connected
  useEffect(() => {
    if (!currentAccount?.address) {
      router.push('/login');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    
    // Get user data first
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
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [currentAccount?.address, router]);

  // If not connected, show nothing while redirecting
  if (!currentAccount?.address) {
    return null;
  }

  return (
    <div>
        <h1 className='p-20 text-bold text-white'>Profile</h1>
    </div>

  );
} 