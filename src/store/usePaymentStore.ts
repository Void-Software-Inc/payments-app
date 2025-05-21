import { create } from 'zustand'
import { PaymentClient } from "@account.tech/payment";
import { NETWORK_TYPE } from "@/constants/network";

/**
 * State interface for the DAO store
 */
interface PaymentState {
  /** Current active DAO client instance */
  client: PaymentClient | null;
  /** Currently connected wallet address */
  address: string | null;
  /** Currently selected DAO ID */
  paymentAccountId: string | null;
  /** Counter to trigger UI refreshes */
  refreshCounter: number;
}

/**
 * Actions interface for the DAO store
 */
interface PaymentActions {
  /** Initialize or retrieve a DAO client */
  initClient: (address: string, paymentAccountId?: string) => Promise<PaymentClient>;
  /** Reset the store state */
  reset: () => void;
  /** Update the connected wallet address */
  setAddress: (address: string | null) => void;
  /** Trigger a UI refresh */
  refresh: () => void;
  /** Refresh the client data and trigger UI refresh */
  refreshClient: () => Promise<void>;
}

const initialState: Omit<PaymentState, 'refreshCounter'> = {
  client: null,
  address: null,
  paymentAccountId: null,
};

export const usePaymentStore = create<PaymentState & PaymentActions>((set, get) => ({
  ...initialState,
  refreshCounter: 0,

  initClient: async (address: string, paymentAccountId?: string) => {
    const state = get();
    
    try {
      // Case 1: No client exists or address changed - need full initialization
      if (!state.client || state.address !== address) {
        console.log("initializing client", address, paymentAccountId);
        const client = await PaymentClient.init(NETWORK_TYPE, address, paymentAccountId);
        set({ 
          client,
          address,
          paymentAccountId: paymentAccountId || null
        });
        return client;
      }
      
      // Case 2: Client exists, same address, but paymentAccountId changed - use switch
      if (paymentAccountId && state.paymentAccountId !== paymentAccountId) {
        console.log("switching paymentAccountId", paymentAccountId);
        await state.client.switch(paymentAccountId);
        set({ paymentAccountId });
      }
      
      // Return existing client
      return state.client;
    } catch (error) {
      // Reset state on error but keep refreshCounter
      const { refreshCounter } = get();
      set({ ...initialState, refreshCounter });
      throw error;
    }
  },

  reset: () => {
    // Keep the current refreshCounter when resetting
    const { refreshCounter } = get();
    set({ ...initialState, refreshCounter });
  },

  setAddress: (address) => {
    const { address: currentAddress, refreshCounter } = get();
    if (currentAddress !== address) {
      set({ ...initialState, address, refreshCounter });
    }
  },

  refresh: () => set(state => ({ 
    refreshCounter: state.refreshCounter + 1
  })),

  refreshClient: async () => {
    const state = get();
    if (state.client) {
      try {
        await state.client.refresh();
        set(state => ({ refreshCounter: state.refreshCounter + 1 }));
      } catch (error) {
        console.error("Error refreshing client:", error);
        throw error;
      }
    }
  }
}));