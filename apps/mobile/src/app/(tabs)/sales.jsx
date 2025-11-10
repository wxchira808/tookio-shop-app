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
import { useRequireAuth } from "@/utils/auth/useAuth";
import {
  TrendingUp,
  Plus,
  DollarSign,
  ShoppingCart,
  Calendar,
  X,
  Minus,
} from "lucide-react-native";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { getSales, createSale, getShops, getItems } from "@/utils/frappeApi";
import { formatCurrency } from "@/utils/currency";

export default function Sales() {
  useRequireAuth();
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
        setShops(shopsRes.shops);
      }

      if (itemsRes && itemsRes.items) {
        setItems(itemsRes.items);
      }
    } catch (error) {
      console.error("Error loading sales:", error);
      Alert.alert("Error", "Failed to load sales data");
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

  const handleSalePress = (sale) => {
    setSelectedSale(sale);
    setShowDetailsModal(true);
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
      Alert.alert("Error", error.message || "Failed to record sale");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  // Filter sales by search query
  const filteredSales = sales.filter((sale) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      (sale.customer_name && sale.customer_name.toLowerCase().includes(query)) ||
      (sale.notes && sale.notes.toLowerCase().includes(query)) ||
      (sale.id && sale.id.toString().includes(query))
    );
  });

  // Calculate totals
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0);
  const averageSale = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  if (loading && sales.length === 0) {
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
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 12 }}>
          Loading sales...
        </Text>
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
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}>
            Sales
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>
            Track your revenue and transactions
          </Text>
        </View>

        <Pressable
          onPress={handleNewSale}
          style={({ pressed }) => ({
            backgroundColor: "#EF4444",
            paddingHorizontal: 16,
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

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
        <TextInput
          style={{
            backgroundColor: "#F3F4F6",
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 16,
            color: "#1F2937",
          }}
          placeholder="Search sales by customer name, ID, or notes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
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
                <DollarSign size={20} color="#10B981" />
                <Text style={{ fontSize: 14, color: "#6B7280", marginLeft: 8 }}>
                  Total Revenue
                </Text>
              </View>
              <Text
                style={{ fontSize: 20, fontWeight: "bold", color: "#1F2937" }}
              >
                {formatCurrency(totalRevenue, false)}
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
                <ShoppingCart size={20} color="#357AFF" />
                <Text style={{ fontSize: 14, color: "#6B7280", marginLeft: 8 }}>
                  Total Sales
                </Text>
              </View>
              <Text
                style={{ fontSize: 20, fontWeight: "bold", color: "#1F2937" }}
              >
                {sales.length}
              </Text>
            </View>
          </View>

          <View
            style={{
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
              <TrendingUp size={20} color="#F59E0B" />
              <Text style={{ fontSize: 14, color: "#6B7280", marginLeft: 8 }}>
                Average Sale Value
              </Text>
            </View>
            <Text
              style={{ fontSize: 20, fontWeight: "bold", color: "#1F2937" }}
            >
              {formatCurrency(averageSale, false)}
            </Text>
          </View>
        </View>

        {/* Sales List */}
        {sales.length > 0 ? (
          <View style={{ paddingHorizontal: 20 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#1F2937",
                marginBottom: 16,
              }}
            >
              Recent Sales
            </Text>

            {filteredSales.map((sale) => (
              <Pressable
                key={sale.id}
                onPress={() => handleSalePress(sale)}
                style={({ pressed }) => ({
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                  opacity: pressed ? 0.7 : 1,
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
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: "#EF444415",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 16,
                      }}
                    >
                      <ShoppingCart size={24} color="#EF4444" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: "#1F2937",
                        }}
                      >
                        Sale #{sale.id}
                      </Text>
                      <Text
                        style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}
                      >
                        {sale.shop_name}
                      </Text>

                      <View
                        style={{
                          flexDirection: "row",
                          marginTop: 8,
                          alignItems: "center",
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: "#F3F4F6",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            marginRight: 8,
                          }}
                        >
                          <Text style={{ fontSize: 12, color: "#6B7280" }}>
                            {formatDate(sale.sale_date)}
                          </Text>
                        </View>

                        {sale.notes && (
                          <View
                            style={{
                              backgroundColor: "#FEF3C7",
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: "#92400E" }}>
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
                        fontSize: 18,
                        fontWeight: "bold",
                        color: "#10B981",
                      }}
                    >
                      {formatCurrency(sale.total_amount)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
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
              No Sales Yet
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: "#6B7280",
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
                backgroundColor: "#EF4444",
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
                Record First Sale
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Add Sale Modal */}
      <Modal
        visible={showAddModal}
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
              height: "90%",
              paddingBottom: insets.bottom,
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
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: 8,
                      }}
                    >
                      Shop *
                    </Text>
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
                              }}
                            >
                              {shop.shop_name}
                            </Text>
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
                      <TextInput
                        value={customerName}
                        onChangeText={setCustomerName}
                        placeholder="Customer Name *"
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
                      <TextInput
                        value={customerMobile}
                        onChangeText={setCustomerMobile}
                        placeholder="Customer Mobile Number *"
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
                      <TextInput
                        value={deliveryLocation}
                        onChangeText={setDeliveryLocation}
                        placeholder="Delivery Location (Optional)"
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
                            return matchesShop && matchesSearch;
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
                              <Text style={{
                                fontSize: 14,
                                fontWeight: "600",
                                color: "#10B981",
                              }}>
                                {formatCurrency(item.unit_price)}
                              </Text>
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
                    backgroundColor: "#EF4444",
                    borderRadius: 12,
                    paddingVertical: 16,
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
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#6B7280",
                          fontWeight: "500",
                        }}
                      >
                        Sale #{selectedSale.id}
                      </Text>
                      <Text
                        style={{
                          fontSize: 24,
                          fontWeight: "bold",
                          color: "#10B981",
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
              }}
            >
              <Pressable
                onPress={() => setShowDetailsModal(false)}
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
