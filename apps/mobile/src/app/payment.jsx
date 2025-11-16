import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRequireAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Shield,
  Lock,
  CheckCircle,
} from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

export default function PaymentScreen() {
  useRequireAuth();
  const insets = useSafeAreaInsets();
  const { data: user } = useUser();
  const params = useLocalSearchParams();
  const [processing, setProcessing] = useState(false);

  const { planId, planName, price, currency } = params;

  const kesPrice = Math.round(parseFloat(price) * 130);

  const handleCardPayment = () => {
    Alert.alert(
      "Card Payment",
      "Stripe integration coming soon! This will support cards from anywhere in the world.",
      [{ text: "OK" }]
    );
    // TODO: Implement Stripe payment
  };

  const handleMpesaPayment = async () => {
    setProcessing(true);

    try {
      // TODO: Implement M-Pesa STK Push
      Alert.alert(
        "M-Pesa Payment",
        `Pay KSh ${kesPrice} to Till Number: 6547212 (Tookio Solutions)\n\nYou'll receive an STK push prompt on your phone.`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setProcessing(false),
          },
          {
            text: "I've Paid",
            onPress: async () => {
              // TODO: Verify payment and activate subscription
              Alert.alert(
                "Payment Confirmation",
                "We're verifying your payment. This may take a few moments...",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      setProcessing(false);
                      router.back();
                    },
                  },
                ]
              );
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to initiate M-Pesa payment. Please try again.");
      setProcessing(false);
    }
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
            Payment Method
          </Text>
          <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
            Choose how you'd like to pay
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary */}
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
            Order Summary
          </Text>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: "#F1F5F9",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontSize: 15, color: "#64748B" }}>Plan</Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>{planName}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontSize: 15, color: "#64748B" }}>Billing Period</Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>Monthly</Text>
            </View>
            <View
              style={{
                height: 1,
                backgroundColor: "#F1F5F9",
                marginVertical: 12,
              }}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}>Total</Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 }}>
                  ${price}
                </Text>
                <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                  (KSh {kesPrice})
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
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
            Select Payment Method
          </Text>

          {/* Card Payment */}
          <Pressable
            onPress={handleCardPayment}
            disabled={processing}
            style={({ pressed }) => ({
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: "#F1F5F9",
              marginBottom: 12,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: "#EEF2FF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                }}
              >
                <CreditCard size={24} color="#6366F1" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 4 }}>
                  Credit / Debit Card
                </Text>
                <Text style={{ fontSize: 13, color: "#64748B" }}>
                  Visa, Mastercard, Amex
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#6366F1",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>
                  GLOBAL
                </Text>
              </View>
            </View>
          </Pressable>

          {/* M-Pesa Payment */}
          <Pressable
            onPress={handleMpesaPayment}
            disabled={processing}
            style={({ pressed }) => ({
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: "#F1F5F9",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: "#ECFDF5",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                }}
              >
                <Smartphone size={24} color="#10B981" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 4 }}>
                  M-Pesa
                </Text>
                <Text style={{ fontSize: 13, color: "#64748B" }}>
                  Till: 6547212 (Tookio Solutions)
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#10B981",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>
                  KENYA
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Security Info */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <View
            style={{
              backgroundColor: "#F8FAFC",
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Shield size={20} color="#6366F1" strokeWidth={2} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A", marginLeft: 10 }}>
                Secure Payment
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <CheckCircle size={16} color="#10B981" strokeWidth={2} />
                <Text style={{ fontSize: 13, color: "#64748B", marginLeft: 8 }}>
                  256-bit SSL encryption
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <CheckCircle size={16} color="#10B981" strokeWidth={2} />
                <Text style={{ fontSize: 13, color: "#64748B", marginLeft: 8 }}>
                  PCI DSS compliant
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <CheckCircle size={16} color="#10B981" strokeWidth={2} />
                <Text style={{ fontSize: 13, color: "#64748B", marginLeft: 8 }}>
                  Your data is never stored
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Terms */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", lineHeight: 18 }}>
            By completing this purchase, you agree to our Terms of Service and Privacy Policy. Subscriptions renew monthly until cancelled.
          </Text>
        </View>
      </ScrollView>

      {/* Processing Overlay */}
      {processing && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 32,
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#0F172A", marginTop: 16 }}>
              Processing Payment...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
