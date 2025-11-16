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

        // Only check for session expiry on 401 or specific session-related errors
        // Don't log out on 403 (permission denied) as it might be a valid permission restriction
        if (response.status === 401 && auth) {
          // Clone response to read body without consuming it
          const clonedResponse = response.clone();
          try {
            const data = await clonedResponse.json();

            // Only log out if it's actually a session expiry message
            const errorMessage = data.exception || data.message || data._server_messages || '';
            const isSessionExpired =
              errorMessage.toLowerCase().includes('session') ||
              errorMessage.toLowerCase().includes('logged in') ||
              errorMessage.toLowerCase().includes('authentication');

            if (isSessionExpired) {
              console.log('🔒 Session expired detected by monitor');

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
            console.log('Could not parse 401 response:', e);
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
