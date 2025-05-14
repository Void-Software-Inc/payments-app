'use client';
import { PaymentClient, Payment } from "@account.tech/payment";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { usePaymentStore } from "@/store/usePaymentStore";
import { Intent } from "@account.tech/core";

// Define interface for Intent with additional properties used in our app
interface ExtendedIntent extends Intent {
  timestamp?: number;
  creator?: string;
  status?: string;
}

// Define interface for IntentArgs to match what's used in payment intents
interface ExtendedIntentArgs {
  amount?: string | number;
  coinType?: string;
  description?: string;
  [key: string]: any;
}

// Define a Profile interface to match what's expected by components
interface Profile {
  avatar?: string | null;
  username?: string;
  [key: string]: any;
}

// Define PendingPayment interface for structured payment data
export interface PendingPayment {
  id: string;
  sender?: string;
  description?: string;
  amount: string;
  date: string;
  time: string;
  status: string;
  intentKey: string;
  coinType: string;
  rawIntent: Intent;
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

  const modifyName = async (
    userAddr: string,
    accountId: string,
    tx: Transaction,
    newName: string
  ) => {
    try {
      const client = await getOrInitClient(userAddr, accountId);
      client.modifyName(tx, newName);
      return true;
    } catch (error) {
      console.error("Error modifying payment account name:", error);
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

  //====Pending====//
  const getPendingPayments = async (userAddr: string, accountId?: string): Promise<Record<string, PendingPayment>> => {
    try {
      const client = await getOrInitClient(userAddr, accountId);
      const pendingIntents = client.getPendingPayments();
      
      // Transform the intents into a more app-friendly format
      const transformedPayments: Record<string, PendingPayment> = {};
      
      for (const [key, intent] of Object.entries(pendingIntents)) {
        // Cast intent to ExtendedIntent to access additional properties
        const extIntent = intent as unknown as ExtendedIntent;
        const extArgs = extIntent.args as unknown as ExtendedIntentArgs;
        
        // Extract data from the intent
        const timestamp = new Date(extIntent.timestamp || Date.now());
        const formattedDate = timestamp.toLocaleDateString();
        const formattedTime = timestamp.toLocaleTimeString();
        
        // Extract amount and coin type from the intent args
        const amount = extArgs?.amount?.toString() || "0";
        const coinType = extArgs?.coinType || "unknown";
        const description = extArgs?.description || "";
        
        transformedPayments[key] = {
          id: key,
          intentKey: key,
          sender: extIntent.creator || "Unknown",
          description,
          amount,
          date: formattedDate,
          time: formattedTime,
          status: extIntent.status || "pending",
          coinType,
          rawIntent: intent
        };
      }
      
      return transformedPayments;
    } catch (error) {
      console.error("Error getting pending payments:", error);
      return {}; // Return empty object instead of throwing
    }
  };
  
  const getPaymentDetail = async (userAddr: string, accountId: string, paymentId: string): Promise<PendingPayment | null> => {
    try {
      const client = await getOrInitClient(userAddr, accountId);
      const intent = client.getIntent(paymentId);
      
      if (!intent) {
        return null;
      }
      
      // Cast intent to ExtendedIntent to access additional properties
      const extIntent = intent as unknown as ExtendedIntent;
      const extArgs = extIntent.args as unknown as ExtendedIntentArgs;
      
      // Extract data from the intent
      const timestamp = new Date(extIntent.timestamp || Date.now());
      const formattedDate = timestamp.toLocaleDateString();
      const formattedTime = timestamp.toLocaleTimeString();
      
      // Extract details from the intent
      const amount = extArgs?.amount?.toString() || "0";
      const coinType = extArgs?.coinType || "unknown";
      const description = extArgs?.description || "";
      
      return {
        id: paymentId,
        intentKey: paymentId,
        sender: extIntent.creator || "Unknown",
        description,
        amount,
        date: formattedDate,
        time: formattedTime,
        status: extIntent.status || "pending",
        coinType,
        rawIntent: intent
      };
    } catch (error) {
      console.error("Error getting payment detail:", error);
      return null;
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
    modifyName,
    getPendingPayments,
    getPaymentDetail
  };
}