"use client"
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { usePaymentClient } from '@/hooks/usePaymentClient';
import { usePaymentStore } from "@/store/usePaymentStore";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

// Import components from profile folder
import { ProfileHeader } from '@/app/profile/components/ProfileHeader';
import { ProfileAvatar } from '@/app/profile/components/ProfileAvatar';
import { ProfileInfo } from '@/app/profile/components/ProfileInfo';
import { ProfileSections } from './components/ProfileSections';

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
  const { mutate: disconnect } = useDisconnectWallet();
  const pathname = usePathname();
  const { getUserProfile, getUser } = usePaymentClient();
  const { triggerRefresh } = usePaymentStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  
  // Trigger refresh when navigating to profile page
  useEffect(() => {
    if (currentAccount?.address) {
      triggerRefresh();
    }
  }, [currentAccount?.address, pathname, triggerRefresh]);
  
  // Redirect to login if wallet is not connected and fetch profile data
  useEffect(() => {
    // If not connected, redirect to login
    if (!currentAccount?.address) {
      router.push('/login');
      return;
    }

    // Don't fetch again if we've already loaded data
    if (!isLoading && profile !== null) {
      return;
    }
    
    const loadProfileData = async () => {
      try {
        setIsLoading(true);
        
        // First try to get user data
        const userData = await getUser(currentAccount.address);
        setUserData(userData || null);
        
        // Check if user has profile info
        if (userData?.profile) {
          setProfile(userData.profile);
        } else {
          // Try getUserProfile as fallback
          try {
            const profileData = await getUserProfile(currentAccount.address);
            setProfile(profileData);
          } catch (profileErr) {
            console.error("Error loading profile:", profileErr);
            // Still continue without profile data
            setProfile({ username: null, avatar: null });
          }
        }
      } catch (err) {
        console.error("Error loading user data:", err);
        setError("Failed to load profile data");
        // Set empty profile to allow UI to render
        setProfile({ username: null, avatar: null });
      } finally {
        setIsLoading(false);
        hasInitialized.current = true;
      }
    };
    
    loadProfileData();
  }, [currentAccount?.address, router]);

  // If not connected, show nothing while redirecting
  if (!currentAccount?.address) {
    return null;
  }

  return (
    <div className="w-dvw h-dvh container mx-auto px-4 max-w-md pt-6">
      <div className="mb-6 flex justify-center items-center">
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-pulse">Loading profile...</div>
        </div>
      ) : error ? (
        <div className="text-center py-10 text-red-500">{error}</div>
      ) : (
        <>
          <div className="py-4">
            <ProfileAvatar avatar={profile?.avatar} />
            <div className="flex flex-col items-center">
              <ProfileInfo 
                username={profile?.username} 
                address={currentAccount.address} 
              />
            </div>
            <ProfileSections username={profile?.username} />
          </div>
          
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              onClick={() => disconnect()}
              className="bg-transparent text-[#78BCDB] border-[#78BCDB] font-bold rounded-full flex items-center gap-2 w-[200px] h-12 max-w-xs"
            >
              <LogOut className="h-5 w-5" />
              Disconnect
            </Button>
          </div>
        </>
      )}
    </div>
  );
} 