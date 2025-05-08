'use client';
import { PaymentClient } from "@account.tech/payment";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { usePaymentStore } from "@/store/usePaymentStore";

export function usePaymentClient() {
  const { getOrInitClient, resetClient } = usePaymentStore();

  const initPaymentClient = async (
    userAddr: string,
    multisigId?: string
  ): Promise<PaymentClient> => {
    return getOrInitClient(userAddr, multisigId);
  };

  const refresh = async (userAddr: string) => {
    try {
      const client = await getOrInitClient(userAddr);
      await client.refresh();
    } catch (error) {
      console.error("Error refreshing multisig:", error);
      throw error;
    }
  };

  const switchAccount = async (userAddr: string, paymentAccountId: string) => {
    try {
      const client = await getOrInitClient(userAddr);
      await client.switchAccount(paymentAccountId);
    } catch (error) {
      console.error("Error switching dao:", error);
      throw error;
    }
  };

  return {
    initPaymentClient,
    refresh,
    switchAccount,
  };
}