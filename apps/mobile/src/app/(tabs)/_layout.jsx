import { Tabs, Redirect, usePathname, router } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import { View, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from "react";
import { useShopStore } from "@/utils/auth/store";
import { getShops } from "@/utils/frappeApi";
import {
  Home,
  Store,
  Package,
  BarChart3,
  DollarSign,
  ReceiptText,
  User,
} from "lucide-react-native";
import { colors } from "@/theme/frappeTheme";

export default function TabLayout() {
  const { isAuthenticated, isReady } = useAuth();
  const insets = useSafeAreaInsets();
  const { shops, hasLoaded, setShops, clearShops } = useShopStore();
  const pathname = usePathname();
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      clearShops();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !hasLoaded && !fetching) {
      setFetching(true);
      getShops()
        .then((res) => {
          setShops(res?.shops || []);
        })
        .catch((err) => {
          console.error("Error fetching shops in layout:", err);
        })
        .finally(() => {
          setFetching(false);
        });
    }
  }, [isAuthenticated, hasLoaded, fetching]);

  const enabledShops = shops.filter((s) => s.enabled === 1);
  const hasNoShop = hasLoaded && enabledShops.length === 0;

  useEffect(() => {
    if (isReady && isAuthenticated && hasNoShop) {
      if (pathname !== "/shops") {
        router.replace("/shops");
      }
    }
  }, [isReady, isAuthenticated, hasNoShop, pathname]);

  // Show loading while checking auth state or loading shops
  if (!isReady || (isAuthenticated && !hasLoaded)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.inkGray6} />
      </View>
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/auth" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surfaceBase,
          borderTopWidth: 1,
          borderColor: colors.outlineGray1,
          paddingTop: 8,
          // On web the safe area insets are 0 even on phones with home bars.
          // Use env(safe-area-inset-bottom) via paddingBottom for web,
          // and the real inset on native.
          paddingBottom: Platform.OS === 'web' ? 16 : (insets.bottom > 0 ? insets.bottom : 8),
          minHeight: Platform.OS === 'web' ? 68 : (insets.bottom > 0 ? 56 + insets.bottom : 60),
        },
        tabBarActiveTintColor: colors.inkGray8,
        tabBarInactiveTintColor: colors.inkGray4,
        tabBarShowLabel: false, // Commented out / disabled icon labels
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          href: hasNoShop ? null : undefined,
          tabBarIcon: ({ color }) => <Home color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="shops"
        options={{
          title: "Shops",
          tabBarIcon: ({ color }) => <Store color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="items"
        options={{
          title: "Inventory",
          href: hasNoShop ? null : undefined,
          tabBarIcon: ({ color}) => <Package color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="purchases"
        options={{
          title: "Expenses",
          href: hasNoShop ? null : undefined,
          tabBarIcon: ({ color }) => <ReceiptText color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
          href: null, // Hidden - stock management moved to Inventory tab
          tabBarIcon: ({ color }) => (
            <BarChart3 color={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: "Sales",
          href: hasNoShop ? null : undefined,
          tabBarIcon: ({ color }) => (
            <DollarSign color={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          href: null,
          tabBarIcon: ({ color }) => (
            <User color={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="account-details"
        options={{
          href: null,
          title: "Account Management",
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          href: null,
          title: "Subscription",
        }}
      />
    </Tabs>
  );
}
