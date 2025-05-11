"use client"
import { ConnectModal, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, Home, Store, ArrowLeft } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function Navbar() {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const pathname = usePathname();
  
  // Don't render navbar on the login page
  if (pathname === '/login') {
    return null;
  }

  const isHomePage = pathname === '/';
  const isMerchantAccountPage = pathname.startsWith('/merchant/') && pathname !== '/merchant/create';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent" style={{ background: 'transparent' }}>
      <div className="flex h-16 items-center px-4 container mx-auto justify-between bg-transparent" style={{ background: 'transparent', boxShadow: 'none' }}>
        <div className="flex items-center gap-4">
          {!isHomePage && (
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              asChild
            >
              <Link href="/">
                <Home className="h-5 w-5" />
                <span className="sr-only">Home</span>
              </Link>
            </Button>
          )}
          {isMerchantAccountPage && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white"
              asChild
            >
              <Link href="/merchant">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back to Merchant</span>
              </Link>
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {currentAccount?.address && (
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
            </>
          )}

          {currentAccount?.address ? (
            <Button
              variant="outline"
              onClick={() => disconnect()}
              className="rounded-full flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
          ) : (
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
