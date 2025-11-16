import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

// Use Frappe auth key if using Frappe authentication, otherwise use the project-based key
const USE_FRAPPE_AUTH = process.env.EXPO_PUBLIC_USE_FRAPPE_AUTH === 'true';
export const authKey = USE_FRAPPE_AUTH
  ? 'tookio-shop-frappe-auth'
  : `${process.env.EXPO_PUBLIC_PROJECT_GROUP_ID}-jwt`;

/**
 * This store manages the authentication state of the application.
 */
export const useAuthStore = create((set) => ({
  isReady: false,
  auth: null,
  setAuth: (auth) => {
    if (auth) {
      SecureStore.setItemAsync(authKey, JSON.stringify(auth));
    } else {
      SecureStore.deleteItemAsync(authKey);
    }
    set({ auth });
  },
}));

/**
 * This store manages the state of the authentication modal.
 */
export const useAuthModal = create((set) => ({
  isOpen: false,
  mode: "signup",
  open: (options) => set({ isOpen: true, mode: options?.mode || "signup" }),
  close: () => set({ isOpen: false }),
}));
