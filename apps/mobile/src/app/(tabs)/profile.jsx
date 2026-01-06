import { View, Text, ScrollView, Pressable, Alert, Linking, RefreshControl, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, handleApiError } from "@/utils/auth/useAuth";
import { AdBanner } from "@/components/AdBanner";
import useUser from "@/utils/auth/useUser";
import {
  User,
  Mail,
  Crown,
  LogOut,
  ArrowLeft,
  Settings,
  ExternalLink,
  Calendar,
  ChevronRight,
  RefreshCw,
  Package,
  ShoppingBag,
  FileText,
  AlertTriangle,
} from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useState, useCallback, useRef } from "react";
import { refreshUserDetails, checkSession, getUserSubscription } from "@/utils/frappeApi";
import * as SecureStore from "expo-secure-store";
import { authKey } from "@/utils/auth/store";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { signOut, setAuth } = useAuth();
  const { data: user, loading } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);
  const [subscription, setSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // Fetch subscription data
  const fetchSubscriptionData = useCallback(async () => {
    try {
      setLoadingSubscription(true);
      const data = await getUserSubscription();
      setSubscription(data);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      handleApiError(error, signOut);
    } finally {
      setLoadingSubscription(false);
    }
  }, [signOut]);

  // Refresh user details from server
  const handleRefresh = useCallback(async () => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshingRef.current) {
      console.log('🔄 Refresh already in progress, skipping...');
      return;
    }

    try {
      isRefreshingRef.current = true;
      setRefreshing(true);

      // Check session first
      await checkSession();

      const updatedUser = await refreshUserDetails();

      // Also refresh subscription data
      await fetchSubscriptionData();

      // Update auth in SecureStore and state
      const authData = await SecureStore.getItemAsync(authKey);
      if (authData) {
        const auth = JSON.parse(authData);
        const updatedAuth = {
          ...auth,
          user: {
            ...auth.user,
            ...updatedUser,
          },
        };
        await SecureStore.setItemAsync(authKey, JSON.stringify(updatedAuth));
        setAuth(updatedAuth);
      }
    } catch (error) {
      console.error("Error refreshing user details:", error);
      // Check for session timeout first
      if (!handleApiError(error, signOut)) {
        // Don't show alert on focus refresh, only on manual refresh
        if (refreshing) {
          Alert.alert("Error", "Failed to refresh user details");
        }
      }
    } finally {
      setRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [setAuth, fetchSubscriptionData]);

  // Auto-refresh when screen comes into focus (only once)
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Profile screen focused, refreshing subscription data...');
      fetchSubscriptionData();
      handleRefresh();
    }, [fetchSubscriptionData]) // Dependency on fetchSubscriptionData
  );

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  };

  const getSubscriptionColor = (planName) => {
    if (!planName) return "#64748B";
    const name = planName.toLowerCase();
    if (name.includes("premium") || name.includes("enterprise")) {
      return "#6366F1"; // Indigo for premium
    }
    if (name.includes("starter") || name.includes("pro")) {
      return "#10B981"; // Green for starter
    }
    return "#64748B"; // Gray for free
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FAFAFA",
          paddingTop: insets.top,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 16, color: "#64748B" }}>Loading...</Text>
      </View>
    );
  }

  const planName = subscription?.subscription_plan || "Free Plan";
  const planColor = getSubscriptionColor(planName);
  const isFree = planName.toLowerCase().includes("free");
  const subscriptionEnd = subscription?.subscription_end_date
    ? new Date(subscription.subscription_end_date)
    : null;
  const isExpired =
    subscription?.status?.toLowerCase() === "expired" ||
    (subscriptionEnd && subscriptionEnd.getTime() < Date.now());

  return (
    <View
      style={{ flex: 1, backgroundColor: "#FAFAFA", paddingTop: insets.top }}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: "#FFFFFF",
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: "#F1F5F9",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: pressed ? "#F1F5F9" : "transparent",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          })}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0F172A", letterSpacing: -0.5 }}>
          Account
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Profile Header Card */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: "#F1F5F9",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#F8FAFC",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "#10B98120",
                }}
              >
                <User size={28} color="#10B981" strokeWidth={2} />
              </View>
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: "#0F172A",
                    letterSpacing: -0.5,
                    marginBottom: 4,
                  }}
                >
                  {user?.name || "User"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Mail size={14} color="#64748B" />
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#64748B",
                      marginLeft: 6,
                    }}
                  >
                    {user?.email}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: "#F1F5F9",
                marginBottom: 20,
              }}
            />

            {/* Subscription Info */}
            {loadingSubscription ? (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <ActivityIndicator size="small" color="#10B981" />
              </View>
            ) : (
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Your Plan
                  </Text>
                  <Crown size={16} color={planColor} />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: planColor,
                    }}
                  >
                    {planName}
                  </Text>

                  {isExpired && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#FEE2E2",
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <AlertTriangle size={14} color="#B91C1C" />
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#B91C1C", marginLeft: 6 }}>
                        Expired
                      </Text>
                    </View>
                  )}
                </View>

                {/* Usage Stats */}
                {subscription && (
                  <View style={{ marginTop: 12 }}>
                    {/* Expiry Date */}
                    {subscriptionEnd && (
                      <View style={{ marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                        <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>
                          {isExpired ? "Expired on" : "Expires on"}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: isExpired ? "#B91C1C" : "#0F172A" }}>
                          {subscriptionEnd.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </Text>
                        {isExpired && (
                          <Text style={{ fontSize: 12, color: "#B91C1C", marginTop: 6 }}>
                            Renew or switch plans to regain full access.
                          </Text>
                        )}
                      </View>
                    )}
                    
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <ShoppingBag size={14} color="#64748B" />
                        <Text style={{ fontSize: 13, color: "#64748B", marginLeft: 6 }}>Shops</Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#0F172A" }}>
                        {!isFree ? `${subscription.current_shops || 0} / Unlimited` : `${subscription.current_shops || 0} / ${subscription.shop_limit === 0 ? "∞" : subscription.shop_limit}`}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Package size={14} color="#64748B" />
                        <Text style={{ fontSize: 13, color: "#64748B", marginLeft: 6 }}>Products</Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#0F172A" }}>
                        {!isFree ? `${subscription.current_products || 0} / Unlimited` : `${subscription.current_products || 0} / ${subscription.products_limit === 0 ? "∞" : subscription.products_limit}`}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <FileText size={14} color="#64748B" />
                        <Text style={{ fontSize: 13, color: "#64748B", marginLeft: 6 }}>Invoices</Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#0F172A" }}>
                        {!isFree ? `${subscription.current_sales_invoices || 0} / Unlimited` : `${subscription.current_sales_invoices || 0} / ${subscription.sales_invoice_limit === 0 ? "∞" : subscription.sales_invoice_limit}`}
                      </Text>
                    </View>
                  </View>
                )}

                {isFree && (
                  <Text style={{ fontSize: 13, color: "#64748B", marginTop: 12, lineHeight: 18 }}>
                    Upgrade to unlock higher limits and premium features
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Upgrade Button (only show for free plan) */}
        {!loadingSubscription && isFree && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            <Pressable
              onPress={() => router.push("/(tabs)/subscription")}
              style={({ pressed }) => ({
                backgroundColor: "#10B981",
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Crown size={20} color="#FFFFFF" strokeWidth={2.5} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  marginLeft: 10,
                  letterSpacing: -0.3,
                }}
              >
                Upgrade Plan
              </Text>
            </Pressable>
          </View>
        )}

        {/* View Subscription Details (for paid plans) */}
        {!loadingSubscription && !isFree && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            <Pressable
              onPress={() => router.push("/(tabs)/subscription")}
              style={({ pressed }) => ({
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderWidth: 1,
                borderColor: "#F1F5F9",
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Crown size={20} color={planColor} strokeWidth={2.5} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: planColor,
                  marginLeft: 10,
                  letterSpacing: -0.3,
                }}
              >
                Manage Subscription
              </Text>
            </Pressable>
          </View>
        )}

        {/* Actions */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 12,
              paddingLeft: 4,
            }}
          >
            Settings
          </Text>

          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#F1F5F9",
              overflow: "hidden",
            }}
          >
            <Pressable
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 16,
                paddingHorizontal: 20,
                backgroundColor: pressed ? "#F8FAFC" : "transparent",
                borderBottomWidth: 1,
                borderBottomColor: "#F1F5F9",
              })}
              onPress={() => {
                Linking.openURL('https://shop.tookio.co.ke/app/user').catch((err) => {
                  Alert.alert("Error", "Could not open account settings");
                });
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: "#F8FAFC",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Settings size={20} color="#0F172A" strokeWidth={2} />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#0F172A",
                  marginLeft: 16,
                  flex: 1,
                }}
              >
                Account Settings
              </Text>
              <ChevronRight size={20} color="#CBD5E1" />
            </Pressable>

            <Pressable
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 16,
                paddingHorizontal: 20,
                backgroundColor: pressed ? "#FEF2F2" : "transparent",
              })}
              onPress={handleSignOut}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: "#FEF2F2",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LogOut size={20} color="#EF4444" strokeWidth={2} />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#EF4444",
                  marginLeft: 16,
                  flex: 1,
                }}
              >
                Sign Out
              </Text>
              <ChevronRight size={20} color="#FCA5A5" />
            </Pressable>
          </View>
        </View>

        {/* App Version */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, alignItems: "center" }}>
          <Text style={{ fontSize: 12, color: "#94A3B8" }}>
            Tookio Shop v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Slim Ad Banner */}
      <AdBanner variant="slim" />
    </View>
  );
}
