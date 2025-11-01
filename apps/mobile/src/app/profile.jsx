import { View, Text, ScrollView, Pressable, Alert } from "react-native";
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
} from "lucide-react-native";
import { router } from "expo-router";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { data: user, loading } = useUser();

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
    return user?.subscription_tier || "free";
  };

  const getSubscriptionColor = (tier) => {
    switch (tier) {
      case "pro":
        return "#10B981";
      case "starter":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const getSubscriptionLabel = (tier) => {
    switch (tier) {
      case "pro":
        return "Pro - $10/month";
      case "starter":
        return "Starter - $4/month";
      default:
        return "Free Plan";
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F8FAFC",
          paddingTop: insets.top,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 16, color: "#6B7280" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: "#F8FAFC", paddingTop: insets.top }}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 20,
          backgroundColor: "#fff",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#F3F4F6",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <ArrowLeft size={20} color="#6B7280" />
        </Pressable>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}>
          Profile
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        <View style={{ padding: 20 }}>
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View
              style={{
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "#357AFF15",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <User size={32} color="#357AFF" />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "600",
                  color: "#1F2937",
                }}
              >
                {user?.name || "User"}
              </Text>
            </View>

            {/* User Details */}
            <View style={{ gap: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: "#F3F4F6",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Mail size={18} color="#6B7280" />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#6B7280",
                      marginBottom: 2,
                    }}
                  >
                    Email
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "500",
                      color: "#1F2937",
                    }}
                  >
                    {user?.email}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor:
                      getSubscriptionColor(getSubscriptionTier()) + "15",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Crown
                    size={18}
                    color={getSubscriptionColor(getSubscriptionTier())}
                  />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#6B7280",
                      marginBottom: 2,
                    }}
                  >
                    Subscription
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "500",
                      color: getSubscriptionColor(getSubscriptionTier()),
                    }}
                  >
                    {getSubscriptionLabel(getSubscriptionTier())}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#1F2937",
              marginBottom: 16,
            }}
          >
            Settings
          </Text>

          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Pressable
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
                opacity: pressed ? 0.7 : 1,
              })}
              onPress={() => {
                Alert.alert("Settings", "Settings page coming soon!");
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Settings size={18} color="#6B7280" />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "500",
                  color: "#1F2937",
                  flex: 1,
                }}
              >
                Account Settings
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                opacity: pressed ? 0.7 : 1,
              })}
              onPress={handleSignOut}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: "#FEF2F2",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <LogOut size={18} color="#EF4444" />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "500",
                  color: "#EF4444",
                  flex: 1,
                }}
              >
                Sign Out
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
