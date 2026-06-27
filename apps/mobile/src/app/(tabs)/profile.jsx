import { View, Text, Alert, RefreshControl, ActivityIndicator, BackHandler, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, handleApiError } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import {
  Crown,
  LogOut,
  ArrowLeft,
  Settings,
} from "lucide-react-native";
import { router } from "expo-router";
import { useState, useCallback, useRef, useEffect } from "react";
import { refreshUserDetails, checkSession, getUserSubscription } from "@/utils/frappeApi";
import { getStorageItem, setJsonStorageItem } from "@/utils/authStorage";
import { authKey } from "@/utils/auth/store";
import { AdBanner } from "@/components/AdBanner";
import {
  AppButton,
  Badge,
  Card,
  IconButton,
  ListRow,
  PageHeader,
  Screen,
  Section,
} from "@/components/frappe-ui";
import { colors, spacing, type } from "@/theme/frappeTheme";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { signOut, setAuth } = useAuth();
  const { data: user, loading } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);
  const [subscription, setSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  const loadProfileData = useCallback(async ({ showSpinner = false } = {}) => {
    try {
      if (isRefreshingRef.current) {
        return;
      }

      isRefreshingRef.current = true;
      setLoadingSubscription(true);
      if (showSpinner) {
        setRefreshing(true);
      }
      const data = await getUserSubscription();
      setSubscription(data);
      await checkSession();
      const updatedUser = await refreshUserDetails();

      const authData = await getStorageItem(authKey);
      if (authData) {
        const auth = JSON.parse(authData);
        const updatedAuth = { ...auth, user: { ...auth.user, ...updatedUser } };
        await setJsonStorageItem(authKey, updatedAuth);
        setAuth(updatedAuth);
      }
    } catch (error) {
      console.error("Error refreshing user details:", error);
      if (!handleApiError(error, signOut) && showSpinner) {
        Alert.alert("Error", "Failed to refresh account details.");
      }
    } finally {
      setLoadingSubscription(false);
      setRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [setAuth, signOut]);

  const handleRefresh = useCallback(async () => {
    await loadProfileData({ showSpinner: true });
  }, [loadProfileData]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  useEffect(() => {
    const backAction = () => {
      router.replace("/(tabs)");
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  if (loading) {
    return (
      <Screen insets={insets}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.inkGray6} />
        </View>
      </Screen>
    );
  }

  const planName = subscription?.subscription_plan || "Free Plan";
  const isFree = planName.toLowerCase().includes("free");
  const isExpired = subscription?.status?.toLowerCase() === "expired";
  const usageRows = [
    { label: "Shops", value: `${subscription?.current_shops || 0}` },
    { label: "Products", value: `${subscription?.current_products || 0}` },
    { label: "Invoices", value: `${subscription?.current_sales_invoices || 0}` },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceBase, paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <PageHeader
        title="Account"
        left={
          <IconButton
            icon={ArrowLeft}
            onPress={() => router.replace("/(tabs)")}
          />
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >

      <Section>
        <Card style={{ padding: spacing.xl, gap: spacing.sm }}>
          <Text style={type.cardTitle}>{user?.name || "User"}</Text>
          <Text style={type.bodyMuted}>{user?.email}</Text>
        </Card>
      </Section>

      <Section label="Plan">
        <Card style={{ padding: spacing.xl, gap: spacing.md }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={type.cardTitle}>{planName}</Text>
            <Badge label={isExpired ? "Expired" : "Active"} theme={isExpired ? "red" : isFree ? "gray" : "blue"} />
          </View>

          {loadingSubscription ? (
            <ActivityIndicator color={colors.inkGray6} />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {usageRows.map((row) => (
                <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={type.bodyMuted}>{row.label}</Text>
                  <Text style={type.body}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}

          <AppButton
            label={isFree ? "Upgrade plan" : "Manage subscription"}
            onPress={() => router.push("/(tabs)/subscription")}
            variant={isFree ? "solid" : "outline"}
          />
        </Card>
      </Section>

      <Section label="Settings" style={{ marginBottom: spacing.xl }}>
        <Card>
          <ListRow
            title="Account settings"
            subtitle="Profile details and password"
            onPress={() => router.push("/(tabs)/account-details")}
            badge={<Settings size={16} color={colors.inkGray5} strokeWidth={1.8} />}
          />
          <ListRow
            title="Subscription"
            subtitle="Billing and limits"
            onPress={() => router.push("/(tabs)/subscription")}
            badge={<Crown size={16} color={colors.inkGray5} strokeWidth={1.8} />}
          />
          <ListRow
            title="Sign out"
            subtitle="End your current session"
            onPress={handleSignOut}
            badge={<LogOut size={16} color={colors.red} strokeWidth={1.8} />}
          />
        </Card>
      </Section>

      </ScrollView>

      <AdBanner variant="slim" context="dashboard" />
    </View>
  );
}
