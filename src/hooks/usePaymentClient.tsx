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

export type DepStatus = {
  name: string;
  currentAddr: string;
  currentVersion: number;
  latestAddr: string;
  latestVersion: number;
};

export type IntentStatus = {
  stage: 'pending' | 'resolved' | 'executable';
  deletable: boolean;
};

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
        
        // Extract the creationTime from intent.fields or fall back to current timestamp
        const creationTimeNumber = extIntent?.fields?.creationTime 
          ? Number(extIntent.fields.creationTime) 
          : (extIntent.timestamp || Date.now());
        
        const timestamp = new Date(creationTimeNumber);
        const formattedDate = timestamp.toLocaleDateString();
        const formattedTime = timestamp.toLocaleTimeString();
        
        // Extract amount and coin type from the intent args
        const amount = extArgs?.amount?.toString() || "0";
        const coinType = extArgs?.coinType || "unknown";
        const description = extArgs?.description || "";
        
        // Check if the payment is expired
        let status = extIntent.status || "pending";
        
        if (status === "pending" && extIntent?.fields?.expirationTime) {
          const expirationTime = Number(extIntent.fields.expirationTime);
          const now = Date.now();
          
          if (now > expirationTime) {
            status = "expired";
          }
        }
        
        transformedPayments[key] = {
          id: key,
          intentKey: key,
          sender: extIntent.creator || "Unknown",
          description,
          amount,
          date: formattedDate,
          time: formattedTime,
          status,
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
    // The payment may have been deleted, so we need to be careful with the client call
    let client;
    try {
      client = await getOrInitClient(userAddr, accountId);
    } catch (error) {
      console.error("Error initializing client:", error);
      return null;
    }
    
    // Safely get the intent
    let intent;
    try {
      intent = client.getIntent(paymentId);
      
      if (!intent) {
        return null;
      }
    } catch (error) {
      // Intent not found is expected if it was deleted
      return null;
    }
    
    try {
      // Cast intent to ExtendedIntent to access additional properties
      const extIntent = intent as unknown as ExtendedIntent;
      const extArgs = extIntent.args as unknown as ExtendedIntentArgs;
      
      // Extract the creationTime from intent.fields or fall back to current timestamp
      const creationTimeNumber = extIntent?.fields?.creationTime 
        ? Number(extIntent.fields.creationTime) 
        : (extIntent.timestamp || Date.now());
      
      const timestamp = new Date(creationTimeNumber);
      const formattedDate = timestamp.toLocaleDateString();
      const formattedTime = timestamp.toLocaleTimeString();
      
      // Extract details from the intent
      const amount = extArgs?.amount?.toString() || "0";
      const coinType = extArgs?.coinType || "unknown";
      const description = extArgs?.description || "";
      
      // Check if the payment is expired
      let status = extIntent.status || "pending";
      
      if (status === "pending" && extIntent?.fields?.expirationTime) {
        const expirationTime = Number(extIntent.fields.expirationTime);
        const now = Date.now();
        
        if (now > expirationTime) {
          status = "expired";
        }
      }
      
      return {
        id: paymentId,
        intentKey: paymentId,
        sender: extIntent.creator || "Unknown",
        description,
        amount,
        date: formattedDate,
        time: formattedTime,
        status,
        coinType,
        rawIntent: intent
      };
    } catch (error) {
      console.error("Error processing payment detail:", error);
      return null;
    }
  };

  // Get an intent directly by its ID
  const getIntent = async (userAddr: string, intentId: string) => {
    try {
      const client = await getOrInitClient(userAddr);
      return client.getIntent(intentId);
    } catch (error) {
      console.error("Error getting intent:", error);
      return null;
    }
  };

    //====Intents====//
    
  const issuePayment = async (userAddr: string, accountId: string, tx: Transaction, description: string, coinType: string, amount: bigint) => {
    try {
      const client = await getOrInitClient(userAddr, accountId);
      client.issuePayment(tx, description, coinType, amount);
    } catch (error) {
      console.error("Error issuing payment:", error);
      throw error;
    }
  };

  const makePayment = async (
    userAddr: string, 
    tx: Transaction, 
    paymentId: string, 
    tipAmount?: bigint
  ) => {
    try {
      const client = await getOrInitClient(userAddr);
      
      // Get the intent to check if it's expired
      const intent = client.getIntent(paymentId);
      
      if (!intent) {
        throw new Error("Payment not found");
      }
      
      // Check if the payment has expired
      if (intent.fields?.expirationTime) {
        const expirationTime = Number(intent.fields.expirationTime);
        const now = Date.now();
        
        if (now > expirationTime) {
          throw new Error("Payment has expired and cannot be processed");
        }
      }
      
      client.makePayment(tx, paymentId, tipAmount);
    } catch (error) {
      console.error("Error making payment:", error);
      throw error;
    }
  };

  // Delete an expired payment intent
  const deletePayment = async (
    userAddr: string,
    accountId: string,
    tx: Transaction,
    intentKey: string
  ) => {
    try {
      const client = await getOrInitClient(userAddr, accountId);
      
      // Get the intent status to check if it's deletable
      const status = client.getIntentStatus(intentKey);
      
      if (!status.deletable) {
        throw new Error("This payment cannot be deleted");
      }
      
      // Delete the payment intent
      client.delete(tx, intentKey);
    } catch (error) {
      console.error("Error deleting payment:", error);
      throw error;
    }
  };

  // Get intent status directly from the client
  const getIntentStatus = async (userAddr: string, intentKey: string): Promise<IntentStatus> => {
    try {
      const client = await getOrInitClient(userAddr);
      return client.getIntentStatus(intentKey);
    } catch (error) {
      console.error("Error getting intent status:", error);
      return { stage: 'pending', deletable: false };
    }
  };

  const getDepsStatus = async (userAddr: string): Promise<DepStatus[]> => {
    try {
      const client = await getOrInitClient(userAddr);
      // Get extensions from the client
      const extensions = client.extensions?.extensions || [];
      
      // Map extensions to DepStatus objects
      const depsStatus: DepStatus[] = [];
      
      for (let i = 0; i < extensions.length; i++) {
        const extension = extensions[i];
        const name = extension.name || `Extension_${i}`;
        
        // Extract version information from the extension
        // Using safe property access with optional chaining and defaults
        const currentAddr = extension?.history?.[0]?.package || '';
        const currentVersion = extension?.history?.[0]?.version || 0;
        const latestAddr = extension?.history?.[extension?.history?.length - 1]?.package || currentAddr;
        const latestVersion = extension?.history?.[extension?.history?.length - 1]?.version || currentVersion;
        
        depsStatus.push({
          name,
          currentAddr,
          currentVersion,
          latestAddr,
          latestVersion
        });
      }
      
      return depsStatus;
    } catch (error) {
      console.error("Error getting dependencies status:", error);
      return []; // Return empty array instead of throwing
    }
  };

  const updateVerifiedDeps = async (userAddr: string, tx: Transaction) => {
    try {
      const client = await getOrInitClient(userAddr);
      
      // Get dependencies status first to check what needs updating
      const deps = await getDepsStatus(userAddr);
      const depsToUpdate = deps.filter(dep => dep.latestVersion > dep.currentVersion);
      
      if (depsToUpdate.length === 0) {
        console.log("No dependencies need updating");
        return;
      }
      
      console.log(`Updating ${depsToUpdate.length} dependencies`);
      
      // Call the client's updateVerifiedDeps method with the transaction
      // Pass only the transaction as that's what the function expects
      client.updateVerifiedDeps(tx);
    } catch (error) {
      console.error("Error updating verified dependencies:", error);
      throw error;
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
    getPaymentDetail,
    getIntent,
    issuePayment,
    makePayment,
    deletePayment,
    getIntentStatus,
    getDepsStatus,
    updateVerifiedDeps
  };
}