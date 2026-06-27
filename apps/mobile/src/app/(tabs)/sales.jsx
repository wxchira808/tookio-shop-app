import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRequireAuth, useAuth, handleApiError } from "@/utils/auth/useAuth";
import { AdBanner } from "@/components/AdBanner";
import { AppButton, FormField, FormSheet } from "@/components/frappe-ui";
import {
  TrendingUp,
  Plus,
  DollarSign,
  ShoppingCart,
  X,
  Minus,
  Check,
} from "lucide-react-native";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { getSales, getSaleById, createSale, cancelSale, getShops, getItems, checkSession } from "@/utils/frappeApi";
import { formatCurrency } from "@/utils/currency";

export default function Sales() {
  useRequireAuth();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [sales, setSales] = useState([]);
  const [shops, setShops] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [notes, setNotes] = useState("");
  const [saleItems, setSaleItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month
  const [selectedShop, setSelectedShop] = useState(""); // Shop filter

  // New customer fields
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [deliveryLocation, setDeliveryLocation] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Check session first
      await checkSession();

      setLoading(true);
      const [salesRes, shopsRes, itemsRes] = await Promise.all([
        getSales(),
        getShops(),
        getItems(),
      ]);

      if (salesRes && salesRes.sales) {
        setSales(salesRes.sales);
      }

      if (shopsRes && shopsRes.shops) {
        setShops(shopsRes.shops.filter(shop => shop.enabled === 1));
      }

      if (itemsRes && itemsRes.items) {
        setItems(itemsRes.items);
      }
    } catch (error) {
      console.error("Error loading sales:", error);
      if (!handleApiError(error, signOut)) {
        Alert.alert("Error", "Failed to load sales data");
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

  const toggleItemSelection = (item) => {
    const existingIndex = saleItems.findIndex((si) => si.item_id === item.id);

    if (existingIndex >= 0) {
      // Item already selected, remove it
      setSaleItems(saleItems.filter((_, i) => i !== existingIndex));
    } else {
      // Add new item with default quantity and item's unit price
      setSaleItems([
        ...saleItems,
        {
          item_id: item.id,
          item_name: item.item_name,
          quantity: 1,
          unit_price: item.unit_price,
          current_stock: item.current_stock,
        },
      ]);
    }
  };

  const updateItemQuantity = (itemId, newQuantity) => {
    setSaleItems(
      saleItems.map((si) =>
        si.item_id === itemId ? { ...si, quantity: parseInt(newQuantity) || 1 } : si
      )
    );
  };

  const updateItemPrice = (itemId, newPrice) => {
    setSaleItems(
      saleItems.map((si) =>
        si.item_id === itemId ? { ...si, unit_price: parseFloat(newPrice) || 0 } : si
      )
    );
  };

  const removeItem = (itemId) => {
    setSaleItems(saleItems.filter((si) => si.item_id !== itemId));
  };

  const calculateTotal = () => {
    return saleItems.reduce(
      (sum, item) =>
        sum + parseFloat(item.unit_price || 0) * parseInt(item.quantity || 0),
      0,
    );
  };

  const handleNewSale = () => {
    setNotes("");
    setSaleItems([]);
    setCustomerName("");
    setCustomerMobile("");
    setPaymentMethod("Cash");
    setDeliveryLocation("");
    setItemSearchQuery("");
    setShowAddModal(true);
  };

  const handleSalePress = async (sale) => {
    try {
      // Fetch full sale details with child tables (items)
      const fullSale = await getSaleById(sale.id);
      // Include shop_name from list data
      fullSale.shop_name = sale.shop_name;
      fullSale.status = sale.status; // Include status
      setSelectedSale(fullSale);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching sale details:', error);
      if (!handleApiError(error, signOut)) {
        Alert.alert('Error', 'Failed to load sale details. Please try again.');
      }
    }
  };

  const handleCancelSale = async () => {
    if (!selectedSale) return;

    Alert.alert(
      "Cancel Sale",
      `Are you sure you want to cancel this sale? This action cannot be undone.`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelSale(selectedSale.id);
              Alert.alert("Success", "Sale cancelled successfully");
              setShowDetailsModal(false);
              setSelectedSale(null);
              await loadData(); // Reload sales list
            } catch (error) {
              console.error("Error cancelling sale:", error);
              if (!handleApiError(error, signOut)) {
                Alert.alert("Error", "Failed to cancel sale");
              }
            }
          },
        },
      ]
    );
  };

  const handleAddSale = async () => {
    if (!selectedShopId) {
      Alert.alert("Error", "Please select a shop");
      return;
    }

    if (saleItems.length === 0) {
      Alert.alert("Error", "Please select at least one item");
      return;
    }

    if (!customerName.trim()) {
      Alert.alert("Error", "Please enter customer name");
      return;
    }

    if (!customerMobile.trim()) {
      Alert.alert("Error", "Please enter customer mobile number");
      return;
    }

    Alert.alert(
      "Confirm Sale",
      "Are you sure you want to record this sale?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setSubmitting(true);
              const result = await createSale({
                shop_id: selectedShopId,  // Pass as string (shop name)
                items: saleItems.map((item) => ({
                  item_id: item.item_id,  // Pass as string (item name)
                  quantity: parseInt(item.quantity),
                  unit_price: parseFloat(item.unit_price),
                })),
                customer_name: customerName.trim(),
                customer_mobile_number: customerMobile.trim(),
                payment_method: paymentMethod,
                delivery_location: deliveryLocation.trim() || null,
                notes: notes.trim() || null,
                sale_date: new Date().toISOString(),
              });

              if (result && result.sale) {
                Alert.alert(
                  "Success",
                  "Sale recorded successfully! Stock levels have been updated."
                );
                setShowAddModal(false);
                setSelectedShopId("");
                setNotes("");
                setSaleItems([]);
                setCustomerName("");
                setCustomerMobile("");
                setPaymentMethod("Cash");
                setDeliveryLocation("");
                loadData();
              }
            } catch (error) {
              console.error("Error adding sale:", error);
              if (!handleApiError(error, signOut)) {
                Alert.alert("Error", error.message || "Failed to record sale");
              }
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  // Filter sales by search query, date, and shop
  const filteredSales = sales.filter((sale) => {
    // Shop filtering
    if (selectedShop && (sale.shop_id || sale.shop) !== selectedShop) return false;

    // Date filtering
    if (dateFilter !== "all") {
      const saleDate = new Date(sale.sale_date || sale.created_at);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (dateFilter === "today") {
        const saleDateOnly = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
        if (saleDateOnly.getTime() !== today.getTime()) return false;
      } else if (dateFilter === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        if (saleDate < weekAgo) return false;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        if (saleDate < monthAgo) return false;
      }
    }

    // Search query filtering
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      (sale.customer_name && sale.customer_name.toLowerCase().includes(query)) ||
      (sale.notes && sale.notes.toLowerCase().includes(query)) ||
      (sale.id && sale.id.toString().includes(query))
    );
  });

  // Calculate totals - exclude cancelled sales
  const nonCancelledSales = filteredSales.filter(sale => sale.status !== 'Cancelled');
  const totalRevenue = nonCancelledSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0);

  if (loading && sales.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F7F7F7",
          paddingTop: insets.top,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#525252" />
        <Text style={{ fontSize: 15, color: "#737373", marginTop: 12 }}>
          Loading sales...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: "#F7F7F7", paddingTop: insets.top }}
    >
        <StatusBar style="dark" />

        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 16,
            backgroundColor: "#F7F7F7",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#171717" }}>
              Sales
            </Text>
            <Text style={{ fontSize: 14, color: "#737373", marginTop: 4 }}>
              Revenue and transaction history
            </Text>
          </View>

          <Pressable
            onPress={handleNewSale}
            style={({ pressed }) => ({
              backgroundColor: "#171717",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Plus size={16} color="#fff" />
            <Text style={{ color: "#fff", marginLeft: 4, fontWeight: "600" }}>
              New Sale
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Search Bar - Inside ScrollView */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
            <TextInput
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 15,
                color: "#171717",
                borderWidth: 1,
                borderColor: "#E5E5E5",
              }}
              placeholder="Search sales by customer name, ID, or notes..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#A3A3A3"
              returnKeyType="search"
            />
          </View>

          {/* Stats Cards */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#fff",
                  borderRadius: 10,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#E5E5E5",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <DollarSign size={18} color="#525252" />
                  <Text style={{ fontSize: 13, color: "#737373", marginLeft: 8 }}>
                    Revenue
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 20, fontWeight: "700", color: "#171717" }}
                >
                  {formatCurrency(totalRevenue, false)}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: "#fff",
                  borderRadius: 10,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#E5E5E5",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <ShoppingCart size={18} color="#525252" />
                  <Text style={{ fontSize: 13, color: "#737373", marginLeft: 8 }}>
                    Sales
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 20, fontWeight: "700", color: "#171717" }}
                >
                  {nonCancelledSales.length}
                </Text>
              </View>
            </View>
          </View>

        {/* Sales List */}
        {sales.length > 0 ? (
          <View style={{ paddingHorizontal: 20 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                fontSize: 17,
                fontWeight: "600",
                color: "#171717",
              }}
            >
                Recent sales
              </Text>
            </View>

            {/* Date Filter */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <Pressable
                onPress={() => setDateFilter("all")}
                style={({ pressed }) => ({
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: dateFilter === "all" ? "#171717" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: dateFilter === "all" ? "#171717" : "#E5E7EB",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: dateFilter === "all" ? "#fff" : "#737373",
                  }}
                >
                  All Time
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setDateFilter("today")}
                style={({ pressed }) => ({
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: dateFilter === "today" ? "#171717" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: dateFilter === "today" ? "#171717" : "#E5E7EB",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: dateFilter === "today" ? "#fff" : "#737373",
                  }}
                >
                  Today
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setDateFilter("week")}
                style={({ pressed }) => ({
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: dateFilter === "week" ? "#171717" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: dateFilter === "week" ? "#171717" : "#E5E7EB",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: dateFilter === "week" ? "#fff" : "#737373",
                  }}
                >
                  Last 7 Days
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setDateFilter("month")}
                style={({ pressed }) => ({
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: dateFilter === "month" ? "#171717" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: dateFilter === "month" ? "#171717" : "#E5E7EB",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: dateFilter === "month" ? "#fff" : "#737373",
                  }}
                >
                  Last 30 Days
                </Text>
              </Pressable>
            </View>

            {/* Shop Filter */}
            <View style={{ marginTop: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => setSelectedShop("")}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: !selectedShop ? "#171717" : "#FFFFFF",
                      borderWidth: 1,
                      borderColor: !selectedShop ? "#171717" : "#E5E7EB",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: !selectedShop ? "#FFFFFF" : "#737373" }}>
                      All shops
                    </Text>
                  </Pressable>

                  {shops.map(shop => (
                    <Pressable
                      key={shop.id}
                      onPress={() => setSelectedShop(shop.id)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: selectedShop === shop.id ? "#171717" : "#FFFFFF",
                        borderWidth: 1,
                        borderColor: selectedShop === shop.id ? "#171717" : "#E5E7EB",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: selectedShop === shop.id ? "#FFFFFF" : "#737373" }}>
                        {shop.shop_name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {filteredSales.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 10,
                  padding: 20,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#171717" }}>
                  No sales match these filters
                </Text>
                <Text style={{ fontSize: 13, color: "#737373", marginTop: 6, textAlign: "center" }}>
                  Try a different date range, shop, or search term.
                </Text>
              </View>
            ) : filteredSales.map((sale) => {
              const isCancelled = sale.status === 'Cancelled';
              return (
              <Pressable
                key={sale.id}
                onPress={() => handleSalePress(sale)}
                style={({ pressed }) => ({
                  backgroundColor: isCancelled ? "#FAFAFA" : "#fff",
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  opacity: isCancelled ? 0.6 : pressed ? 0.7 : 1,
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        backgroundColor: isCancelled ? "#FEF2F2" : "#F5F5F5",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 8,
                      }}
                    >
                      <ShoppingCart size={14} color={isCancelled ? "#DC2626" : "#525252"} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: isCancelled ? "#A3A3A3" : "#171717",
                          textDecorationLine: isCancelled ? "line-through" : "none",
                        }}
                      >
                        Sale #{sale.id}
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: isCancelled ? "#A3A3A3" : "#737373", marginTop: 1 }}
                      >
                        {sale.shop_name}
                      </Text>

                      <View
                        style={{
                          flexDirection: "row",
                          marginTop: 4,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: "#F5F5F5",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            marginRight: 6,
                            marginBottom: 2,
                          }}
                        >
                          <Text style={{ fontSize: 11, color: "#737373" }}>
                            {formatDate(sale.sale_date)}
                          </Text>
                        </View>

                        {/* Status Badge */}
                        <View
                          style={{
                            backgroundColor: isCancelled ? "#FEF2F2" : sale.status === "Submitted" ? "#EFF6FF" : "#F5F5F5",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            marginRight: 6,
                            marginBottom: 2,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: "600", color: isCancelled ? "#DC2626" : sale.status === "Submitted" ? "#2563EB" : "#737373" }}>
                            {sale.status}
                          </Text>
                        </View>

                        {sale.notes && (
                          <View
                            style={{
                              backgroundColor: "#F5F5F5",
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              marginBottom: 2,
                            }}
                          >
                            <Text style={{ fontSize: 11, color: "#737373" }}>
                              {sale.notes}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: isCancelled ? "#A3A3A3" : "#171717",
                      }}
                    >
                      {formatCurrency(sale.total_amount)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
            })}
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 40,
              paddingTop: 60,
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#F3F4F6",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <TrendingUp size={32} color="#9CA3AF" />
            </View>

            <Text
              style={{
                fontSize: 20,
                fontWeight: "600",
                color: "#1F2937",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              No sales yet
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: "#737373",
                textAlign: "center",
                marginBottom: 32,
                lineHeight: 24,
              }}
            >
              Record your first sale to start tracking revenue and building your
              business insights
            </Text>

            <Pressable
              onPress={handleNewSale}
              style={({ pressed }) => ({
                backgroundColor: "#171717",
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Plus size={20} color="#fff" />
              <Text
                style={{
                  color: "#fff",
                  marginLeft: 8,
                  fontWeight: "600",
                  fontSize: 16,
                }}
              >
                Record sale
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <FormSheet
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record sale"
        insets={insets}
        height="90%"
        footer={
          <AppButton
            label={submitting ? "Saving..." : "Record sale"}
            onPress={handleAddSale}
            disabled={submitting}
          />
        }
      >
        <Text style={{ fontSize: 13, fontWeight: "500", color: "#525252", marginBottom: 8 }}>
          Shop
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {shops.map((shop) => {
              const active = selectedShopId === shop.id.toString();
              return (
                <Pressable
                  key={shop.id}
                  onPress={() => setSelectedShopId(shop.id.toString())}
                  style={{
                    minHeight: 32,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? "#2E69FF" : "#E2E2E2",
                    backgroundColor: active ? "#EAF0FF" : "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 13, color: active ? "#2E69FF" : "#525252", fontWeight: "500" }}>
                    {shop.shop_name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <FormField label="Customer name" value={customerName} onChangeText={setCustomerName} placeholder="Enter customer name" />
        <FormField label="Customer mobile number" value={customerMobile} onChangeText={setCustomerMobile} placeholder="07..." keyboardType="phone-pad" />

        <Text style={{ fontSize: 13, fontWeight: "500", color: "#525252", marginBottom: 8 }}>
          Payment method
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {["Mpesa", "Cash", "Bank"].map((method) => {
            const active = paymentMethod === method;
            let borderColor = "#E2E2E2";
            let backgroundColor = "#FFFFFF";
            let textColor = "#525252";

            if (active) {
              if (method === "Mpesa") {
                borderColor = "#1C7C45";
                backgroundColor = "#EAF7EF";
                textColor = "#1C7C45";
              } else if (method === "Cash") {
                borderColor = "#2E69FF";
                backgroundColor = "#EAF0FF";
                textColor = "#2E69FF";
              } else if (method === "Bank") {
                borderColor = "#C73A3A";
                backgroundColor = "#FDEEEE";
                textColor = "#C73A3A";
              }
            }

            return (
              <Pressable
                key={method}
                onPress={() => setPaymentMethod(method)}
                style={{
                  flex: 1,
                  minHeight: 34,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: borderColor,
                  backgroundColor: backgroundColor,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "500", color: textColor }}>{method}</Text>
              </Pressable>
            );
          })}
        </View>

        <FormField label="Delivery location" value={deliveryLocation} onChangeText={setDeliveryLocation} placeholder="Optional delivery location" />
        <FormField label="Search items" value={itemSearchQuery} onChangeText={setItemSearchQuery} placeholder="Search items..." />

        <View
          style={{
            maxHeight: 220,
            borderWidth: 1,
            borderColor: "#E2E2E2",
            borderRadius: 8,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {items
              .filter((product) => {
                const matchesShop = selectedShopId ? product.shop_id === selectedShopId : true;
                const matchesSearch = itemSearchQuery
                  ? product.item_name.toLowerCase().includes(itemSearchQuery.toLowerCase())
                  : true;
                const isEnabled = product.enabled !== false;
                return matchesShop && matchesSearch && isEnabled;
              })
              .map((product) => {
                const isSelected = saleItems.some((si) => si.item_id === product.id);
                return (
                  <Pressable
                    key={product.id}
                    onPress={() => toggleItemSelection(product)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: "#EDEDED",
                      backgroundColor: isSelected ? "#F5F5F5" : "#FFFFFF",
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: "500", color: "#171717" }}>{product.item_name}</Text>
                      <Text style={{ fontSize: 12, color: "#707070", marginTop: 2 }}>
                        Stock: {product.current_stock} | {formatCurrency(product.unit_price)}
                      </Text>
                    </View>
                    {isSelected ? <Check size={14} color="#171717" strokeWidth={2.2} /> : null}
                  </Pressable>
                );
              })}
          </ScrollView>
        </View>

        {saleItems.length > 0 ? (
          <View style={{ gap: 10, marginBottom: 16 }}>
            {saleItems.map((item) => (
              <View
                key={item.item_id}
                style={{
                  borderWidth: 1,
                  borderColor: "#EDEDED",
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: "#171717", flex: 1 }}>{item.item_name}</Text>
                  <Pressable onPress={() => removeItem(item.item_id)} style={{ padding: 4 }}>
                    <X size={16} color="#707070" />
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Qty"
                      value={item.quantity.toString()}
                      onChangeText={(text) => updateItemQuantity(item.item_id, text)}
                      keyboardType="numeric"
                      selectTextOnFocus
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Price"
                      value={item.unit_price.toString()}
                      onChangeText={(text) => updateItemPrice(item.item_id, text)}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: "#707070", marginTop: 8 }}>
                  Subtotal: {formatCurrency(item.unit_price * item.quantity)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Add notes about this sale..." multiline />
        <View style={{ borderWidth: 1, borderColor: "#E2E2E2", borderRadius: 8, padding: 14, backgroundColor: "#FFFFFF" }}>
          <Text style={{ fontSize: 12, color: "#707070", marginBottom: 4 }}>Total amount</Text>
          <Text style={{ fontSize: 24, fontWeight: "600", color: "#171717" }}>{formatCurrency(calculateTotal())}</Text>
        </View>
      </FormSheet>

      {/* Legacy Add Sale Modal */}
      <Modal
        visible={false && showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
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
              maxHeight: "90%",
              paddingBottom: insets.bottom + 20,
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
                Record Sale
              </Text>
              <Pressable onPress={() => setShowAddModal(false)} style={{ padding: 4 }}>
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
            >
              <ScrollView
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                <View style={{ padding: 20, gap: 16, paddingBottom: 40 }}>
                  {/* Shop Selection */}
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        Shop
                      </Text>
                      <Text style={{ fontSize: 14, color: "#EF4444", marginLeft: 4 }}>*</Text>
                      <Text style={{ fontSize: 12, color: "#EF4444", marginLeft: 2 }}>Required</Text>
                    </View>
                    {!selectedShopId && (
                      <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 8, fontStyle: "italic" }}>
                        Please select a shop for this sale
                      </Text>
                    )}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {shops.map((shop) => (
                          <Pressable
                            key={shop.id}
                            onPress={() => setSelectedShopId(shop.id.toString())}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 10,
                              borderRadius: 20,
                              backgroundColor:
                                selectedShopId === shop.id.toString()
                                  ? "#EF4444"
                                  : "#F3F4F6",
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color:
                                  selectedShopId === shop.id.toString()
                                    ? "#fff"
                                    : "#6B7280",
                                marginRight: selectedShopId === shop.id.toString() ? 6 : 0,
                              }}
                            >
                              {shop.shop_name}
                            </Text>
                            {selectedShopId === shop.id.toString() && (
                              <Check size={14} color="#fff" />
                            )}
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Customer Information */}
                  <View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: 8,
                      }}
                    >
                      Customer Details
                    </Text>
                    <View style={{ gap: 12 }}>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 4 }}>
                          Customer Name *
                        </Text>
                        <TextInput
                          value={customerName}
                          onChangeText={setCustomerName}
                          placeholder="Enter customer name"
                          style={{
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 14,
                            backgroundColor: "#fff",
                          }}
                        />
                      </View>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 4 }}>
                          Customer Mobile Number *
                        </Text>
                        <TextInput
                          value={customerMobile}
                          onChangeText={setCustomerMobile}
                          placeholder="Enter mobile number"
                          keyboardType="phone-pad"
                          style={{
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 14,
                            backgroundColor: "#fff",
                          }}
                        />
                      </View>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                          Payment Method *
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Pressable
                            onPress={() => setPaymentMethod("Cash")}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: paymentMethod === "Cash" ? "#EF4444" : "#E5E7EB",
                              backgroundColor: paymentMethod === "Cash" ? "#FEF2F2" : "#fff",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: paymentMethod === "Cash" ? "#EF4444" : "#6B7280",
                              }}
                            >
                              Cash
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => setPaymentMethod("Mpesa")}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: paymentMethod === "Mpesa" ? "#EF4444" : "#E5E7EB",
                              backgroundColor: paymentMethod === "Mpesa" ? "#FEF2F2" : "#fff",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: paymentMethod === "Mpesa" ? "#EF4444" : "#6B7280",
                              }}
                            >
                              M-Pesa
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => setPaymentMethod("Bank")}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: paymentMethod === "Bank" ? "#EF4444" : "#E5E7EB",
                              backgroundColor: paymentMethod === "Bank" ? "#FEF2F2" : "#fff",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: paymentMethod === "Bank" ? "#EF4444" : "#6B7280",
                              }}
                            >
                              Bank
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 4 }}>
                          Delivery Location (Optional)
                        </Text>
                        <TextInput
                          value={deliveryLocation}
                          onChangeText={setDeliveryLocation}
                          placeholder="Enter delivery location"
                          style={{
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 14,
                            backgroundColor: "#fff",
                          }}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Select Items */}
                  <View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: 8,
                      }}
                    >
                      Select Items * ({saleItems.length} selected)
                    </Text>

                    {/* Search Bar */}
                    <TextInput
                      value={itemSearchQuery}
                      onChangeText={setItemSearchQuery}
                      placeholder="Search items..."
                      style={{
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 14,
                        backgroundColor: "#fff",
                        marginBottom: 8,
                      }}
                    />

                    {/* Available Items List */}
                    <View style={{
                      maxHeight: 200,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 8,
                      backgroundColor: "#FAFAFA",
                    }}>
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {items
                          .filter((product) => {
                            const matchesShop = selectedShopId
                              ? product.shop_id === selectedShopId
                              : true;
                            const matchesSearch = itemSearchQuery
                              ? product.item_name.toLowerCase().includes(itemSearchQuery.toLowerCase())
                              : true;
                            const isEnabled = product.enabled !== false; // Only show enabled items
                            return matchesShop && matchesSearch && isEnabled;
                          })
                          .map((product) => {
                            const isSelected = saleItems.some((si) => si.item_id === product.id);
                            return (
                              <Pressable
                                key={product.id}
                                onPress={() => toggleItemSelection(product)}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: 12,
                                  borderBottomWidth: 1,
                                  borderBottomColor: "#E5E7EB",
                                  backgroundColor: isSelected ? "#FEF2F2" : "#fff",
                                }}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={{
                                    fontSize: 14,
                                    fontWeight: "600",
                                    color: "#1F2937",
                                  }}>
                                    {product.item_name}
                                  </Text>
                                  <Text style={{
                                    fontSize: 12,
                                    color: "#6B7280",
                                    marginTop: 2,
                                  }}>
                                    Stock: {product.current_stock} • {formatCurrency(product.unit_price)}
                                  </Text>
                                </View>
                                {isSelected && (
                                  <View style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: "#EF4444",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}>
                                    <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>
                                  </View>
                                )}
                              </Pressable>
                            );
                          })}
                      </ScrollView>
                    </View>
                  </View>

                  {/* Selected Items with Quantities */}
                  {saleItems.length > 0 && (
                    <View>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: "#374151",
                          marginBottom: 8,
                        }}
                      >
                        Selected Items
                      </Text>
                      {saleItems.map((item) => (
                        <View
                          key={item.item_id}
                          style={{
                            backgroundColor: "#F9FAFB",
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 8,
                          }}
                        >
                          <View style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                          }}>
                            <Text style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#1F2937",
                              flex: 1,
                            }}>
                              {item.item_name}
                            </Text>
                            <Pressable
                              onPress={() => removeItem(item.item_id)}
                              style={{ padding: 4 }}
                            >
                              <X size={16} color="#EF4444" />
                            </Pressable>
                          </View>
                          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{
                                fontSize: 12,
                                color: "#6B7280",
                                marginBottom: 4,
                              }}>
                                Quantity
                              </Text>
                              <TextInput
                                value={item.quantity.toString()}
                                onChangeText={(text) => updateItemQuantity(item.item_id, text)}
                                keyboardType="numeric"
                                selectTextOnFocus={true}
                                style={{
                                  borderWidth: 1,
                                  borderColor: "#E5E7EB",
                                  borderRadius: 6,
                                  paddingHorizontal: 8,
                                  paddingVertical: 6,
                                  fontSize: 14,
                                  backgroundColor: "#fff",
                                }}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{
                                fontSize: 12,
                                color: "#6B7280",
                                marginBottom: 4,
                              }}>
                                Price
                              </Text>
                              <TextInput
                                value={item.unit_price.toString()}
                                onChangeText={(text) => updateItemPrice(item.item_id, text)}
                                keyboardType="decimal-pad"
                                selectTextOnFocus={true}
                                style={{
                                  borderWidth: 1,
                                  borderColor: "#E5E7EB",
                                  borderRadius: 6,
                                  paddingHorizontal: 8,
                                  paddingVertical: 6,
                                  fontSize: 14,
                                  backgroundColor: "#fff",
                                }}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{
                                fontSize: 12,
                                color: "#6B7280",
                                marginBottom: 4,
                              }}>
                                Subtotal
                              </Text>
                              <Text style={{
                                fontSize: 14,
                                fontWeight: "600",
                                color: "#10B981",
                              }}>
                                {formatCurrency(item.unit_price * item.quantity)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                {/* Notes */}
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: 8,
                    }}
                  >
                    Notes (Optional)
                  </Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add any notes about this sale..."
                    multiline
                    numberOfLines={3}
                    style={{
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 16,
                      backgroundColor: "#fff",
                      textAlignVertical: "top",
                    }}
                  />
                </View>

                {/* Total */}
                <View
                  style={{
                    backgroundColor: "#FEF2F2",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      Total Amount
                    </Text>
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: "bold",
                        color: "#EF4444",
                      }}
                    >
                      {formatCurrency(calculateTotal())}
                    </Text>
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
                  onPress={handleAddSale}
                  disabled={submitting}
                  style={({ pressed }) => ({
                    backgroundColor: "#171717",
                    borderRadius: 10,
                    paddingVertical: 14,
                    alignItems: "center",
                    opacity: pressed || submitting ? 0.7 : 1,
                  })}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#fff",
                      }}
                    >
                      Record Sale
                    </Text>
                  )}
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* Sale Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
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
              maxHeight: "84%",
              paddingBottom: insets.bottom + 20,
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
                Sale Details
              </Text>
              <Pressable
                onPress={() => setShowDetailsModal(false)}
                style={{ padding: 4 }}
              >
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={true}>
              {selectedSale && (
                <View style={{ padding: 20, gap: 20 }}>
                  {/* Sale Info */}
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
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#6B7280",
                            fontWeight: "500",
                          }}
                        >
                          Sale #{selectedSale.id}
                        </Text>
                        {selectedSale.status === "Cancelled" && (
                          <View
                            style={{
                              backgroundColor: "#FEE2E2",
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#DC2626" }}>
                              CANCELLED
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={{
                          fontSize: 24,
                          fontWeight: "bold",
                          color: selectedSale.status === "Cancelled" ? "#6B7280" : "#10B981",
                          textDecorationLine: selectedSale.status === "Cancelled" ? "line-through" : "none",
                        }}
                      >
                        {formatCurrency(selectedSale.total_amount)}
                      </Text>
                    </View>

                    <View style={{ gap: 8 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text style={{ fontSize: 14, color: "#6B7280" }}>
                          Shop
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#1F2937",
                          }}
                        >
                          {selectedSale.shop_name}
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text style={{ fontSize: 14, color: "#6B7280" }}>
                          Date
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#1F2937",
                          }}
                        >
                          {formatDate(selectedSale.sale_date)}
                        </Text>
                      </View>

                      {selectedSale.customer_name && (
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text style={{ fontSize: 14, color: "#6B7280" }}>
                            Customer
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#1F2937",
                            }}
                          >
                            {selectedSale.customer_name}
                          </Text>
                        </View>
                      )}

                      {selectedSale.customer_mobile_number && (
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text style={{ fontSize: 14, color: "#6B7280" }}>
                            Mobile
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#1F2937",
                            }}
                          >
                            {selectedSale.customer_mobile_number}
                          </Text>
                        </View>
                      )}

                      {selectedSale.payment_method && (
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text style={{ fontSize: 14, color: "#6B7280" }}>
                            Payment
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#1F2937",
                            }}
                          >
                            {selectedSale.payment_method}
                          </Text>
                        </View>
                      )}

                      {selectedSale.delivery_location && (
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text style={{ fontSize: 14, color: "#6B7280" }}>
                            Delivery
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#1F2937",
                            }}
                          >
                            {selectedSale.delivery_location}
                          </Text>
                        </View>
                      )}

                      {selectedSale.notes && (
                        <View style={{ marginTop: 8 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              color: "#6B7280",
                              marginBottom: 4,
                            }}
                          >
                            Notes
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: "#1F2937",
                              fontStyle: "italic",
                            }}
                          >
                            {selectedSale.notes}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Items List */}
                  {selectedSale.items && selectedSale.items.length > 0 && (
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 12 }}>
                        Items ({selectedSale.items_count})
                      </Text>
                      {selectedSale.items.map((item, index) => (
                        <View
                          key={index}
                          style={{
                            backgroundColor: "#F9FAFB",
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 8,
                          }}
                        >
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>
                                {item.product_name || item.product}
                              </Text>
                              <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                                Qty: {item.quantity} × {formatCurrency(item.item_price)}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: "600", color: "#10B981" }}>
                              {formatCurrency(item.quantity * item.item_price)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View
              style={{
                padding: 20,
                borderTopWidth: 1,
                borderTopColor: "#E5E7EB",
                gap: 12,
              }}
            >
              {selectedSale && selectedSale.status !== "Cancelled" && (
                <Pressable
                  onPress={handleCancelSale}
                  style={({ pressed }) => ({
                    backgroundColor: "#171717",
                    borderRadius: 10,
                    paddingVertical: 14,
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
                    Cancel Sale
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => setShowDetailsModal(false)}
                style={({ pressed }) => ({
                  backgroundColor: "#FFFFFF",
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#171717",
                  }}
                >
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Slim Ad Banner */}
      <AdBanner variant="slim" context="sales" />
      </View>
  );
}
