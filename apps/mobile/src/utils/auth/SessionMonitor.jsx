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

        // Check if session expired (401 or 403)
        if ((response.status === 401 || response.status === 403) && auth) {
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
