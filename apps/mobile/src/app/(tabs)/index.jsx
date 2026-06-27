import { View, Text, Pressable, ActivityIndicator, RefreshControl, useWindowDimensions, Image, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRequireAuth, useAuth, handleApiError } from "@/utils/auth/useAuth";
import { AdBanner } from "@/components/AdBanner";
import {
  Store,
  Package,
  BarChart3,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Bell,
  ArrowUpRight,
  User,
} from "lucide-react-native";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { getShops, getItems, getSales, getNotifications, markNotificationAsRead, checkSession } from "@/utils/frappeApi";
import { formatCurrency } from "@/utils/currency";
import {
  Badge,
  BottomSheet,
  Card,
  EmptyState,
  FilterChip,
  IconButton,
  ListRow,
  ModuleTile,
  Screen,
  Section,
  StatTile,
} from "@/components/frappe-ui";
import { colors, spacing, type } from "@/theme/frappeTheme";

export default function Dashboard() {
  useRequireAuth();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const launcherColumns = width >= 1100 ? 4 : width >= 760 ? 3 : 2;

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
      // Check session first
      await checkSession();

      setLoading(true);

      // Load data individually to handle session errors properly
      let shops = [];
      let items = [];
      let sales = [];
      let notifications = [];

      try {
        const shopsRes = await getShops();
        shops = (shopsRes?.shops || []).filter(shop => shop.enabled === 1);
      } catch (error) {
        if (handleApiError(error, signOut)) return; // Session expired, stop loading
        console.error("Error loading shops:", error);
      }

      try {
        const itemsRes = await getItems();
        items = itemsRes?.items || [];
      } catch (error) {
        if (handleApiError(error, signOut)) return; // Session expired, stop loading
        console.error("Error loading items:", error);
      }

      try {
        const salesRes = await getSales();
        sales = salesRes?.sales || [];
      } catch (error) {
        if (handleApiError(error, signOut)) return; // Session expired, stop loading
        console.error("Error loading sales:", error);
      }

      try {
        const notifsRes = await getNotifications();
        notifications = notifsRes?.notifications || [];
      } catch (error) {
        if (handleApiError(error, signOut)) return; // Session expired, stop loading
        console.error("Error loading notifications:", error);
      }

      setNotifications(notifications);

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

      const totalRevenue = sales
        .filter(sale => sale.status !== 'Cancelled') // Exclude cancelled sales
        .reduce(
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
      handleApiError(error, signOut);
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
      subtitle: "Store locations",
      icon: Store,
      onPress: () => router.push("/shops"),
      theme: "blue",
    },
    {
      title: "Inventory",
      subtitle: "Products and stock",
      icon: Package,
      onPress: () => router.push("/items"),
      theme: "gray",
    },
    {
      title: "Sales",
      subtitle: "Cash in and invoices",
      icon: TrendingUp,
      onPress: () => router.push("/sales"),
      theme: "green",
    },
    {
      title: "Expenses",
      subtitle: "Purchases and costs",
      icon: ShoppingCart,
      onPress: () => router.push("/purchases"),
      theme: "amber",
    },
    {
      title: "Stock",
      subtitle: "Adjust inventory",
      icon: BarChart3,
      onPress: () => router.push("/stock"),
      theme: "gray",
    },
    {
      title: "Profile",
      subtitle: "Account and plan",
      icon: User,
      onPress: () => router.push("/profile"),
      theme: "blue",
    },
  ];

  const filters = [
    { label: "All time", value: "all" },
    { label: "Today", value: "today" },
    { label: "7 days", value: "week" },
    { label: "30 days", value: "month" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceBase, paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
      <View
        style={{
          paddingLeft: 6, // Decreased padding further to shift logo closer to the left edge
          paddingRight: spacing.xl,
          paddingTop: 12,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.outlineGray1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, marginRight: spacing.md }}>
          <Image
            source={require("../../../assets/images/logo.png")}
            style={{ width: 130, height: 32, resizeMode: "contain" }}
          />
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
          <IconButton
            icon={Bell}
            size={44}
            theme="clear"
            onPress={() => {
              setShowNotificationsModal(true);
              const unreadNotifs = notifications.filter((n) => !n.read);
              unreadNotifs.forEach((notif) => markNotificationAsRead(notif.id));
              if (unreadNotifs.length > 0) {
                setNotifications(
                  notifications.map((n) =>
                    unreadNotifs.some((u) => u.id === n.id) ? { ...n, read: 1 } : n
                  )
                );
              }
            }}
          />
          <IconButton
            icon={User}
            size={44}
            theme="black"
            onPress={() => router.push("/profile")}
          />
        </View>
      </View>

      <Section label="Filter">
        <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
          {filters.map((filter) => (
            <FilterChip
              key={filter.value}
              label={filter.label}
              active={dateFilter === filter.value}
              onPress={() => setDateFilter(filter.value)}
            />
          ))}
        </View>
      </Section>

      <Section label="Performance">
        {loading && stats.shopsCount === 0 ? (
          <Card style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.inkGray6} />
            <Text style={[type.bodyMuted, { marginTop: spacing.md }]}>Loading overview</Text>
          </Card>
        ) : stats.shopsCount === 0 ? (
          <EmptyState
            title="No data yet"
            description="Create your first shop to start tracking stock, sales, and purchases."
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            <StatTile label="Revenue" value={formatCurrency(stats.totalRevenue, false)} />
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <StatTile label="Sales" value={stats.salesCount} compact />
              </View>
              <View style={{ flex: 1 }}>
                <StatTile label="Shops" value={stats.shopsCount} compact />
              </View>
              <View style={{ flex: 1 }}>
                <StatTile label="Items" value={stats.itemsCount} compact />
              </View>
            </View>
            {stats.lowStockCount > 0 ? (
              <ListRow
                title={`${stats.lowStockCount} item${stats.lowStockCount > 1 ? "s" : ""} need attention`}
                subtitle="Low stock"
                onPress={() => setShowLowStockModal(true)}
                badge={<Badge label="Warning" theme="amber" />}
              />
            ) : null}
          </View>
        )}
      </Section>

      {/* Analytics & Insights */}
      <Section label="Analytics & Insights">
        <View style={{ gap: spacing.md, flexDirection: "row", paddingHorizontal: spacing.xl }}>
          <Pressable
            onPress={() => router.push("/dashboard-view")}
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: colors.surfaceBase,
                borderWidth: 1,
                borderColor: colors.outlineGray1,
                borderRadius: 12,
                padding: spacing.md,
              },
              pressed && { backgroundColor: colors.surfaceHover },
            ]}
          >
            <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: "#EBF5FF", alignItems: "center", justifyContent: "center", marginBottom: spacing.sm }}>
              <BarChart3 size={20} color="#3B82F6" strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.inkGray8 }}>Business Dashboard</Text>
            <Text style={{ fontSize: 13, color: colors.inkGray5, marginTop: 4 }}>Charts and KPIs</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/reports-view")}
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: colors.surfaceBase,
                borderWidth: 1,
                borderColor: colors.outlineGray1,
                borderRadius: 12,
                padding: spacing.md,
              },
              pressed && { backgroundColor: colors.surfaceHover },
            ]}
          >
            <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: "#F3E8FF", alignItems: "center", justifyContent: "center", marginBottom: spacing.sm }}>
              <Package size={20} color="#A855F7" strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.inkGray8 }}>Interactive Reports</Text>
            <Text style={{ fontSize: 13, color: colors.inkGray5, marginTop: 4 }}>Detailed analysis</Text>
          </Pressable>
        </View>
      </Section>

      <BottomSheet visible={showLowStockModal} onClose={() => setShowLowStockModal(false)} title="Low stock">
        <View style={{ paddingBottom: spacing.lg }}>
          {lowStockItems.map((item) => (
            <ListRow
              key={item.id || item.item_name}
              title={item.item_name}
              subtitle={`${item.shop_name || item.shop} • ${item.current_stock || 0} in stock`}
              rightLabel={`Alert ${item.low_stock_threshold || 5}`}
              badge={
                <Badge
                  label={item.current_stock === 0 ? "Out" : "Low"}
                  theme={item.current_stock === 0 ? "red" : "amber"}
                />
              }
            />
          ))}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        title="Notifications"
      >
        <View style={{ paddingBottom: spacing.lg }}>
          {notifications.length === 0 ? (
            <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xl }}>
              <EmptyState title="No notifications" description="You are all caught up." />
            </View>
          ) : (
            notifications.map((notif) => (
              <ListRow
                key={notif.id}
                title={notif.message}
                subtitle={new Date(notif.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                onPress={() => {
                  if (!notif.read) {
                    markNotificationAsRead(notif.id);
                    setNotifications(notifications.map((n) => (n.id === notif.id ? { ...n, read: 1 } : n)));
                  }
                }}
                badge={<Badge label={notif.read ? "Read" : "New"} theme={notif.read ? "gray" : "blue"} />}
              />
            ))
          )}
        </View>
      </BottomSheet>

      </ScrollView>

      {/* Ad Banner for Free Users */}
      <AdBanner />
    </View>
  );
}
