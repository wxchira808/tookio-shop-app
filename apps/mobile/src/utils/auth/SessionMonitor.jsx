import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from './store';
import { Alert } from 'react-native';

/**
 * Global session monitor that handles session expiry
 * This component doesn't render anything but listens for session expiry errors
 */
export function SessionMonitor() {
  const { auth, setAuth } = useAuthStore();

  useEffect(() => {
    // Create a global error handler for session expiry
    const originalFetch = global.fetch;

    global.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        // Check for session expiry on 401 errors OR Guest user in error messages
        // Don't log out on 403 (permission denied) unless it's a Guest user error
        if ((response.status === 401 || response.status === 403) && auth) {
          // Clone response to read body without consuming it
          const clonedResponse = response.clone();
          try {
            const data = await clonedResponse.json();

            // Check if it's a session expiry or Guest user error
            const errorMessage = data.exception || data.message || data._server_messages || '';
            const errorString = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);

            const isSessionExpired =
              errorString.toLowerCase().includes('session') ||
              errorString.toLowerCase().includes('logged in') ||
              errorString.toLowerCase().includes('authentication') ||
              errorString.includes('User <strong>Guest</strong>') ||
              (errorString.includes('Guest') && errorString.includes('does not have'));

            if (isSessionExpired) {
              console.log('🔒 Session expired detected by monitor (Guest user or 401)');

              // Clear auth state
              setAuth(null);

              // Show alert
              Alert.alert(
                'Session Expired',
                'Your session has expired. Please login again.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Redirect to auth screen
                      router.replace('/auth');
                    },
                  },
                ]
              );
            }
          } catch (e) {
            // If we can't parse the response, ignore it
            console.log('Could not parse session error response:', e);
          }
        }

        return response;
      } catch (error) {
        throw error;
      }
    };

    // Cleanup
    return () => {
      global.fetch = originalFetch;
    };
  }, [auth, setAuth]);

  return null;
}
