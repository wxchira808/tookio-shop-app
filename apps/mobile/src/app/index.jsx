import { Redirect } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import { View, ActivityIndicator, Text, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Index() {
  const { isAuthenticated, isReady } = useAuth();
  const insets = useSafeAreaInsets();

  // Show branded splash screen while checking auth state
  if (!isReady) {
    return (
      <View 
        style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        {/* Logo/App Icon */}
        <Image
          source={require('@/assets/images/icon.png')}
          style={{
            width: 60,
            height: 60,
            borderRadius: 15,
            marginBottom: 32,
          }}
          resizeMode="contain"
        />

        {/* App Name */}
        <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 40 }}>
          Your Business Management App
        </Text>

        {/* Loading Indicator */}
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 16 }}>
          Loading...
        </Text>
      </View>
    );
  }

  // Redirect based on authentication state
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/auth" />;
  }
}
