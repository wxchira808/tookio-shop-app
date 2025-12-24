import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

// Lazy import to avoid bundling NetInfo on web
let NetInfo: any = null;

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (Platform.OS === 'web') {
      // Initial
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // Native: subscribe via NetInfo
    (async () => {
      try {
        const mod = await import('@react-native-community/netinfo');
        NetInfo = mod;
        unsubscribe = NetInfo.addEventListener((state: any) => {
          // Consider online when connected and internet is reachable if reported
          const connected = !!state.isConnected;
          const reachable = state.isInternetReachable ?? true;
          setIsOnline(connected && reachable);
        });

        // Seed initial state
        const initial = await NetInfo.fetch();
        const connected = !!initial.isConnected;
        const reachable = initial.isInternetReachable ?? true;
        setIsOnline(connected && reachable);
      } catch (e) {
        // Fallback to assuming online
        setIsOnline(true);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return useMemo(() => ({ isOnline }), [isOnline]);
}
