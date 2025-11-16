import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRequireAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import {
  ArrowLeft,
  Check,
  Crown,
  Store,
  Package,
  Zap,
  CreditCard,
  Smartphone,
} from "lucide-react-native";
import { router } from "expo-router";
import { useState } from "react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "USD",
    period: "forever",
    color: "#64748B",
    description: "Perfect for trying out Tookio Shop",
    features: [
      { text: "1 shop location", included: true },
      { text: "Up to 50 items", included: true },
      { text: "Basic sales tracking", included: true },
      { text: "Stock management", included: true },
      { text: "Limited reports", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: 4,
    currency: "USD",
    period: "month",
    color: "#F59E0B",
    description: "Great for small businesses",
    popular: true,
    features: [
      { text: "2 shop locations", included: true },
      { text: "Up to 200 items", included: true },
      { text: "Advanced sales tracking", included: true },
      { text: "Stock management", included: true },
      { text: "Basic reports", included: true },
      { text: "Email support", included: true },
    ],
  },
  {
    id: "business",
    name: "Business",
    price: 9,
    currency: "USD",
    period: "month",
    color: "#6366F1",
    description: "For growing businesses",
    features: [
      { text: "5 shop locations", included: true },
      { text: "Unlimited items", included: true },
      { text: "Advanced sales tracking", included: true },
      { text: "Stock management", included: true },
      { text: "Advanced reports & analytics", included: true },
      { text: "Priority support", included: true },
    ],
  },
];

export default function SubscriptionScreen() {
  useRequireAuth();
  const insets = useSafeAreaInsets();
  const { data: user } = useUser();
  const [selectedPlan, setSelectedPlan] = useState(null);

  const getCurrentPlan = () => {
    const tier = user?.subscription_tier?.toLowerCase() || "free";
    if (tier.includes("business")) return "business";
    if (tier.includes("starter")) return "starter";
    return "free";
  };

  const currentPlan = getCurrentPlan();

  const handleSelectPlan = (plan) => {
    if (plan.id === currentPlan) {
      Alert.alert("Current Plan", "You are already subscribed to this plan.");
      return;
    }

    if (plan.id === "free") {
      Alert.alert(
        "Downgrade to Free",
        "Are you sure you want to downgrade to the free plan? You'll lose access to premium features.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Downgrade",
            style: "destructive",
            onPress: () => {
              // TODO: Implement downgrade API call
              Alert.alert("Coming Soon", "Downgrade functionality will be available soon.");
            },
          },
        ]
      );
      return;
    }

    setSelectedPlan(plan);
    // Navigate to payment method selection
    router.push({
      pathname: "/payment",
      params: {
        planId: plan.id,
        planName: plan.name,
        price: plan.price,
        currency: plan.currency,
      },
    });
  };

  const formatPrice = (plan) => {
    if (plan.price === 0) return "Free";

    // Show both USD and KES equivalent (approximate: 1 USD = 130 KES)
    const kesPrice = Math.round(plan.price * 130);
    return `$${plan.price} / KSh ${kesPrice}`;
  };

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
          <ArrowLeft size={22} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#0F172A", letterSpacing: -0.5 }}>
            Subscription Plans
          </Text>
          <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
            Choose the right plan for your business
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Plan Info */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: "#F1F5F9",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: PLANS.find(p => p.id === currentPlan)?.color + "20",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Crown size={20} color={PLANS.find(p => p.id === currentPlan)?.color} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 2 }}>
                CURRENT PLAN
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}>
                {PLANS.find(p => p.id === currentPlan)?.name}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Methods Info */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            Accepted Payment Methods
          </Text>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: "#F1F5F9",
              flexDirection: "row",
              gap: 12,
            }}
          >
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "#EEF2FF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <CreditCard size={18} color="#6366F1" strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#0F172A" }}>
                Card (Global)
              </Text>
            </View>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "#ECFDF5",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Smartphone size={18} color="#10B981" strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#0F172A" }}>
                M-Pesa
              </Text>
            </View>
          </View>
        </View>

        {/* Plans */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 16,
            }}
          >
            Available Plans
          </Text>

          <View style={{ gap: 16 }}>
            {PLANS.map((plan) => {
              const isCurrentPlan = plan.id === currentPlan;
              const canUpgrade =
                (currentPlan === "free" && plan.id !== "free") ||
                (currentPlan === "starter" && plan.id === "business");

              return (
                <View
                  key={plan.id}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 20,
                    borderWidth: isCurrentPlan ? 2 : 1,
                    borderColor: isCurrentPlan ? plan.color : "#F1F5F9",
                    overflow: "hidden",
                  }}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <View
                      style={{
                        backgroundColor: plan.color,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: "#FFFFFF",
                          letterSpacing: 1,
                        }}
                      >
                        MOST POPULAR
                      </Text>
                    </View>
                  )}

                  <View style={{ padding: 20 }}>
                    {/* Plan Header */}
                    <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 16 }}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 24,
                            fontWeight: "800",
                            color: "#0F172A",
                            letterSpacing: -0.5,
                            marginBottom: 4,
                          }}
                        >
                          {plan.name}
                        </Text>
                        <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 12 }}>
                          {plan.description}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                          <Text
                            style={{
                              fontSize: 32,
                              fontWeight: "800",
                              color: plan.color,
                              letterSpacing: -1,
                            }}
                          >
                            {formatPrice(plan)}
                          </Text>
                          {plan.price > 0 && (
                            <Text style={{ fontSize: 14, color: "#64748B", marginLeft: 6 }}>
                              /{plan.period}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Features */}
                    <View style={{ gap: 10, marginBottom: 20 }}>
                      {plan.features.map((feature, index) => (
                        <View
                          key={index}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            opacity: feature.included ? 1 : 0.4,
                          }}
                        >
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              backgroundColor: feature.included ? plan.color + "20" : "#F1F5F9",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 10,
                            }}
                          >
                            <Check
                              size={14}
                              color={feature.included ? plan.color : "#94A3B8"}
                              strokeWidth={3}
                            />
                          </View>
                          <Text
                            style={{
                              fontSize: 14,
                              color: feature.included ? "#0F172A" : "#94A3B8",
                              fontWeight: feature.included ? "500" : "400",
                            }}
                          >
                            {feature.text}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Action Button */}
                    <Pressable
                      onPress={() => handleSelectPlan(plan)}
                      disabled={isCurrentPlan}
                      style={({ pressed }) => ({
                        backgroundColor: isCurrentPlan
                          ? "#F1F5F9"
                          : canUpgrade || plan.id === "free"
                          ? plan.color
                          : "#F1F5F9",
                        borderRadius: 12,
                        paddingVertical: 14,
                        alignItems: "center",
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "700",
                          color: isCurrentPlan
                            ? "#64748B"
                            : canUpgrade || plan.id === "free"
                            ? "#FFFFFF"
                            : "#94A3B8",
                          letterSpacing: -0.3,
                        }}
                      >
                        {isCurrentPlan
                          ? "Current Plan"
                          : canUpgrade
                          ? "Upgrade Now"
                          : plan.id === "free"
                          ? "Downgrade"
                          : "Not Available"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Footer Info */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <View
            style={{
              backgroundColor: "#FFFBEB",
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: "#FDE68A",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <Zap size={18} color="#F59E0B" strokeWidth={2} style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#92400E", marginBottom: 4 }}>
                  Flexible Payments
                </Text>
                <Text style={{ fontSize: 13, color: "#B45309", lineHeight: 18 }}>
                  Pay with your card globally or use M-Pesa for convenient mobile payments. All subscriptions renew monthly.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
