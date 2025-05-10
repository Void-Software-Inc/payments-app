"use client"
import { ConnectModal, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, User, Home, Store } from 'lucide-react';
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

  const isHomePage = pathname === '/home' || pathname === '/';

  return (
    <nav className="border-none">
      <div className="flex h-16 items-center px-4 container mx-auto justify-between bg-transparent">
        <div className="flex items-center gap-4">
          {!isHomePage && (
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              asChild
            >
              <Link href="/home">
                <Home className="h-5 w-5" />
                <span className="sr-only">Home</span>
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
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                asChild
              >
                <Link href="#">
                  <User className="h-5 w-5" />
                  <span className="sr-only">My Profile</span>
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
