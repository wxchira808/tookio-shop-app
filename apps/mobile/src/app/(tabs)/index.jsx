import { View, Text, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRequireAuth } from "@/utils/auth/useAuth";
import {
  Store,
  Package,
  BarChart3,
  TrendingUp,
  Settings,
  User, // Add User icon for profile
  ShoppingCart, // Add ShoppingCart for purchases
} from "lucide-react-native";
import { router } from "expo-router";

export default function Dashboard() {
  useRequireAuth();
  const insets = useSafeAreaInsets();

  const dashboardCards = [
    {
      title: "Manage Shops",
      subtitle: "Add, view and manage your shops",
      icon: Store,
      color: "#357AFF",
      onPress: () => router.push("/shops"),
    },
    {
      title: "Products",
      subtitle: "Manage your inventory items",
      icon: Package,
      color: "#10B981",
      onPress: () => router.push("/items"),
    },
    {
      title: "Purchases", // Add purchases card
      subtitle: "Record expenses and track purchases",
      icon: ShoppingCart,
      color: "#F59E0B",
      onPress: () => router.push("/purchases"),
    },
    {
      title: "Stock Management",
      subtitle: "Track stock levels and transactions",
      icon: BarChart3,
      color: "#8B5CF6", // Change color since orange is used for purchases
      onPress: () => router.push("/stock"),
    },
    {
      title: "Sales",
      subtitle: "Record and track your sales",
      icon: TrendingUp,
      color: "#EF4444",
      onPress: () => router.push("/sales"),
    },
  ];

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
          flexDirection: "row", // Add flexDirection for horizontal layout
          justifyContent: "space-between", // Space between title and profile button
          alignItems: "center", // Align items vertically centered
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 28, fontWeight: "bold", color: "#1F2937" }}>
            Tookio Shop
          </Text>
          <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 4 }}>
            Your inventory management hub
          </Text>
        </View>

        {/* Profile Button */}
        <Pressable
          onPress={() => router.push("/profile")}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#F3F4F6",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          })}
        >
          <User size={20} color="#6B7280" />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Dashboard Cards */}
        <View style={{ padding: 20 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#1F2937",
              marginBottom: 16,
            }}
          >
            Quick Actions
          </Text>

          <View style={{ gap: 12 }}>
            {dashboardCards.map((card, index) => {
              const IconComponent = card.icon;
              return (
                <Pressable
                  key={index}
                  onPress={card.onPress}
                  style={({ pressed }) => ({
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: card.color + "15",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 16,
                    }}
                  >
                    <IconComponent size={24} color={card.color} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#1F2937",
                      }}
                    >
                      {card.title}
                    </Text>
                    <Text
                      style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}
                    >
                      {card.subtitle}
                    </Text>
                  </View>

                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: card.color,
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Stats Section - Placeholder for now */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#1F2937",
              marginBottom: 16,
            }}
          >
            Quick Stats
          </Text>

          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 20,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 48, color: "#6B7280" }}>📊</Text>
            <Text
              style={{
                fontSize: 16,
                color: "#6B7280",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Set up your first shop to see detailed analytics and insights
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
