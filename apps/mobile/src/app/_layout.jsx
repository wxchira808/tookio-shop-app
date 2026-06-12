import { useAuth } from "@/utils/auth/useAuth";
import { AuthModal } from "@/utils/auth/useAuthModal";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initializeMobileAds } from "@/utils/ads/admobConfig";
import { checkSession } from "@/utils/frappeApi";
import { OfflineBanner } from "@/components/OfflineBanner";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { initiate, isReady, auth, signOut } = useAuth();

  useEffect(() => {
    // Initialize Mobile Ads on app start
    initializeMobileAds();
    initiate();
  }, [initiate]);

  useEffect(() => {
    if (!isReady || !auth) {
      return;
    }

    checkSession().catch(() => {
      signOut();
    });
  }, [auth, isReady, signOut]);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <OfflineBanner />
        <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        </Stack>
        <AuthModal />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
