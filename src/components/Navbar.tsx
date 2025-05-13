"use client"
import { ConnectModal, useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from "@/components/ui/button";
import { Wallet, ChevronLeft, Store, User, QrCode, Home } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePaymentClient } from '@/hooks/usePaymentClient';

export function Navbar() {
  const currentAccount = useCurrentAccount();
  const pathname = usePathname();
  const router = useRouter();
  const { getUserProfile } = usePaymentClient();
  const [profilePic, setProfilePic] = useState<string | null>(null);
  
  // Check paths after hooks
  const isHomePage = pathname === '/';
  const isLoginPage = pathname === '/login';
  const isMerchantMainPage = pathname === '/merchant';
  
  // Check if we're on a merchant ID page
  const merchantIdMatch = pathname.match(/^\/merchant\/([^\/]+)/);
  const merchantId = merchantIdMatch ? merchantIdMatch[1] : null;
  const isMerchantIdPage = merchantId && pathname.startsWith(`/merchant/${merchantId}`);
  
  // Check if we're on a profile page
  const isMainProfilePage = pathname === '/profile';
  const isMerchantProfilePage = merchantId && pathname === `/merchant/${merchantId}/profile`;
  
  // Check if we're on a QR code page
  const isMainQRCodePage = pathname === '/profile/qr-code';
  const isMerchantQRCodePage = merchantId && pathname === `/merchant/${merchantId}/profile/qr-code`;
  
  // Combined check for any profile or QR code page
  const isAnyQRCodePage = isMainQRCodePage || isMerchantQRCodePage;
  const isAnyProfilePage = isMainProfilePage || isMerchantProfilePage || isAnyQRCodePage;
  
  useEffect(() => {
    // Only fetch profile if we have an address
    if (!currentAccount?.address) return;
    
    let isMounted = true;
    
    getUserProfile(currentAccount.address)
      .then(profile => {
        if (isMounted && profile?.avatar) {
          setProfilePic(profile.avatar);
        }
      })
      .catch(err => {
        console.error('Error fetching profile:', err);
      });
    
    return () => {
      isMounted = false;
    };
  }, [currentAccount?.address, getUserProfile]);

  const handleBackNavigation = () => {
    // If on merchant QR code page, go to merchant profile page
    if (isMerchantQRCodePage && merchantId) {
      router.push(`/merchant/${merchantId}/profile`);
      return;
    }
    
    // If on main QR code page, go to main profile page
    if (isMainQRCodePage) {
      router.push('/profile');
      return;
    }
    
    // If on merchant deposit page, go to merchant ID page
    if (merchantId && pathname === `/merchant/${merchantId}/deposit`) {
      router.push(`/merchant/${merchantId}`);
      return;
    }
    
    // If on merchant ID page (not QR code or deposit), go to /merchant
    if (isMerchantIdPage) {
      router.push('/merchant');
      return;
    }
    
    // If on merchant main page, go to home
    if (isMerchantMainPage) {
      router.push('/');
      return;
    }
    
    // For other pages, use standard back navigation
    router.back();
  };

  const handleProfileNavigation = () => {
    if (merchantId) {
      router.push(`/merchant/${merchantId}/profile`);
    } else {
      router.push('/profile');
    }
  };
  
  const handleQrCodeNavigation = () => {
    if ((isMerchantProfilePage || isMerchantQRCodePage) && merchantId) {
      router.push(`/merchant/${merchantId}/profile/qr-code`);
    } else if (isMainProfilePage || isMainQRCodePage) {
      router.push('/profile/qr-code');
    }
  };

  const handleHomeNavigation = () => {
    if ((isMerchantProfilePage || isMerchantQRCodePage) && merchantId) {
      router.push(`/merchant/${merchantId}`);
    } else {
      router.push('/');
    }
  };

  // Don't render navbar on the login page
  if (isLoginPage) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent w-full flex justify-center h-fit" style={{ background: 'transparent' }}>
      <div className="w-[90%] flex h-16 pt-3 container bg-transparent justify-between" style={{ background: 'transparent', boxShadow: 'none' }}>
        <div className="flex items-center">
          {!isHomePage && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full flex justify-center items-center text-white ml-0 w-fit"
              onClick={isAnyProfilePage ? (isAnyQRCodePage ? handleBackNavigation : handleHomeNavigation) : handleBackNavigation}
              style={{ padding: 0 }}
            >
              {isAnyProfilePage && !isAnyQRCodePage ? (
                <Home className="size-7" />
              ) : (
                <ChevronLeft className="size-7" />
              )}
              <span className="sr-only">{isAnyProfilePage && !isAnyQRCodePage ? 'Home' : 'Go Back'}</span>
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {currentAccount?.address && (
            <>
              {isHomePage && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    asChild
                  >
                    <Link href="/merchant">
                      <Store className="h-5 w-5" />
                      <span className="sr-only">Merchant</span>
                    </Link>
                  </Button>
                
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    asChild
                  >
                    <Link href="/profile">
                      <User className="h-5 w-5" />
                      <span className="sr-only">Profile</span>
                    </Link>
                  </Button>
                </>
              )}
              
              {merchantId && !isMerchantProfilePage && !isMerchantQRCodePage && (
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={handleProfileNavigation}
                >
                  {profilePic ? (
                    <div 
                      className="w-full h-full bg-cover bg-center rounded-full"
                      style={{ backgroundImage: `url(${profilePic})` }}
                    />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                  <span className="sr-only">Profile</span>
                </Button>
              )}
              
              {(isAnyProfilePage && !isAnyQRCodePage) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={handleQrCodeNavigation}
                >
                  <QrCode className="size-7 text-white" />
                  <span className="sr-only">QR Code</span>
                </Button>
              )}
            </>
          )}

          {!currentAccount?.address && (
            <ConnectModal
              trigger={
                <Button variant="outline" className="rounded-full flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Connect
                </Button>
              }
            />
          )}
        </div>
      </div>
    </nav>
  );
}
