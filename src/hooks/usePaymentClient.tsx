'use client';
import { PaymentClient, Payment } from "@account.tech/payment";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { usePaymentStore } from "@/store/usePaymentStore";

// Define a Profile interface to match what's expected by components
interface Profile {
  avatar?: string | null;
  username?: string;
  [key: string]: any;
}

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
      console.error("Error switching Payment Account:", error);
      throw error;
    }
  };

  const createPaymentAccount = async (
    userAddr: string,
    tx: Transaction,
    name: string,
    newUser?: {
      username: string;
      profilePicture: string;
    },
    memberAddresses?: string[]
  ) => {
    try {
      const client = await getOrInitClient(userAddr);
      
      // Check if we need to provide newUser parameters
      const userParams = !client.user?.id 
        ? newUser || { username: `User_${Date.now()}`, profilePicture: "" }
        : undefined;
      
      client.createPaymentAccount(tx, name, userParams, memberAddresses);
      return true;
    } catch (error) {
      console.error("Error creating payment account:", error);
      throw error;
    }
  };

  const getUser = async (userAddr: string) => {
    try {
      const client = await getOrInitClient(userAddr);
      return client.user
    } catch (error) {
      console.error("Error getting user:", error);
      return null; // Return null instead of throwing
    }
  };

  const getUserProfile = async (userAddr: string): Promise<Profile> => {
    try {
      const client = await getOrInitClient(userAddr);
      // Check if getUserProfile exists on the client
      if (typeof client.getUserProfile !== 'function') {
        console.warn('getUserProfile is not available on the client', client);
        // Return a default object if the method doesn't exist
        return { username: 'User', avatar: null };
      }
      const profile = await client.getUserProfile();
      return profile as Profile;
    } catch (error) {
      console.error("Error getting user profile:", error);
      // Return a fallback object instead of throwing
      return { username: 'User', avatar: null };
    }
  };

  const getPaymentAccount = async (userAddr: string, accountId: string): Promise<Payment> => {
    try {
      const client = await getOrInitClient(userAddr, accountId);
      return client.paymentAccount;
    } catch (error) {
      console.error("Error getting payment account:", error);
      throw error;
    }
  };

  const getUserPaymentAccounts = async (userAddr: string): Promise<{ id: string; name: string }[]> => {
    try {
      const client = await getOrInitClient(userAddr);
      return client.getUserPaymentAccounts();
    } catch (error) {
      console.error("Error getting user payment accounts:", error);
      return []; // Return empty array instead of throwing
    }
  };

  return {
    initPaymentClient,
    refresh,
    switchAccount,
    createPaymentAccount,
    getUser,
    getUserProfile,
    getPaymentAccount,
    getUserPaymentAccounts,
  };
}