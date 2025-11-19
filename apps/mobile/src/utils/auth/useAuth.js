import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo } from "react";
import { create } from "zustand";
import { Modal, View } from "react-native";
import { useAuthModal, useAuthStore, authKey } from "./store";
import { logout as frappeLogout } from "@/utils/frappeApi";

/**
 * This hook provides authentication functionality.
 * It may be easier to use the `useAuthModal` or `useRequireAuth` hooks
 * instead as those will also handle showing authentication to the user
 * directly.
 */
export const useAuth = () => {
  const { isReady, auth, setAuth } = useAuthStore();
  const { isOpen, close, open } = useAuthModal();

  const initiate = useCallback(() => {
    SecureStore.getItemAsync(authKey).then((auth) => {
      useAuthStore.setState({
        auth: auth ? JSON.parse(auth) : null,
        isReady: true,
      });
    });
  }, []);

  useEffect(() => {}, []);

  const signIn = useCallback(() => {
    open({ mode: "signin" });
  }, [open]);
  const signUp = useCallback(() => {
    open({ mode: "signup" });
  }, [open]);

  const signOut = useCallback(async () => {
    try {
      // Call Frappe logout
      await frappeLogout();
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      // Clear local auth state
      setAuth(null);
      close();
      // Redirect to auth screen
      router.replace('/auth');
    }
  }, [close, setAuth]);

  return {
    isReady,
    isAuthenticated: isReady ? !!auth : null,
    signIn,
    signOut,
    signUp,
    auth,
    setAuth,
    initiate,
  };
};

/**
 * This hook will automatically open the authentication modal if the user is not authenticated.
 */
export const useRequireAuth = (options) => {
  const { isAuthenticated, isReady } = useAuth();
  const { open } = useAuthModal();

  useEffect(() => {
    if (!isAuthenticated && isReady) {
      open({ mode: options?.mode });
    }
  }, [isAuthenticated, open, options?.mode, isReady]);
};

/**
 * Helper function to handle API errors and check for session expiry
 * Use this in catch blocks to automatically handle session timeouts
 * @param {Error} error - The error from the API call
 * @param {Function} signOut - The signOut function from useAuth
 * @param {string} fallbackMessage - Optional fallback error message to display
 * @returns {boolean} - Returns true if it was a session error, false otherwise
 */
export const handleApiError = (error, signOut, fallbackMessage = "An error occurred") => {
  // Check if error indicates session expiry
  if (error?.sessionExpired ||
      error?.message?.includes('session has expired') ||
      error?.message?.includes('Session expired')) {
    console.log('🔒 Session expired error detected, signing out...');
    signOut();
    return true;
  }
  return false;
};

export default useAuth;
