import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Modal } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRequireAuth } from "@/utils/auth/useAuth";
import {
  Store,
  Package,
  BarChart3,
  TrendingUp,
  User,
  ShoppingCart,
  DollarSign,
  X,
  AlertTriangle,
  ChevronRight,
  Activity,
  Bell,
} from "lucide-react-native";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { getShops, getItems, getSales, getNotifications, markNotificationAsRead } from "@/utils/frappeApi";
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
  const [dateFilter, setDateFilter] = useState("all");
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadStats();
  }, [dateFilter]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [shopsRes, itemsRes, salesRes, notifsRes] = await Promise.all([
        getShops(),
        getItems(),
        getSales(),
        getNotifications(),
      ]);

      setNotifications(notifsRes?.notifications || []);

      const shops = shopsRes?.shops || [];
      const items = itemsRes?.items || [];
      let sales = salesRes?.sales || [];

      // Filter sales by date
      if (dateFilter !== "all") {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        sales = sales.filter((sale) => {
          const saleDate = new Date(sale.sale_date || sale.created_at);

          if (dateFilter === "today") {
            const saleDateOnly = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
            return saleDateOnly.getTime() === today.getTime();
          } else if (dateFilter === "week") {
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            return saleDate >= weekAgo;
          } else if (dateFilter === "month") {
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            return saleDate >= monthAgo;
          }

          return true;
        });
      }

      const totalRevenue = sales.reduce(
        (sum, sale) => sum + parseFloat(sale.total_amount || 0),
        0
      );

      const lowStock = items.filter(
        (item) => item.current_stock <= (item.low_stock_threshold || 5)
      );

      setLowStockItems(lowStock);
      setStats({
        shopsCount: shops.length,
        itemsCount: items.length,
        totalRevenue,
        salesCount: sales.length,
        lowStockCount: lowStock.length,
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
      title: "Shops",
      subtitle: "Manage locations",
      icon: Store,
      color: "#6366F1",
      onPress: () => router.push("/shops"),
    },
    {
      title: "Products",
      subtitle: "Inventory items",
      icon: Package,
      color: "#10B981",
      onPress: () => router.push("/items"),
    },
    {
      title: "Purchases",
      subtitle: "Track expenses",
      icon: ShoppingCart,
      color: "#F59E0B",
      onPress: () => router.push("/purchases"),
    },
    {
      title: "Stock",
      subtitle: "Stock transactions",
      icon: BarChart3,
      color: "#8B5CF6",
      onPress: () => router.push("/stock"),
    },
    {
      title: "Sales",
      subtitle: "Revenue tracking",
      icon: TrendingUp,
      color: "#EF4444",
      onPress: () => router.push("/sales"),
    },
  ];

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
          borderBottomWidth: 1,
          borderBottomColor: "#F1F5F9",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 }}>
              Tookio Shop
            </Text>
            <Text style={{ fontSize: 14, color: "#64748B", marginTop: 2 }}>
              Dashboard Overview
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* Notifications Bell */}
            <Pressable
              onPress={() => setShowNotificationsModal(true)}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: pressed ? "#F1F5F9" : "#F8FAFC",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#E2E8F0",
              })}
            >
              <Bell size={20} color="#0F172A" strokeWidth={2} />
              {notifications.filter(n => !n.read).length > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    backgroundColor: "#EF4444",
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFFFFF" }}>
                    {notifications.filter(n => !n.read).length}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Profile */}
            <Pressable
              onPress={() => router.push("/profile")}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: pressed ? "#F1F5F9" : "#F8FAFC",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#E2E8F0",
              })}
            >
              <User size={20} color="#0F172A" strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "#64748B",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Performance
            </Text>
          </View>

          {/* Date Filter */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { label: "All Time", value: "all" },
              { label: "Today", value: "today" },
              { label: "7 Days", value: "week" },
              { label: "30 Days", value: "month" },
            ].map((filter) => (
              <Pressable
                key={filter.value}
                onPress={() => setDateFilter(filter.value)}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: dateFilter === filter.value ? "#0F172A" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: dateFilter === filter.value ? "#0F172A" : "#E2E8F0",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: dateFilter === filter.value ? "#FFFFFF" : "#64748B",
                  }}
                >
                  {filter.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {loading && stats.shopsCount === 0 ? (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 48,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#F1F5F9",
              }}
            >
              <ActivityIndicator size="large" color="#6366F1" />
              <Text
                style={{
                  fontSize: 14,
                  color: "#64748B",
                  marginTop: 16,
                }}
              >
                Loading analytics...
              </Text>
            </View>
          ) : stats.shopsCount === 0 ? (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 32,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#F1F5F9",
              }}
            >
              <Activity size={48} color="#CBD5E1" strokeWidth={1.5} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#0F172A",
                  textAlign: "center",
                  marginTop: 16,
                }}
              >
                No Data Yet
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#64748B",
                  textAlign: "center",
                  marginTop: 8,
                  lineHeight: 20,
                }}
              >
                Create your first shop to start tracking analytics and performance metrics
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {/* Revenue Card - Full Width */}
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: "#F1F5F9",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: "#ECFDF5",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <DollarSign size={20} color="#10B981" strokeWidth={2.5} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Total Revenue
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 32, fontWeight: "800", color: "#0F172A", letterSpacing: -1 }}
                >
                  {formatCurrency(stats.totalRevenue, false)}
                </Text>
              </View>

              {/* Stats Grid */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: "#F1F5F9",
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: "#FEF2F2",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <TrendingUp size={18} color="#EF4444" strokeWidth={2} />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B", marginBottom: 4 }}>
                    SALES
                  </Text>
                  <Text
                    style={{ fontSize: 24, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 }}
                  >
                    {stats.salesCount}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: "#F1F5F9",
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: "#EEF2FF",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Store size={18} color="#6366F1" strokeWidth={2} />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B", marginBottom: 4 }}>
                    SHOPS
                  </Text>
                  <Text
                    style={{ fontSize: 24, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 }}
                  >
                    {stats.shopsCount}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: "#F1F5F9",
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: "#ECFDF5",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Package size={18} color="#10B981" strokeWidth={2} />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B", marginBottom: 4 }}>
                    ITEMS
                  </Text>
                  <Text
                    style={{ fontSize: 24, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 }}
                  >
                    {stats.itemsCount}
                  </Text>
                </View>
              </View>

              {/* Low Stock Alert */}
              {stats.lowStockCount > 0 && (
                <Pressable
                  onPress={() => setShowLowStockModal(true)}
                  style={({ pressed }) => ({
                    backgroundColor: "#FFFBEB",
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#FDE68A",
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: "#F59E0B",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <AlertTriangle size={20} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: "#92400E",
                        marginBottom: 2,
                      }}
                    >
                      {stats.lowStockCount} Low Stock Alert{stats.lowStockCount > 1 ? "s" : ""}
                    </Text>
                    <Text style={{ fontSize: 13, color: "#B45309" }}>
                      Items need restocking
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#D97706" />
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 20, paddingTop: 32 }}>
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
            Quick Actions
          </Text>

          <View style={{ gap: 10 }}>
            {dashboardCards.map((card, index) => {
              const IconComponent = card.icon;
              return (
                <Pressable
                  key={index}
                  onPress={card.onPress}
                  style={({ pressed }) => ({
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#F1F5F9",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: card.color + "15",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                    }}
                  >
                    <IconComponent size={22} color={card.color} strokeWidth={2} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: "#0F172A",
                        marginBottom: 2,
                      }}
                    >
                      {card.title}
                    </Text>
                    <Text
                      style={{ fontSize: 13, color: "#64748B" }}
                    >
                      {card.subtitle}
                    </Text>
                  </View>

                  <ChevronRight size={20} color="#CBD5E1" />
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Low Stock Items Modal */}
      <Modal
        visible={showLowStockModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLowStockModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%", paddingBottom: insets.bottom }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: "#FEF3C7",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <AlertTriangle size={20} color="#F59E0B" strokeWidth={2.5} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 }}>
                  Low Stock Items
                </Text>
              </View>
              <Pressable
                onPress={() => setShowLowStockModal(false)}
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: pressed ? "#F1F5F9" : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <X size={20} color="#64748B" strokeWidth={2} />
              </Pressable>
            </View>

            {/* Items List */}
            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={true}>
              <View style={{ padding: 20, gap: 12 }}>
                {lowStockItems.map((item, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: "#FAFAFA",
                      borderRadius: 16,
                      padding: 16,
                      borderLeftWidth: 4,
                      borderLeftColor: item.current_stock === 0 ? "#EF4444" : "#F59E0B",
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A", flex: 1, letterSpacing: -0.2 }}>
                        {item.item_name}
                      </Text>
                      <View style={{
                        backgroundColor: item.current_stock === 0 ? "#FEE2E2" : "#FEF3C7",
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 8,
                        marginLeft: 8,
                      }}>
                        <Text style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: item.current_stock === 0 ? "#991B1B" : "#92400E",
                          letterSpacing: 0.5,
                        }}>
                          {item.current_stock === 0 ? "OUT" : "LOW"}
                        </Text>
                      </View>
                    </View>

                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 13, color: "#64748B" }}>Shop</Text>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#0F172A" }}>
                          {item.shop_name || item.shop}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 13, color: "#64748B" }}>Current Stock</Text>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: item.current_stock === 0 ? "#EF4444" : "#F59E0B" }}>
                          {item.current_stock || 0} units
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 13, color: "#64748B" }}>Alert Threshold</Text>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#0F172A" }}>
                          {item.low_stock_threshold || 5} units
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={showNotificationsModal} transparent animationType="slide" onRequestClose={() => setShowNotificationsModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%", paddingBottom: insets.bottom }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: "#EEF2FF",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Bell size={20} color="#6366F1" strokeWidth={2.5} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 }}>
                  Notifications
                </Text>
              </View>
              <Pressable
                onPress={() => setShowNotificationsModal(false)}
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: pressed ? "#F1F5F9" : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <X size={20} color="#64748B" strokeWidth={2} />
              </Pressable>
            </View>

            {/* Notifications List */}
            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={true}>
              <View style={{ padding: 20 }}>
                {notifications.length === 0 ? (
                  <View style={{ paddingVertical: 48, alignItems: "center" }}>
                    <Bell size={48} color="#CBD5E1" strokeWidth={1.5} />
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#0F172A", marginTop: 16 }}>
                      No Notifications
                    </Text>
                    <Text style={{ fontSize: 14, color: "#64748B", textAlign: "center", marginTop: 8 }}>
                      You're all caught up!
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {notifications.map((notif) => (
                      <Pressable
                        key={notif.id}
                        onPress={() => {
                          if (!notif.read) {
                            markNotificationAsRead(notif.id);
                            setNotifications(notifications.map(n =>
                              n.id === notif.id ? { ...n, read: 1 } : n
                            ));
                          }
                        }}
                        style={{
                          backgroundColor: notif.read ? "#FAFAFA" : "#EEF2FF",
                          borderRadius: 16,
                          padding: 16,
                          borderLeftWidth: 4,
                          borderLeftColor: notif.read ? "#E2E8F0" : "#6366F1",
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                          <Text style={{ fontSize: 12, color: "#64748B" }}>
                            {new Date(notif.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Text>
                          {!notif.read && (
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: "#6366F1",
                              }}
                            />
                          )}
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: notif.read ? "500" : "700", color: "#0F172A", lineHeight: 22 }}>
                          {notif.message}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
