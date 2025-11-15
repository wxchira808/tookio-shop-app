import { View, Text, ScrollView, Pressable, Alert, Modal } from "react-native";
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
  X,
  Info,
  Shield,
  HelpCircle,
} from "lucide-react-native";
import { router } from "expo-router";
import { useState } from "react";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { data: user, loading } = useUser();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

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
    const tierLower = (tier || "").toLowerCase();
    if (tierLower.includes("business") || tierLower.includes("premium")) {
      return "#8B5CF6"; // Purple for Business/Premium
    }
    if (tierLower.includes("pro")) {
      return "#10B981"; // Green for Pro
    }
    if (tierLower.includes("starter") || tierLower.includes("basic")) {
      return "#F59E0B"; // Orange for Starter
    }
    return "#6B7280"; // Gray for Free
  };

  const getSubscriptionLabel = (tier) => {
    // Use the actual plan name from Frappe
    if (tier && tier !== "free") {
      return tier;
    }
    return "Free Plan";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysUntilExpiry = () => {
    if (!user?.subscription_expiry) return null;
    const expiry = new Date(user.subscription_expiry);
    const now = new Date();
    const diff = expiry - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
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
              onPress={() => setShowSettingsModal(true)}
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

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "80%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: "#1F2937",
                }}
              >
                Account Settings
              </Text>
              <Pressable
                onPress={() => setShowSettingsModal(false)}
                style={{ padding: 4 }}
              >
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 500 }}>
              <View style={{ padding: 20, gap: 16 }}>
                {/* App Information */}
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#1F2937",
                      marginBottom: 12,
                    }}
                  >
                    App Information
                  </Text>

                  <View
                    style={{
                      backgroundColor: "#F9FAFB",
                      borderRadius: 12,
                      padding: 16,
                      gap: 12,
                    }}
                  >
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
                          backgroundColor: "#357AFF15",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Info size={20} color="#357AFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#6B7280",
                            marginBottom: 2,
                          }}
                        >
                          Version
                        </Text>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "500",
                            color: "#1F2937",
                          }}
                        >
                          1.0.0
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        height: 1,
                        backgroundColor: "#E5E7EB",
                        marginVertical: 4,
                      }}
                    />

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
                          backgroundColor: "#10B98115",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Shield size={20} color="#10B981" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#6B7280",
                            marginBottom: 2,
                          }}
                        >
                          Account Status
                        </Text>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "500",
                            color: "#10B981",
                          }}
                        >
                          Active
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Subscription Details */}
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#1F2937",
                      marginBottom: 12,
                    }}
                  >
                    Subscription Details
                  </Text>

                  <View
                    style={{
                      backgroundColor: "#F9FAFB",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#6B7280",
                            marginBottom: 4,
                          }}
                        >
                          Current Plan
                        </Text>
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "600",
                            color: getSubscriptionColor(getSubscriptionTier()),
                          }}
                        >
                          {getSubscriptionLabel(getSubscriptionTier())}
                        </Text>
                      </View>
                      <Crown
                        size={28}
                        color={getSubscriptionColor(getSubscriptionTier())}
                      />
                    </View>

                    {/* Plan Limits */}
                    <View
                      style={{
                        backgroundColor: "#fff",
                        borderRadius: 8,
                        padding: 12,
                        marginTop: 8,
                        gap: 8,
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 14, color: "#6B7280" }}>
                          Shops Allowed:
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>
                          {user?.shops_allowed || 1}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 14, color: "#6B7280" }}>
                          Items Allowed:
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>
                          {user?.items_allowed || 10}
                        </Text>
                      </View>
                      {user?.subscription_status && (
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 14, color: "#6B7280" }}>
                            Status:
                          </Text>
                          <Text style={{ fontSize: 14, fontWeight: "600", color: "#10B981" }}>
                            {user.subscription_status}
                          </Text>
                        </View>
                      )}
                      {user?.subscription_expiry && (
                        <>
                          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ fontSize: 14, color: "#6B7280" }}>
                              Expires:
                            </Text>
                            <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>
                              {formatDate(user.subscription_expiry)}
                            </Text>
                          </View>
                          {getDaysUntilExpiry() !== null && getDaysUntilExpiry() <= 7 && (
                            <View
                              style={{
                                backgroundColor: "#FEF3C7",
                                padding: 8,
                                borderRadius: 6,
                                marginTop: 4,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 13,
                                  color: "#92400E",
                                  textAlign: "center",
                                }}
                              >
                                {getDaysUntilExpiry() > 0
                                  ? `Expires in ${getDaysUntilExpiry()} day${getDaysUntilExpiry() !== 1 ? 's' : ''}`
                                  : "Expired"}
                              </Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>

                    {/* Upgrade Button */}
                    {getSubscriptionTier() === "free" && (
                      <Pressable
                        style={({ pressed }) => ({
                          backgroundColor: "#10B981",
                          borderRadius: 8,
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          marginTop: 12,
                          opacity: pressed ? 0.7 : 1,
                        })}
                        onPress={() => {
                          Alert.alert(
                            "Upgrade Plan",
                            "Visit https://shop.tookio.co.ke/subscriptions to upgrade your plan and unlock more features!",
                            [
                              { text: "OK" },
                            ]
                          );
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "600",
                            color: "#fff",
                            textAlign: "center",
                          }}
                        >
                          Upgrade Plan
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Help & Support */}
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#1F2937",
                      marginBottom: 12,
                    }}
                  >
                    Help & Support
                  </Text>

                  <Pressable
                    style={({ pressed }) => ({
                      backgroundColor: "#F9FAFB",
                      borderRadius: 12,
                      padding: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      opacity: pressed ? 0.7 : 1,
                    })}
                    onPress={() => {
                      Alert.alert(
                        "Help Center",
                        "For support and documentation, visit our help center or contact support@tookio.com"
                      );
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        backgroundColor: "#F59E0B15",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <HelpCircle size={20} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "500",
                          color: "#1F2937",
                        }}
                      >
                        Help Center
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#6B7280",
                          marginTop: 2,
                        }}
                      >
                        Get help and support
                      </Text>
                    </View>
                  </Pressable>
                </View>

                {/* Account Info */}
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#1F2937",
                      marginBottom: 12,
                    }}
                  >
                    Your Account
                  </Text>

                  <View
                    style={{
                      backgroundColor: "#F9FAFB",
                      borderRadius: 12,
                      padding: 16,
                      gap: 12,
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#6B7280",
                          marginBottom: 4,
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

                    <View
                      style={{
                        height: 1,
                        backgroundColor: "#E5E7EB",
                        marginVertical: 4,
                      }}
                    />

                    <View>
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#6B7280",
                          marginBottom: 4,
                        }}
                      >
                        Name
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "500",
                          color: "#1F2937",
                        }}
                      >
                        {user?.name || "User"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View
              style={{
                padding: 20,
                borderTopWidth: 1,
                borderTopColor: "#E5E7EB",
              }}
            >
              <Pressable
                onPress={() => setShowSettingsModal(false)}
                style={({ pressed }) => ({
                  backgroundColor: "#357AFF",
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#fff",
                  }}
                >
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
