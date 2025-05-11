"use client"
import { ConnectModal, useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from "@/components/ui/button";
import { Wallet, ChevronLeft, Store, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

export function Navbar() {
  const currentAccount = useCurrentAccount();
  const pathname = usePathname();
  const router = useRouter();
  
  // Don't render navbar on the login page
  if (pathname === '/login') {
    return null;
  }

  const isHomePage = pathname === '/';
  
  const handleBackNavigation = () => {
    try {
      // Try to go back to previous page
      window.history.back();
      
      // If no history exists, setTimeout ensures fallback to home
      setTimeout(() => {
        // Check if location hasn't changed after history.back()
        if (window.location.pathname === pathname) {
          router.push('/');
        }
      }, 100);
    } catch (error) {
      // Fallback to home page if any error occurs
      router.push('/');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent" style={{ background: 'transparent' }}>
      <div className="flex h-16 items-center px-4 container mx-auto justify-between bg-transparent" style={{ background: 'transparent', boxShadow: 'none' }}>
        <div className="flex items-center gap-4">
          {!isHomePage && (
            <Button
              variant="ghost"
              className="flex rounded-full text-white h-12 w-12"
              onClick={handleBackNavigation}
            >
              <ChevronLeft className="size-7" />
              <span className="sr-only">Go Back</span>
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
