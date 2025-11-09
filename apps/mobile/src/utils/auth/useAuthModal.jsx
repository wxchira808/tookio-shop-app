import React from "react";
import { FrappeAuthModal } from "./FrappeAuthModal";
import { useAuthStore, useAuthModal } from "./store";

/**
 * This component renders a modal for authentication purposes using Frappe backend.
 * To show it programmatically, you should either use the `useRequireAuth` hook or the `useAuthModal` hook.
 *
 * @example
 * ```js
 * import { useAuthModal } from '@/utils/useAuthModal';
 * function MyComponent() {
 * const { open } = useAuthModal();
 * return <Button title="Login" onPress={() => open({ mode: 'signin' })} />;
 * }
 * ```
 *
 * @example
 * ```js
 * import { useRequireAuth } from '@/utils/useAuth';
 * function MyComponent() {
 *   // automatically opens the auth modal if the user is not authenticated
 *   useRequireAuth();
 *   return <Text>Protected Content</Text>;
 * }
 *
 */
export const AuthModal = () => {
  const { isOpen, mode, close } = useAuthModal();
  const { auth } = useAuthStore();

  return (
    <FrappeAuthModal
      visible={isOpen && !auth}
      onClose={close}
      mode={mode}
    />
  );
};

export default useAuthModal;
