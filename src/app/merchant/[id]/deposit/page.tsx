"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DepositCard } from "./components/DepositCard";
import { FiatButton } from "./components/FiatButton";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { usePaymentClient } from "@/hooks/usePaymentClient";
import { Toaster } from "sonner";

export default function DepositPage() {
  const params = useParams();
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { getPaymentAccount } = usePaymentClient();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const accountId = params.id as string;
  
  // Redirect to login if wallet is not connected
  useEffect(() => {
    if (!currentAccount?.address) {
      router.push("/login");
    }
  }, [currentAccount?.address, router]);
  
  // Apply a custom CSS class to the body when this page is mounted
  useEffect(() => {
    // Save the original overflow value
    const originalOverflow = document.body.style.overflow;
    
    // Enable scrolling on the body
    document.body.style.overflow = "auto";
    
    // Clean up when the component unmounts
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);
  
  // Verify that the payment account exists and user has access
  useEffect(() => {
    const verifyPaymentAccount = async () => {
      if (!currentAccount?.address || !accountId) return;
      
      try {
        setIsLoading(true);
        await getPaymentAccount(currentAccount.address, accountId);
      } catch (error) {
        console.error("Error loading payment account:", error);
        setError("Failed to load payment account");
        router.push("/merchant");
      } finally {
        setIsLoading(false);
      }
    };
    
    verifyPaymentAccount();
  }, [currentAccount?.address, accountId, router]);
  
  // If not connected, show nothing while redirecting
  if (!currentAccount?.address) {
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 max-w-md">
        <div className="flex justify-center items-center w-full mb-6 pt-5">
          <h1 className="text-2xl font-bold text-white">Deposit</h1>
        </div>
        <div className="flex justify-center p-8">Loading payment account...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 max-w-md">
        <div className="flex justify-center items-center w-full mb-6 pt-5">
          <h1 className="text-2xl font-bold text-white">Deposit</h1>
        </div>
        <div className="text-red-500 p-4 text-center">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 max-w-md">
      <Toaster position="bottom-center" richColors closeButton />
      <div className="flex justify-center items-center w-full mb-6 pt-5">
        <h1 className="text-2xl font-bold text-white">Deposit</h1>
      </div>
      
      <div className="py-4">
        <DepositCard paymentAccountId={accountId} />
        <FiatButton />
      </div>
    </div>
  );
} 