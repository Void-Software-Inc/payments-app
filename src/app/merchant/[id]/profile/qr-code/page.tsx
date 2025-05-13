"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { usePaymentClient } from "@/hooks/usePaymentClient";
import { QRCodeSVG } from 'qrcode.react';
import { Copy } from 'lucide-react';

export default function MerchantProfileQRCodePage() {
  const params = useParams();
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { getPaymentAccount } = usePaymentClient();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const accountId = params.id as string;
  
  // Redirect to login if wallet is not connected
  useEffect(() => {
    if (!currentAccount?.address) {
      router.push("/login");
    }
  }, [currentAccount?.address, router]);
  
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
  
  const copyToClipboard = () => {
    if (accountId) {
      navigator.clipboard.writeText(accountId);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };
  
  // If not connected, show nothing while redirecting
  if (!currentAccount?.address) {
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 max-w-md">
        <div className="flex justify-center items-center w-full mb-6 pt-5">
          <h1 className="text-2xl font-bold text-white">My QR Code</h1>
        </div>
        <div className="flex justify-center p-8">Loading payment account...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 max-w-md">
        <div className="flex justify-center items-center w-full mb-6 pt-5">
          <h1 className="text-2xl font-bold text-white">Merchant QR Code</h1>
        </div>
        <div className="text-red-500 p-4 text-center">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 max-w-md">
      <div className="flex justify-center items-center w-full mb-6 pt-5">
        <h1 className="text-2xl font-bold text-white">My QR Code</h1>
      </div>
      
      <div className="w-full h-fit flex justify-center py-4">
        <div className="w-[90%] rounded-lg bg-[#2A2A2F] p-16 border-2 border-[#39393B]">
          <div className="flex justify-center">
              <QRCodeSVG 
                value={accountId} 
                size={230}
                bgColor="#2A2A2F"
                fgColor="#FFFFFF"
              />
          </div>
        </div>
      </div>
    </div>
  );
} 