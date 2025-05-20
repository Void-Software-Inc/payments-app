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
      console.log(`useCompletedPayments: Fetching payments for account ${paymentAccountId}${role ? `, role: ${role}` : ''}`);
      
      const roleParam = role ? `&role=${role}` : '';
      const url = `/api/payments?paymentAccountId=${encodeURIComponent(paymentAccountId)}${roleParam}`;
      console.log(`useCompletedPayments: Fetching from URL: ${url}`);
      
      const response = await fetch(url, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Make sure credentials are included if needed
        credentials: 'same-origin'
      });
      
      console.log(`useCompletedPayments: Response status: ${response.status}`);
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('useCompletedPayments: API error response:', errorData);
        } catch (parseError) {
          console.error('useCompletedPayments: Failed to parse error response:', parseError);
          // Try to get the text if JSON parsing fails
          const errorText = await response.text();
          console.error('useCompletedPayments: Error response text:', errorText);
        }
        throw new Error(errorMessage);
      }
      
      let data;
      try {
        data = await response.json();
        console.log(`useCompletedPayments: Received ${data?.data?.length || 0} payments`);
      } catch (parseError) {
        console.error('useCompletedPayments: Failed to parse JSON response:', parseError);
        const responseText = await response.text();
        console.error('useCompletedPayments: Response text:', responseText.substring(0, 500)); // Log first 500 chars
        throw new Error('Failed to parse server response');
      }
      
      return data.data || [];
    } catch (error) {
      console.error('useCompletedPayments: Error fetching completed payments:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      
      // Rethrow to let the component handle it
      throw error;
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