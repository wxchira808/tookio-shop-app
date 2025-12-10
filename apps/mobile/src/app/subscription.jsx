import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Heart, Check } from "lucide-react-native";
import { router } from "expo-router";

export default function FreePlanScreen() {
  const insets = useSafeAreaInsets();

  const handleSupport = () => {
    router.push("/payment");
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
            Your Plan
          </Text>
          <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
            Everything included, forever free
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Plan Badge */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 24,
              borderWidth: 2,
              borderColor: "#10B981",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#10B981", marginBottom: 8 }}>
              ✓ CURRENT PLAN
            </Text>
            <Text style={{ fontSize: 32, fontWeight: "800", color: "#0F172A", marginBottom: 4 }}>
              Free
            </Text>
            <Text style={{ fontSize: 14, color: "#64748B", textAlign: "center" }}>
              Forever, no hidden fees or upgrades
            </Text>
          </View>
        </View>

        {/* Included Features */}
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
            Everything Included
          </Text>

          {[
            "Unlimited shop locations",
            "Unlimited products and inventory",
            "Complete sales tracking & analytics",
            "Customer management system",
            "Advanced reporting & export",
            "Mobile and web access",
            "Real-time inventory sync",
            "Multi-currency support",
            "Detailed transaction history",
            "Cloud backup and sync",
          ].map((feature, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: "#F1F5F9",
              }}
            >
              <Check size={20} color="#10B981" strokeWidth={2.5} />
              <Text style={{ fontSize: 15, color: "#0F172A", marginLeft: 12, fontWeight: "500" }}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {/* Support Section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <View
            style={{
              backgroundColor: "#FEF2F2",
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: "#FECACA",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#DC2626", marginBottom: 8 }}>
              ❤️ Support Tookio Shop
            </Text>
            <Text style={{ fontSize: 14, color: "#64748B", marginBottom: 16, lineHeight: 20 }}>
              Love Tookio Shop? We're committed to keeping this app completely free, but we still need resources to maintain and improve it.
            </Text>
            <Pressable
              onPress={handleSupport}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#DC2626" : "#EF4444",
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>
                Support Our Development
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Info */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <Text style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", lineHeight: 18 }}>
            Tookio Shop is developed by a passionate team committed to helping small businesses in Africa. Your support helps us keep the app free for everyone.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/*
================================================================================
ARCHIVED SUBSCRIPTION PLANS - Keeping for future reference if needed
================================================================================

Old subscription tiers before conversion to free model:
- Free: $0/month (1 shop, 50 items, basic tracking)
- Starter: $4/month (2 shops, 200 items, advanced tracking)
- Business: $9/month (5 shops, unlimited items, full features)

If you need to implement paid subscriptions in the future, reference this code.
All payment processing code has been archived in payment.jsx

To restore, reverse the free model changes and uncomment the archived code.

================================================================================
*/
