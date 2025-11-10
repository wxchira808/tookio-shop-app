import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRequireAuth } from "@/utils/auth/useAuth";
import {
  Store,
  Package,
  BarChart3,
  TrendingUp,
  Settings,
  User,
  ShoppingCart,
  DollarSign,
  Bell,
} from "lucide-react-native";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { getShops, getItems, getSales } from "@/utils/frappeApi";
import { formatCurrency } from "@/utils/currency";

export default function Dashboard() {
  useRequireAuth();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState({
    shopsCount: 0,
    itemsCount: 0,
    totalRevenue: 0,
    salesCount: 0,
    lowStockCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [shopsRes, itemsRes, salesRes] = await Promise.all([
        getShops(),
        getItems(),
        getSales(),
      ]);

      const shops = shopsRes?.shops || [];
      const items = itemsRes?.items || [];
      const sales = salesRes?.sales || [];

      const totalRevenue = sales.reduce(
        (sum, sale) => sum + parseFloat(sale.total_amount || 0),
        0
      );

      const lowStockCount = items.filter(
        (item) => item.current_stock <= (item.low_stock_threshold || 5)
      ).length;

      setStats({
        shopsCount: shops.length,
        itemsCount: items.length,
        totalRevenue,
        salesCount: sales.length,
        lowStockCount,
      });
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

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

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {/* Notification Bell */}
          <Pressable
            onPress={() => {
              // TODO: Connect to feedback DocType for notifications
              console.log("Notifications pressed");
            }}
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
            <Bell size={20} color="#6B7280" />
          </Pressable>

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
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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

        {/* Stats Section */}
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

          {loading && stats.shopsCount === 0 ? (
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 40,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <ActivityIndicator size="large" color="#357AFF" />
              <Text
                style={{
                  fontSize: 16,
                  color: "#6B7280",
                  marginTop: 12,
                }}
              >
                Loading statistics...
              </Text>
            </View>
          ) : stats.shopsCount === 0 ? (
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
          ) : (
            <View style={{ gap: 12 }}>
              {/* Revenue and Sales Row */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    padding: 16,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "#10B98115",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 8,
                      }}
                    >
                      <DollarSign size={18} color="#10B981" />
                    </View>
                    <Text style={{ fontSize: 13, color: "#6B7280" }}>
                      Revenue
                    </Text>
                  </View>
                  <Text
                    style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}
                  >
                    {formatCurrency(stats.totalRevenue, false)}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    padding: 16,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "#EF444415",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 8,
                      }}
                    >
                      <TrendingUp size={18} color="#EF4444" />
                    </View>
                    <Text style={{ fontSize: 13, color: "#6B7280" }}>
                      Sales
                    </Text>
                  </View>
                  <Text
                    style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}
                  >
                    {stats.salesCount}
                  </Text>
                </View>
              </View>

              {/* Shops and Items Row */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    padding: 16,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "#357AFF15",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 8,
                      }}
                    >
                      <Store size={18} color="#357AFF" />
                    </View>
                    <Text style={{ fontSize: 13, color: "#6B7280" }}>
                      Shops
                    </Text>
                  </View>
                  <Text
                    style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}
                  >
                    {stats.shopsCount}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    padding: 16,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "#10B98115",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 8,
                      }}
                    >
                      <Package size={18} color="#10B981" />
                    </View>
                    <Text style={{ fontSize: 13, color: "#6B7280" }}>
                      Items
                    </Text>
                  </View>
                  <Text
                    style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}
                  >
                    {stats.itemsCount}
                  </Text>
                </View>
              </View>

              {/* Low Stock Alert */}
              {stats.lowStockCount > 0 && (
                <View
                  style={{
                    backgroundColor: "#FEF2F2",
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "#EF4444",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <BarChart3 size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#991B1B",
                      }}
                    >
                      {stats.lowStockCount} item{stats.lowStockCount > 1 ? "s" : ""} low on stock
                    </Text>
                    <Text style={{ fontSize: 14, color: "#DC2626", marginTop: 2 }}>
                      Review and restock soon
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
