'use client';
import { PaymentClient, Payment } from "@account.tech/payment";
import { Transaction } from "@mysten/sui/transactions";
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
  transfers?: Array<{
    objectId: string;
    recipient: string;
  }>;
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

// Define interfaces for the coin structure
interface CoinInstance {
  ref?: {
    objectId: string;
  };
  amount?: string | number;
}

interface ExtendedPayment extends Payment {
  lockedObjects: string[];
}

interface OwnedObjects {
  coins: {
    [key: string]: {
      type: string;
      instances?: {
        ref?: {
          objectId: string;
        };
        amount?: string | number;
      }[];
    };
  };
}

// Define interface for display intent
interface DisplayIntent {
  key: string;
  creator: string;
  description: string;
  amount: string;
  coinType: string;
  creationTime: number;
  type: string;
}

interface CoinInstanceMap {
  objectId: string;
  amount: string;
}

export function usePaymentClient() {
  const { initClient } = usePaymentStore();

  const initPaymentClient = async (
    userAddr: string,
    multisigId?: string
  ): Promise<PaymentClient> => {
    return initClient(userAddr, multisigId);
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
      const client = await initClient(userAddr);
      
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

  //==================GETTERS==================//

  const getUser = async (userAddr: string) => {
    try {
      const client = await initClient(userAddr);
      return client.user
    } catch (error) {
      console.error("Error getting user:", error);
      return null; // Return null instead of throwing
    }
  };

  const getUserProfile = async (userAddr: string): Promise<Profile> => {
    try {
      const client = await initClient(userAddr);
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
      const client = await initClient(userAddr, accountId);
      return client.paymentAccount;
    } catch (error) {
      console.error("Error getting payment account:", error);
      throw error;
    }
  };

  const getUserPaymentAccounts = async (userAddr: string): Promise<{ id: string; name: string }[]> => {
    try {
      const client = await initClient(userAddr);
      return client.getUserPaymentAccounts();
    } catch (error) {
      console.error("Error getting user payment accounts:", error);
      return []; // Return empty array instead of throwing
    }
  };

  const getIntents = async (userAddr: string, accountId: string) => {
    try {
      const client = await initClient(userAddr, accountId);
      if (!client.intents) {
        throw new Error('Intents not available on client');
      }
      return client.intents.intents;
    } catch (error) {
      console.error("Error getting intents:", error);
      throw error;
    }
  };

  const getFilteredIntents = async (userAddr: string, accountId?: string) => {
    try {
      const client = await initClient(userAddr, accountId);
      if (!client.intents) {
        throw new Error('Intents not available on client');
      }
      const allIntents = client.intents.intents;
      
      // Filter intents by type
      const filteredIntents = Object.fromEntries(
        Object.entries(allIntents).filter(([_, intent]) => {
          const extIntent = intent as unknown as ExtendedIntent;
          const intentType = extIntent.fields?.type_;
          return intentType && (
            intentType.includes('pay::PayIntent') || 
            intentType.includes('owned_intents::WithdrawAndTransferIntent')
          );
        })
      );
      
      return filteredIntents;
    } catch (error) {
      console.error("Error getting filtered intents:", error);
      return {}; // Return empty object instead of throwing
    }
  };

  // Get an intent directly by its ID
  const getIntent = async (userAddr: string, intentId: string) => {
    try {
      const client = await initClient(userAddr);
      return client.getIntent(intentId);
    } catch (error) {
      console.error("Error getting intent:", error);
      return null;
    }
  };

  const getIntentStatus = async (userAddr: string, intentKey: string): Promise<IntentStatus> => {
    try {
      const client = await initClient(userAddr);
      return client.getIntentStatus(intentKey);
    } catch (error) {
      console.error("Error getting intent status:", error);
      return { stage: 'pending', deletable: false };
    }
  };

  const getDepsStatus = async (userAddr: string, paymentAccountId?: string): Promise<DepStatus[]> => {
    try {
      const client = paymentAccountId != undefined ? 
        await initClient(userAddr, paymentAccountId) 
        : await initClient(userAddr);
      
      if (!client) {
        console.error("Failed to initialize client for getDepsStatus");
        return [];
      }
      
      try {
        const depsStatus = client.getDepsStatus();
        console.log("Raw deps status result:", JSON.stringify(depsStatus));
        
        if (!depsStatus) {
          console.error("getDepsStatus returned null or undefined");
          return [];
        }
        
        if (!Array.isArray(depsStatus)) {
          console.error("getDepsStatus did not return an array:", typeof depsStatus);
          return [];
        }
        
        return depsStatus;
      } catch (innerError) {
        console.error("Error calling client.getDepsStatus():", innerError);
        return [];
      }
    } catch (error) {
      console.error("Error getting dependencies status:", error);
      return [];
    }
  };

  const getWithdrawIntentAmounts = async (userAddr: string, accountId: string): Promise<{ id: string, amount: string }> => {
    try {
      const client = await initClient(userAddr, accountId);
      const account = client.paymentAccount as ExtendedPayment;
      const ownedObjects = client.ownedObjects as unknown as OwnedObjects;
      
      if (!ownedObjects?.coins) {
        return { id: '', amount: '0' };
      }

      // Find USDC coin type
      const usdcCoinEntry = Object.entries(ownedObjects.coins).find(
        ([_, coin]) => coin.type.includes("usdc::USDC")
      );

      if (!usdcCoinEntry) {
        return { id: '', amount: '0' };
      }

      const [usdcCoinId, usdcCoin] = usdcCoinEntry;

      // Get instances from USDC coin
      if (usdcCoin.instances && Array.isArray(usdcCoin.instances)) {
        // For each instance in USDC coin
        for (const instance of usdcCoin.instances) {
          if (!instance?.ref?.objectId) continue;

          const objectId = instance.ref.objectId;
          
          // Check if this object is in lockedObjects
          if (account.lockedObjects && account.lockedObjects.includes(objectId)) {
            // Get the amount from the instance
            if (instance.amount) {
              return {
                id: objectId,
                amount: instance.amount.toString()
              };
            }
          }
        }
      }

      return { id: '', amount: '0' };
    } catch (error) {
      console.error("Error getting withdraw intent amounts:", error);
      return { id: '', amount: '0' };
    }
  };

  const getDisplayIntents = async (
    userAddr: string,
    accountId: string,
    intents: Record<string, Intent>, 
    intentType: string
  ): Promise<DisplayIntent[]> => {
    try {
      const filteredIntents = Object.entries(intents).filter(([_, intent]) => {
        const extIntent = intent as unknown as ExtendedIntent;
        return extIntent.fields?.type_?.includes(intentType);
      });

      if (intentType.includes('pay::PayIntent')) {
        return filteredIntents.map(([key, intent]) => {
          const extIntent = intent as unknown as ExtendedIntent;
          const extArgs = extIntent.args as unknown as ExtendedIntentArgs;

          return {
            key: key,
            creator: extIntent.fields?.creator || '',
            description: extIntent.fields?.description || '',
            amount: extArgs?.amount?.toString() || '0',
            coinType: extArgs?.coinType || '',
            creationTime: Number(extIntent.fields?.creationTime) || Date.now(),
            type: intentType
          };
        });
      } else if (intentType.includes('owned_intents::WithdrawAndTransferIntent')) {
        // Get locked objects for verification
        const lockedObjects = await getLockedObjectsId(userAddr, accountId);
        
        // Get all USDC coin instances
        const coinInstances = await getCoinInstances(userAddr, accountId, "usdc::USDC");
        
        const displayIntents = await Promise.all(filteredIntents.map(async ([key, intent]) => {
          const extIntent = intent as unknown as ExtendedIntent;
          const transfers = (extIntent.args as unknown as ExtendedIntentArgs)?.transfers || [];
          
          // Get the first transfer object (as you mentioned there will be only one)
          const transfer = transfers[0];
          if (!transfer?.objectId) {
            return null;
          }
          
          // Verify if this object is locked
          if (!lockedObjects.includes(transfer.objectId)) {
            return null;
          }
          
          // Find matching coin instance to get the amount
          const coinInstance = coinInstances.find(
            instance => instance.objectId === transfer.objectId
          );
          
          if (!coinInstance) {
            return null;
          }
          
          return {
            key: key,
            creator: extIntent.fields?.creator || '',
            description: extIntent.fields?.description || '',
            amount: coinInstance.amount,
            coinType: 'usdc::USDC', // Hardcoded as we know it's USDC
            creationTime: Number(extIntent.fields?.creationTime) || Date.now(),
            type: intentType
          };
        }));
        
        // Filter out any null values and return valid intents
        return displayIntents.filter((intent): intent is DisplayIntent => intent !== null);
      }
      
      return [];
    } catch (error) {
      console.error("Error processing display intents:", error);
      return [];
    }
  };

  const getLockedObjectsId = async (userAddr: string, accountId: string): Promise<string[]> => {
    try {
      const client = await initClient(userAddr, accountId);
      const account = client.paymentAccount as ExtendedPayment;
      
      if (!account?.lockedObjects) {
        return [];
      }
      
      return account.lockedObjects;
    } catch (error) {
      console.error("Error getting locked objects:", error);
      return [];
    }
  };

  const getCoinInstances = async (
    userAddr: string, 
    accountId: string, 
    coinType: string
  ): Promise<CoinInstanceMap[]> => {
    try {
      const client = await initClient(userAddr, accountId);
      const ownedObjects = client.ownedObjects as unknown as OwnedObjects;

      if (!ownedObjects?.coins) {
        return [];
      }

      // Find the specific coin type in the coins object
      const coinEntry = Object.entries(ownedObjects.coins).find(
        ([_, coin]) => coin.type.includes(coinType)
      );

      if (!coinEntry) {
        return [];
      }

      const [_, coin] = coinEntry;

      // Map the instances to our desired format
      return (coin.instances || [])
        .filter(instance => instance?.ref?.objectId && instance?.amount)
        .map(instance => ({
          objectId: instance.ref!.objectId,
          amount: instance.amount!.toString()
        }));

    } catch (error) {
      console.error("Error getting coin instances:", error);
      return [];
    }
  };

  //==================ACTIONS==================//

  const modifyName = async (
    userAddr: string,
    accountId: string,
    tx: Transaction,
    newName: string
  ) => {
    try {
      const client = await initClient(userAddr, accountId);
      client.modifyName(tx, newName);
      return true;
    } catch (error) {
      console.error("Error modifying payment account name:", error);
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
      const client = await initClient(userAddr, accountId);
      
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

  const setRecoveryAddress = async (
    userAddr: string,
    accountId: string,
    tx: Transaction,
    backupAddress: string,
  ) => {
    try {
      // Create a new client specifically for this operation
      // Force reinitializing to ensure fresh state
      console.log("Initializing fresh client for recovery address setup");
      const client = await initClient(userAddr, accountId);     
       
      console.log('Calling setRecoveryAddress with a fresh client:', { 
        tx, 
        backupAddress,
        userAddr,
        accountId
      });
      
      // Call the client method with the transaction and backup address
      return client.setRecoveryAddress(tx, backupAddress);
    } catch (error) {
      console.error("Error setting recovery address:", error);
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
      const client = await initClient(userAddr);
      
      // Get the intent to check if it's expired
      const intent = client.getIntent(paymentId);
      
      if (!intent) {
        throw new Error("Payment not found");
      }
      
      // Check if the payment has expired
      if (intent.fields?.expirationTime && intent.fields?.creationTime) {
        const durationMs = Number(intent.fields.expirationTime);
        const creationTime = Number(intent.fields.creationTime);
        const expirationTimestamp = creationTime + durationMs;
        const now = Date.now();
        
        if (now > expirationTimestamp) {
          throw new Error("Payment has expired and cannot be processed");
        }
      }
      
      client.makePayment(tx, paymentId, tipAmount);
    } catch (error) {
      console.error("Error making payment:", error);
      throw error;
    }
  };

  const updateVerifiedDeps = async (userAddr: string, tx: Transaction, paymentAccountId?: string) => {
    try {
      const client = paymentAccountId != undefined ? 
        await initClient(userAddr, paymentAccountId) 
        : await initClient(userAddr);

      // Get dependencies status first to check what needs updating
      const deps = paymentAccountId != undefined ? 
        await getDepsStatus(userAddr, paymentAccountId) 
        : await getDepsStatus(userAddr);
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

  const completeWithdraw = async (
    userAddr: string,
    accountId: string,
    tx: Transaction,
    key: string
  ) => {
    try {
      const client = await initClient(userAddr, accountId);
      client.completeWithdraw(tx, key);
    } catch (error) {
      console.error("Error completing withdraw:", error);
      throw error;
    }
  };

  //==================INTENTS==================//
    
  const issuePayment = async (userAddr: string, accountId: string, tx: Transaction, description: string, coinType: string, amount: bigint) => {
    try {
      const client = await initClient(userAddr, accountId);
      client.issuePayment(tx, description, coinType, amount);
    } catch (error) {
      console.error("Error issuing payment:", error);
      throw error;
    }
  };

  const initiateWithdraw = async (
    userAddr: string,
    accountId: string,
    tx: Transaction,
    key: string,
    coinType: string,
    amount: bigint,
    recipient: string
  ) => {
    try {
      const client = await initClient(userAddr, accountId);
      client.initiateWithdraw(tx, key, coinType, amount, recipient);
    } catch (error) {
      console.error("Error initiating withdraw:", error);
      throw error;
    }
  };

  return {
    initPaymentClient,
    createPaymentAccount,
    getUser,
    getUserProfile,
    getPaymentAccount,
    getUserPaymentAccounts,
    modifyName,
    getIntent,
    getIntents,
    getFilteredIntents,
    getDisplayIntents,
    getLockedObjectsId,
    getCoinInstances,
    issuePayment,
    makePayment,
    deletePayment,
    getIntentStatus,
    getDepsStatus,
    updateVerifiedDeps,
    setRecoveryAddress,
    initiateWithdraw,
    completeWithdraw,
    getWithdrawIntentAmounts
  };
}