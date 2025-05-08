import { create } from 'zustand'
import { PaymentClient } from "@account.tech/payment";
import { NETWORK_TYPE } from "@/constants/network";

interface PaymentState {
  currentpaymentAccountId: string | null;
  client: PaymentClient | null;
  refreshTrigger: number;
  currentAddress: string | null;
  setClient: (client: PaymentClient) => void;
  resetClient: () => void;
  setCurrentAddress: (address: string | null) => void;
  getOrInitClient: (userAddr: string, dpaymentAccountId?: string) => Promise<PaymentClient>;
  triggerRefresh: () => void;
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  currentpaymentAccountId: null,
  client: null,
  refreshTrigger: 0,
  currentAddress: null,
  setClient: (client) => set({ client }),
  resetClient: () => {
    set({ client: null, currentpaymentAccountId: null });
  },
  setCurrentAddress: (address) => {
    const currentAddress = get().currentAddress
    // If address changed, reset the client
    if (currentAddress !== address) {
      set({ client: null, currentAddress: address, currentpaymentAccountId: null })
    }
  },
  getOrInitClient: async (userAddr: string, paymentAccountId?: string) => {
    const { client, currentAddress, currentpaymentAccountId } = get()

    // If address changed, paymentAccountId changed, or no client exists, create new one
    if (
      currentAddress !== userAddr || 
      !client || 
      (paymentAccountId && currentpaymentAccountId !== paymentAccountId)
    ) {
      try {
        console.log("Creating new client for:", userAddr, "paymentAccountId:", paymentAccountId);
        const newClient = await PaymentClient.init(NETWORK_TYPE, userAddr, paymentAccountId)
        set({ 
          client: newClient, 
          currentAddress: userAddr,
          currentpaymentAccountId: paymentAccountId || null
        })
        return newClient
      } catch (error) {
        console.error("Error initializing DaoClient:", error)
        throw error
      }
    }

    // If daoId is provided but different from current, switch to it
    if (paymentAccountId && client && client.paymentAccount?.id !== paymentAccountId) {
      try {
        console.log("Switching client to paymentAccountId:", paymentAccountId);
        await client.switchAccount(paymentAccountId);
        set({ currentpaymentAccountId: paymentAccountId });
      } catch (error) {
        console.error("Error switching account:", error);
        throw error;
      }
    }

    return client
  },
  triggerRefresh: () => {
    set(state => ({ refreshTrigger: state.refreshTrigger + 1 }));
  }
}))