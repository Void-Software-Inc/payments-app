import { create } from 'zustand'
import { Intent } from "@account.tech/core"

interface DeletedIntent {
  intent: Intent;
  deletedAt: number;
  paymentId: string;
}

interface IntentState {
  deletedIntents: DeletedIntent[];
}

interface IntentActions {
  addDeletedIntent: (intent: Intent, paymentId: string) => void;
  getDeletedIntent: (paymentId: string) => DeletedIntent | undefined;
  clearAllIntents: () => void;
}

const initialState: IntentState = {
  deletedIntents: [],
};

export const useIntentStore = create<IntentState & IntentActions>((set, get) => ({
  ...initialState,

  addDeletedIntent: (intent: Intent, paymentId: string) => {
    set((state) => {
      // Check if intent already exists
      const exists = state.deletedIntents.some(
        (item) => item.paymentId === paymentId
      );

      // If it exists, don't add it again
      if (exists) {
        return state;
      }

      // Add new intent with timestamp
      return {
        deletedIntents: [
          ...state.deletedIntents,
          {
            intent,
            deletedAt: Date.now(),
            paymentId,
          },
        ],
      };
    });
  },

  getDeletedIntent: (paymentId: string) => {
    const state = get();
    return state.deletedIntents.find(
      (item) => item.paymentId === paymentId
    );
  },

  clearAllIntents: () => {
    set(initialState);
  },
})); 