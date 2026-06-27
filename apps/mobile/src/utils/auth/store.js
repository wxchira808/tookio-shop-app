import { create } from "zustand";
import { deleteStorageItem, setJsonStorageItem } from "@/utils/authStorage";

export const authKey = `tookio-frappe-auth`;

/**
 * This store manages the authentication state of the application.
 */
export const useAuthStore = create((set) => ({
  isReady: false,
  auth: null,
  setAuth: (auth) => {
    if (auth) {
      setJsonStorageItem(authKey, auth);
    } else {
      deleteStorageItem(authKey);
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
