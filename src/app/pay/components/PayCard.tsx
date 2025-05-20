"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, X } from "lucide-react";
import { 
  useCurrentAccount, 
  useSuiClient 
} from "@mysten/dapp-kit";
import { formatSuiBalance } from "@/utils/formatters";
import { getCoinDecimals } from "@/utils/helpers";
import { usePaymentClient } from "@/hooks/usePaymentClient";
import Image from "next/image";
import { QrCodeButton } from "@/components/QrCodeButton";

// USDC coin type - ensure this matches the BalanceCard.tsx definition
const USDC_COIN_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC";
const SUI_COIN_TYPE = "0x2::sui::SUI";

// Interface for the component props
interface PayCardProps {
  onMakePayment: (paymentId: string, tip?: bigint) => Promise<void>;
  isProcessing: boolean;
}

export function PayCard({ onMakePayment, isProcessing }: PayCardProps) {
  const [paymentId, setPaymentId] = useState("");
  const [tipAmount, setTipAmount] = useState<string>("0");
  const [error, setError] = useState<string | null>(null);
  const [balanceInSui, setBalanceInSui] = useState<bigint>(BigInt(0));
  const [balanceInUsdc, setBalanceInUsdc] = useState<bigint>(BigInt(0));
  const [usdcDecimals, setUsdcDecimals] = useState<number>(6); // Default USDC decimals is usually 6
  
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  
  // Fetch balances when the component loads
  useEffect(() => {
    const fetchBalances = async () => {
      if (currentAccount?.address) {
        try {
          // Get SUI balance for gas fees
          const suiBalanceResponse = await suiClient.getBalance({
            owner: currentAccount.address,
            coinType: SUI_COIN_TYPE,
          });
          
          setBalanceInSui(BigInt(suiBalanceResponse.totalBalance));
          
          // Get USDC balance
          const usdcBalanceResponse = await suiClient.getBalance({
            owner: currentAccount.address,
            coinType: USDC_COIN_TYPE,
          });
          
          setBalanceInUsdc(BigInt(usdcBalanceResponse.totalBalance));
          
          // Get USDC decimals
          try {
            const decimals = await getCoinDecimals(USDC_COIN_TYPE, suiClient);
            setUsdcDecimals(decimals);
          } catch (error) {
            console.warn("Failed to get USDC decimals, using default:", error);
          }
        } catch (error) {
          console.error("Failed to fetch balances:", error);
        }
      }
    };
    
    fetchBalances();
  }, [currentAccount, suiClient]);
  
  const handlePaymentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentId(e.target.value);
    // Clear error when user types
    if (error) setError(null);
  };
  
  const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only valid numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setTipAmount(value);
    }
  };
  
  const adjustTip = (increment: boolean) => {
    let currentTip = parseFloat(tipAmount) || 0;
    if (increment) {
      currentTip += 1;
    } else {
      currentTip = Math.max(0, currentTip - 1);
    }
    setTipAmount(currentTip.toString());
  };
  
  // Format USDC balance
  const formatUsdcBalance = (balance: bigint, decimals: number): string => {
    const divisor = BigInt(10) ** BigInt(decimals);
    const usdcBalance = Number(balance) / Number(divisor);
    return usdcBalance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  const handlePay = async () => {
    if (!currentAccount?.address) {
      setError("Please connect your wallet");
      return;
    }
    
    if (!paymentId.trim()) {
      setError("Please enter a payment ID");
      return;
    }
    
    // Extract payment ID from link if it's a link format
    let actualPaymentId = paymentId.trim();
    
    // Check if it's a link format and extract the ID
    if (actualPaymentId.includes('/')) {
      const parts = actualPaymentId.split('/');
      actualPaymentId = parts[parts.length - 1];
    }
    
    // Check if user has enough SUI for gas
    const gasBuffer = BigInt(20_000_000); // 0.02 SUI for gas
    if (balanceInSui < gasBuffer) {
      setError("Insufficient SUI balance for gas fees. Please maintain at least 0.02 SUI.");
      return;
    }
    
    try {
      // Convert tip amount to bigint (USDC has 6 decimals)
      const tipValue = parseFloat(tipAmount) || 0;
      const tipInSmallestUnit = BigInt(Math.floor(tipValue * 1_000_000));
      
      // Call the onMakePayment function with the payment ID and tip amount
      await onMakePayment(actualPaymentId, tipInSmallestUnit);
      
      // Reset payment ID and tip after successful payment
      setPaymentId("");
      setTipAmount("0");
    } catch (error: any) {
      console.error("Payment error:", error);
      setError(error.message || "Failed to process payment");
    }
  };
  
  // Format balances for display
  const formattedSuiBalance = formatSuiBalance(balanceInSui);
  const formattedUsdcBalance = formatUsdcBalance(balanceInUsdc, usdcDecimals);
  
  return (
    <div>
        <Card className="w-full bg-[#2A2A2F] border-[#33363A] rounded-lg shadow-lg">
        <CardContent className="space-y-6 mt-1 mb-3">
            {/* Payment ID Input */}
            <div className="space-y-2 mt-2">
            <Label htmlFor="payment-id" className="text-md text-[#c8c8c8] font-medium">
                Paste link or id
            </Label>
            <div className="flex items-center gap-2">
                <Input
                id="payment-id"
                type="text"
                value={paymentId}
                onChange={handlePaymentIdChange}
                placeholder="suipay/..."
                className={`h-14 bg-transparent border-[#5E6164] rounded-lg text-white text-lg ${error ? 'border-amber-500' : ''}`}
                autoComplete="off"
                />
            </div>
            </div>
            
            {/* Tip Amount Input */}
            <div className="space-y-2 mt-2">
              <Label htmlFor="tipAmount" className="text-md text-[#c8c8c8] font-medium">
                Add tip (optional)
              </Label>
              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  size="icon" 
                  variant="outline" 
                  onClick={() => adjustTip(false)}
                  className="h-8 w-8 bg-transparent border-[#5E6164]"
                >
                  <Minus className="h-4 w-4 text-white" />
                </Button>
                <Input
                  id="tipAmount"
                  value={tipAmount}
                  onChange={handleTipChange}
                  placeholder="0.00"
                  className="h-10 bg-transparent border-[#5E6164] rounded-lg text-white text-md text-center"
                  autoComplete="off"
                />
                <Button 
                  type="button" 
                  size="icon" 
                  variant="outline" 
                  onClick={() => adjustTip(true)}
                  className="h-8 w-8 bg-transparent border-[#5E6164]"
                >
                  <Plus className="h-4 w-4 text-white" />
                </Button>
                <div className="flex items-center ml-1">
                  <div className="w-4 h-4 relative">
                    <Image
                      src="/usdc-logo.webp"
                      alt="USDC"
                      fill
                      sizes="16px"
                      className="object-contain rounded-full"
                    />
                  </div>
                  <span className="text-white text-sm ml-1">USDC</span>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="text-amber-500 text-sm mt-2 flex items-center">
                {error}
              </div>
            )}
            
            {/* Pay Button */}
            <Button
            onClick={handlePay}
            className="w-full h-13 mt-4 rounded-full bg-[#78BCDB] hover:bg-[#68ACCC] text-white font-medium text-lg"
            disabled={isProcessing || !paymentId.trim() || !!error}
            >
            {isProcessing ? "Processing..." : "Pay Now"}
            </Button>
        </CardContent>
        </Card>

    <QrCodeButton />
   
  </div>
  );
} 