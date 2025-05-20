'use client';

import { useState, useEffect } from 'react';
import { usePaymentStore } from '@/store/usePaymentStore';

export interface CompletedPayment {
  id: string;
  paymentId: string;
  paidAmount: string;
  tipAmount: string;
  issuedBy: string;
  paidBy: string;
  coinType: string;
  description: string;
  transactionHash: string;
  createdAt: string;
  updatedAt: string;
}

export function useCompletedPayments() {
  const { refreshTrigger } = usePaymentStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCompletedPaymentsByAccount = async (
    paymentAccountId: string,
    role?: 'payer' | 'issuer'
  ): Promise<CompletedPayment[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const roleParam = role ? `&role=${role}` : '';
      const response = await fetch(`/api/payments?paymentAccountId=${paymentAccountId}${roleParam}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch payments');
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching completed payments:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const formatCoinAmount = (amount: string, coinType: string): string => {
    try {
      // Parse the amount
      const numAmount = parseFloat(amount);
      
      // Format with 2 decimal places
      const formattedAmount = numAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      // Extract coin symbol from coinType
      const coinSymbol = coinType.split('::').pop() || 'COIN';
      
      return `${formattedAmount} ${coinSymbol}`;
    } catch (e) {
      return `${amount} UNKNOWN`;
    }
  };

  return {
    getCompletedPaymentsByAccount,
    formatCoinAmount,
    isLoading,
    error
  };
} 