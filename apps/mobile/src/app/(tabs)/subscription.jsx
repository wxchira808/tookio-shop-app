import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRequireAuth, useAuth, handleApiError } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import { Crown, Check, X, Zap, Store, Package, FileText, ArrowLeft } from "lucide-react-native";
import { useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  getSubscriptionPlans,
  getUserSubscription,
  submitPaymentConfirmation,
  checkUserLimits,
  checkSession,
  refreshUserDetails,
  switchToFreePlan,
} from "@/utils/frappeApi";
import { formatCurrency } from "@/utils/currency";
import * as SecureStore from "expo-secure-store";
import { authKey } from "@/utils/auth/store";

export default function Subscription() {
  useRequireAuth();
  const { signOut, setAuth } = useAuth();
  const { data: user } = useUser();
  const insets = useSafeAreaInsets();

  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [userName, setUserName] = useState("");
  const [paymentStep, setPaymentStep] = useState(1); // 1 = payment instructions, 2 = confirm details
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      await checkSession();
      setLoading(true);

      const [plansRes, subRes, limitsRes] = await Promise.all([
        getSubscriptionPlans(),
        getUserSubscription(),
        checkUserLimits(),
      ]);

      if (plansRes && plansRes.plans) {
        setPlans(plansRes.plans);
      }

      if (subRes) {
        setCurrentSubscription(subRes);
      }

      if (limitsRes) {
        setLimits(limitsRes);
      }
    } catch (error) {
      console.error("Error loading subscription data:", error);
      if (!handleApiError(error, signOut)) {
        Alert.alert("Error", "Failed to load subscription data");
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSelectPlan = async (plan) => {
    const isActive = currentSubscription?.status?.toLowerCase() === "active";

    const isFreeDowngrade =
      currentSubscription?.current_subscription &&
      !currentSubscription.current_subscription.includes("Free") &&
      plan.subscription_name.includes("Free") &&
      isActive;

    const hasActiveNonFreePlan =
      currentSubscription?.current_subscription &&
      !currentSubscription.current_subscription.includes("Free") &&
      isActive;

    if (isFreeDowngrade) {
      Alert.alert(
        "Free Plan",
        "Your current subscription will automatically downgrade to Free Plan when it expires. No action needed!",
        [{ text: "OK", style: "cancel" }]
      );
      return;
    }

    if (hasActiveNonFreePlan && !plan.subscription_name.includes("Free")) {
      Alert.alert(
        "Active Subscription",
        "You already have an active subscription. Please wait until it expires to upgrade to a different plan.",
        [{ text: "OK" }]
      );
      return;
    }

    // Handle Free Plan selection (no payment required)
    if (plan.subscription_name.includes("Free")) {
      try {
        setProcessing(true);
        const result = await switchToFreePlan();

        if (result && result.success) {
          // Refresh user details and auth state after switching
          try {
            const updatedUser = await refreshUserDetails();
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
          } catch (refreshError) {
            console.error("Error refreshing after free plan switch:", refreshError);
          }

          Alert.alert("Success", "You have successfully switched to the Free Plan!", [
            {
              text: "OK",
              onPress: () => {
                loadData();
              },
            },
          ]);
        }
      } catch (error) {
        console.error("Error switching to free plan:", error);
        Alert.alert("Error", error.message || "Failed to switch to free plan");
      } finally {
        setProcessing(false);
      }
      return;
    }

    // For paid plans, show payment modal
    setSelectedPlan(plan);
    setPaymentStep(1);
    setUserName("");
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!userName.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    try {
      setProcessing(true);
      
      // Simulate 7 second delay
      await new Promise(resolve => setTimeout(resolve, 7000));
      
      const result = await submitPaymentConfirmation(selectedPlan.name, userName.trim());
      
      if (result && result.success) {
        // Refresh user details and auth state after upgrade
        try {
          const updatedUser = await refreshUserDetails();
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
        } catch (refreshError) {
          console.error("Error refreshing after upgrade:", refreshError);
        }

        Alert.alert("Success", "Your account has been upgraded successfully! You now have access to premium features.", [
          {
            text: "OK",
            onPress: () => {
              setShowPaymentModal(false);
              setSelectedPlan(null);
              setUserName("");
              setPaymentStep(1);
              loadData();
            },
          },
        ]);
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      Alert.alert("Error", error.message || "Failed to process payment");
    } finally {
      setProcessing(false);
    }
  };

  const getPlanColor = (planName) => {
    if (planName.includes("Free")) return "#6B7280";
    if (planName.includes("Starter")) return "#3B82F6";
    if (planName.includes("Premium")) return "#8B5CF6";
    return "#6B7280";
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#357AFF" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 20,
          paddingBottom: 20,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
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
          <Crown size={28} color="#8B5CF6" />
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937", marginLeft: 12 }}>
            Subscription Plans
          </Text>
        </View>
        <Text style={{ fontSize: 14, color: "#6B7280", marginLeft: 52 }}>
          Choose the perfect plan for your business
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current Subscription */}
        {currentSubscription && (() => {
          const endDate = currentSubscription.subscription_end_date
            ? new Date(currentSubscription.subscription_end_date)
            : null;
          const isExpired =
            currentSubscription.status?.toLowerCase() === "expired" ||
            (endDate && endDate.getTime() < Date.now());
          const statusLabel = currentSubscription.status || (isExpired ? "Expired" : "Active");
          const cardBorder = isExpired ? "#EF4444" : "#10B981";
          const badgeBg = isExpired ? "#FEE2E2" : "#ECFDF3";
          const badgeText = isExpired ? "#B91C1C" : "#166534";
          const formattedDate = formatDate(currentSubscription.subscription_end_date);

          return (
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#1F2937", marginBottom: 12 }}>
                Current Plan
              </Text>
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 2,
                  borderColor: cardBorder,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
                  {currentSubscription.current_subscription || "Free Plan"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                  <View
                    style={{
                      backgroundColor: badgeBg,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: badgeText }}>
                      {statusLabel.toUpperCase()}
                    </Text>
                  </View>
                  {formattedDate && (
                    <Text style={{ fontSize: 12, color: isExpired ? "#B91C1C" : "#6B7280", marginLeft: 10 }}>
                      {isExpired ? "Expired on" : "Renews on"} {formattedDate}
                    </Text>
                  )}
                </View>
                {limits && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>Shops</Text>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: limits.shops.exceeded ? "#EF4444" : "#10B981" }}>
                        {limits.shops.used} / {limits.shops.limit}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>Products</Text>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: limits.products.exceeded ? "#EF4444" : "#10B981" }}>
                        {limits.products.used} / {limits.products.limit}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>Sales Invoices</Text>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: limits.sales_invoices.exceeded ? "#EF4444" : "#10B981" }}>
                        {limits.sales_invoices.used} / {limits.sales_invoices.limit || "Unlimited"}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* Available Plans */}
        <View style={{ padding: 20, paddingTop: 0 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#1F2937", marginBottom: 12 }}>
            Available Plans
          </Text>
          {plans.map((plan) => {
            const isCurrentPlan = currentSubscription?.current_subscription === plan.subscription_name;
            const planColor = getPlanColor(plan.subscription_name);

            return (
              <View
                key={plan.name}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 12,
                  borderWidth: isCurrentPlan ? 2 : 1,
                  borderColor: isCurrentPlan ? planColor : "#E5E7EB",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: "bold", color: "#1F2937" }}>
                      {plan.subscription_name}
                    </Text>
                    <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
                      {plan.description}
                    </Text>
                  </View>
                  {isCurrentPlan && (
                    <View
                      style={{
                        backgroundColor: planColor + "15",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "600", color: planColor }}>
                        CURRENT
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 32, fontWeight: "bold", color: planColor }}>
                    {formatCurrency(plan.price)}
                    <Text style={{ fontSize: 14, fontWeight: "normal", color: "#6B7280" }}>/month</Text>
                  </Text>
                </View>

                <View style={{ marginTop: 16, gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Store size={16} color={planColor} />
                    <Text style={{ fontSize: 14, color: "#374151", marginLeft: 8 }}>
                      {plan.shop_limit === 0 ? "Unlimited Shops" : `${plan.shop_limit} ${plan.shop_limit === 1 ? "Shop" : "Shops"}`}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Package size={16} color={planColor} />
                    <Text style={{ fontSize: 14, color: "#374151", marginLeft: 8 }}>
                      {plan.products_limit === 0 ? "Unlimited Products" : `${plan.products_limit} Products`}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <FileText size={16} color={planColor} />
                    <Text style={{ fontSize: 14, color: "#374151", marginLeft: 8 }}>
                      {plan.sales_invoice_limit === 0 ? "Unlimited" : plan.sales_invoice_limit} Sales Invoices
                    </Text>
                  </View>
                </View>

                {!isCurrentPlan && (
                  <Pressable
                    onPress={() => handleSelectPlan(plan)}
                    style={({ pressed }) => ({
                      backgroundColor: planColor,
                      borderRadius: 8,
                      paddingVertical: 12,
                      marginTop: 16,
                      alignItems: "center",
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
                      {plan.price === 0 ? "Switch to Free" : "Upgrade Now"}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => !processing && setShowPaymentModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "flex-end",
            }}
          >
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "flex-end",
              }}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  padding: 20,
                  paddingBottom: insets.bottom + 20,
                }}
              >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: "#1F2937" }}>
                {paymentStep === 1 ? "Payment Instructions" : "Confirm Details"}
              </Text>
              {!processing && (
                <Pressable onPress={() => {
                  setShowPaymentModal(false);
                  setPaymentStep(1);
                  setUserName("");
                }} style={{ padding: 4 }}>
                  <X size={24} color="#6B7280" />
                </Pressable>
              )}
            </View>

            {selectedPlan && (
              <View>
                <View
                  style={{
                    backgroundColor: "#F3F4F6",
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 20,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
                    {selectedPlan.subscription_name}
                  </Text>
                  <Text style={{ fontSize: 24, fontWeight: "bold", color: "#357AFF", marginTop: 4 }}>
                    {formatCurrency(selectedPlan.price)}
                  </Text>
                </View>

                {/* Step 1: Payment Instructions */}
                {paymentStep === 1 && (
                  <View>
                    <View
                      style={{
                        backgroundColor: "#FEF3C7",
                        padding: 16,
                        borderRadius: 12,
                        marginBottom: 16,
                        borderLeftWidth: 4,
                        borderLeftColor: "#F59E0B",
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#92400E", marginBottom: 8 }}>
                        ⚠️ Important: Complete Payment First
                      </Text>
                      <Text style={{ fontSize: 13, color: "#78350F", lineHeight: 18 }}>
                        This will NOT trigger an automatic M-Pesa prompt. You must manually send payment first.
                      </Text>
                    </View>

                    <View style={{ marginBottom: 20 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 12 }}>
                        Step 1: Send Payment
                      </Text>
                      <View
                        style={{
                          backgroundColor: "#F9FAFB",
                          padding: 16,
                          borderRadius: 8,
                          borderWidth: 2,
                          borderColor: "#10B981",
                        }}
                      >
                        <Text style={{ fontSize: 14, color: "#374151", marginBottom: 8 }}>
                          1. Go to M-Pesa on your phone
                        </Text>
                        <Text style={{ fontSize: 14, color: "#374151", marginBottom: 8 }}>
                          2. Select Lipa na M-Pesa → Buy Goods and Services
                        </Text>
                        <Text style={{ fontSize: 14, color: "#374151", marginBottom: 8 }}>
                          3. Enter Till Number: <Text style={{ fontWeight: "bold", color: "#10B981" }}>6547212</Text>
                        </Text>
                        <Text style={{ fontSize: 14, color: "#374151", marginBottom: 8 }}>
                          4. Enter Amount: <Text style={{ fontWeight: "bold", color: "#10B981" }}>KES {selectedPlan.price}</Text>
                        </Text>
                        <Text style={{ fontSize: 14, color: "#374151" }}>
                          5. Enter your M-Pesa PIN and confirm
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => setPaymentStep(2)}
                      style={({ pressed }) => ({
                        backgroundColor: "#10B981",
                        borderRadius: 12,
                        paddingVertical: 16,
                        alignItems: "center",
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
                        I've Sent Payment →
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* Step 2: Confirm Details */}
                {paymentStep === 2 && (
                  <View>
                    <View
                      style={{
                        backgroundColor: "#DBEAFE",
                        padding: 16,
                        borderRadius: 12,
                        marginBottom: 16,
                        borderLeftWidth: 4,
                        borderLeftColor: "#3B82F6",
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#1E40AF", marginBottom: 4 }}>
                        ℹ️ Confirm Your Details
                      </Text>
                      <Text style={{ fontSize: 13, color: "#1E3A8A", lineHeight: 18 }}>
                        Please confirm your details below. Your account will be upgraded immediately after payment confirmation.
                      </Text>
                    </View>

                    {/* User Name Input */}
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6 }}>
                        Your Full Name *
                      </Text>
                      <TextInput
                        value={userName}
                        onChangeText={setUserName}
                        placeholder="Enter your full name as on M-Pesa"
                        style={{
                          backgroundColor: "#F9FAFB",
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          fontSize: 14,
                          color: "#1F2937",
                        }}
                        editable={!processing}
                      />
                    </View>

                    {/* User Email Display */}
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6 }}>
                        Your Email
                      </Text>
                      <View
                        style={{
                          backgroundColor: "#F3F4F6",
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                        }}
                      >
                        <Text style={{ fontSize: 14, color: "#6B7280" }}>
                          {user?.email || "Not available"}
                        </Text>
                      </View>
                    </View>

                    {/* Till Number Display */}
                    <View style={{ marginBottom: 20 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6 }}>
                        Till Number (Payment Sent To)
                      </Text>
                      <View
                        style={{
                          backgroundColor: "#F3F4F6",
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                        }}
                      >
                        <Text style={{ fontSize: 14, color: "#6B7280" }}>
                          6547212
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <Pressable
                        onPress={() => setPaymentStep(1)}
                        disabled={processing}
                        style={({ pressed }) => ({
                          flex: 1,
                          backgroundColor: "#F3F4F6",
                          borderRadius: 12,
                          paddingVertical: 16,
                          alignItems: "center",
                          opacity: pressed || processing ? 0.7 : 1,
                        })}
                      >
                        <Text style={{ fontSize: 16, fontWeight: "600", color: "#374151" }}>
                          ← Back
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={handleConfirmPayment}
                        disabled={processing}
                        style={({ pressed }) => ({
                          flex: 2,
                          backgroundColor: "#357AFF",
                          borderRadius: 12,
                          paddingVertical: 16,
                          alignItems: "center",
                          opacity: pressed || processing ? 0.7 : 1,
                        })}
                      >
                        {processing ? (
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <ActivityIndicator color="#fff" />
                            <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff", marginLeft: 8 }}>
                              Confirming...
                            </Text>
                          </View>
                        ) : (
                          <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
                            Confirm Payment
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
