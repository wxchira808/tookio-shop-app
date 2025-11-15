import { View, Text, ScrollView, Pressable, Alert, Linking, RefreshControl } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/utils/auth/useAuth";
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
} from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useState, useCallback, useRef } from "react";
import { refreshUserDetails } from "@/utils/frappeApi";
import * as SecureStore from "expo-secure-store";
import { authKey } from "@/utils/auth/store";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { signOut, setAuth } = useAuth();
  const { data: user, loading } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);

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

      const updatedUser = await refreshUserDetails();

      // Update auth in SecureStore and state
      // Note: Subscription is preserved from login - portal users can't query Customer doctype
      const authData = await SecureStore.getItemAsync(authKey);
      if (authData) {
        const auth = JSON.parse(authData);
        const updatedAuth = {
          ...auth,
          user: {
            ...auth.user,
            ...updatedUser,
            // Preserve subscription from login since we can't re-query it
            subscription_tier: auth.user.subscription_tier || 'free',
            subscription_expiry: auth.user.subscription_expiry || null,
          },
        };
        await SecureStore.setItemAsync(authKey, JSON.stringify(updatedAuth));
        setAuth(updatedAuth);
      }
    } catch (error) {
      console.error("Error refreshing user details:", error);
      // Don't show alert on focus refresh, only on manual refresh
      if (refreshing) {
        Alert.alert("Error", "Failed to refresh user details");
      }
    } finally {
      setRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [setAuth]);

  // Auto-refresh when screen comes into focus (only once)
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Profile screen focused, refreshing subscription data...');
      handleRefresh();
    }, []) // Empty dependency array - only run on focus
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

  const getSubscriptionTier = () => {
    const tier = user?.subscription_tier || "free";
    return tier.toLowerCase();
  };

  const getSubscriptionColor = (tier) => {
    const tierLower = tier.toLowerCase();
    if (tierLower.includes("business") || tierLower.includes("enterprise")) {
      return "#6366F1"; // Indigo for business/enterprise
    }
    if (tierLower.includes("pro") || tierLower.includes("premium")) {
      return "#10B981"; // Green for pro/premium
    }
    if (tierLower.includes("starter") || tierLower.includes("basic")) {
      return "#F59E0B"; // Amber for starter/basic
    }
    return "#64748B"; // Slate gray for free
  };

  const getSubscriptionLabel = (tier) => {
    const tierLower = tier.toLowerCase();

    // Capitalize the tier name properly
    const capitalize = (str) => {
      return str.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    };

    // If it's "free", return "Free Plan"
    if (tierLower === "free") {
      return "Free Plan";
    }

    // Otherwise return the tier name capitalized
    return capitalize(tier);
  };

  const formatExpiryDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return null;
    }
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

  const currentTier = getSubscriptionTier();
  const subscriptionColor = getSubscriptionColor(currentTier);
  const subscriptionLabel = getSubscriptionLabel(currentTier);
  const expiryDate = user?.subscription_expiry;

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
                  borderColor: subscriptionColor + "20",
                }}
              >
                <User size={28} color={subscriptionColor} strokeWidth={2} />
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
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Subscription Plan
                </Text>
                <Crown size={16} color={subscriptionColor} />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: subscriptionColor,
                  marginBottom: expiryDate ? 8 : 0,
                }}
              >
                {subscriptionLabel}
              </Text>
              {expiryDate && (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                  <Calendar size={14} color="#64748B" />
                  <Text style={{ fontSize: 13, color: "#64748B", marginLeft: 6 }}>
                    Expires: {formatExpiryDate(expiryDate)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Manage Subscription Button */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <Pressable
            onPress={() => router.push("/subscription")}
            style={({ pressed }) => ({
              backgroundColor: subscriptionColor,
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
              {currentTier === "free" ? "Upgrade Plan" : "Manage Subscription"}
            </Text>
          </Pressable>
        </View>

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
    </View>
  );
}
