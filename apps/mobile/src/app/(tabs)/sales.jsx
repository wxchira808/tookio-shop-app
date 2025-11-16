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
import { getSales, createSale, getShops, getProducts, deleteSalesTransaction } from "@/utils/frappeApi";

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
  const [saleItems, setSaleItems] = useState([
    { item_id: "", quantity: 1, unit_price: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

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

  const addSaleItem = () => {
    setSaleItems([...saleItems, { item_id: "", quantity: 1, unit_price: "" }]);
  };

  const removeSaleItem = (index) => {
    if (saleItems.length > 1) {
      setSaleItems(saleItems.filter((_, i) => i !== index));
    }
  };

  const updateSaleItem = (index, field, value) => {
    const updated = [...saleItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-fill unit price when item is selected
    if (field === "item_id" && value) {
      const item = items.find((i) => i.id === parseInt(value));
      if (item) {
        updated[index].unit_price = item.unit_price.toString();
      }
    }

    setSaleItems(updated);
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
    setSaleItems([{ item_id: "", quantity: 1, unit_price: "" }]);
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

    const validItems = saleItems.filter(
      (item) => item.item_id && item.quantity && item.unit_price,
    );

    if (validItems.length === 0) {
      Alert.alert("Error", "Please add at least one valid item");
      return;
    }

    try {
      setSubmitting(true);
      const result = await createSale({
        shop_id: parseInt(selectedShopId),
        items: validItems.map((item) => ({
          item_id: parseInt(item.item_id),
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price),
        })),
        notes: notes || null,
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
        setSaleItems([{ item_id: "", quantity: 1, unit_price: "" }]);
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

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Calculate totals
  const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0);
  const averageSale = sales.length > 0 ? totalRevenue / sales.length : 0;

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
                ${totalRevenue.toFixed(2)}
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
              ${averageSale.toFixed(2)}
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

            {sales.map((sale) => (
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
                        {sale.shop_name} • {sale.items_count} item
                        {sale.items_count !== 1 ? "s" : ""}
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
                      ${sale.total_amount.toFixed(2)}
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
              maxHeight: "90%",
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

            <ScrollView style={{ maxHeight: 500 }}>
              <View style={{ padding: 20, gap: 20 }}>
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

                {/* Items */}
                <View>
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
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      Items *
                    </Text>
                    <Pressable
                      onPress={addSaleItem}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        backgroundColor: "#EF444415",
                      }}
                    >
                      <Plus size={14} color="#EF4444" />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "500",
                          color: "#EF4444",
                        }}
                      >
                        Add Item
                      </Text>
                    </Pressable>
                  </View>

                  {saleItems.map((item, index) => (
                    <View
                      key={index}
                      style={{
                        backgroundColor: "#F9FAFB",
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 12,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 12,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          Item {index + 1}
                        </Text>
                        {saleItems.length > 1 && (
                          <Pressable
                            onPress={() => removeSaleItem(index)}
                            style={{ padding: 4 }}
                          >
                            <Minus size={16} color="#EF4444" />
                          </Pressable>
                        )}
                      </View>

                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: "#6B7280",
                          marginBottom: 6,
                        }}
                      >
                        Product
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          {items
                            .filter((product) =>
                              selectedShopId
                                ? product.shop_id === parseInt(selectedShopId)
                                : true
                            )
                            .map((product) => (
                              <Pressable
                                key={product.id}
                                onPress={() =>
                                  updateSaleItem(index, "item_id", product.id.toString())
                                }
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                  borderRadius: 16,
                                  backgroundColor:
                                    item.item_id === product.id.toString()
                                      ? "#EF4444"
                                      : "#fff",
                                  borderWidth: 1,
                                  borderColor:
                                    item.item_id === product.id.toString()
                                      ? "#EF4444"
                                      : "#E5E7EB",
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: "500",
                                    color:
                                      item.item_id === product.id.toString()
                                        ? "#fff"
                                        : "#6B7280",
                                  }}
                                >
                                  {product.item_name} (Stock: {product.current_stock})
                                </Text>
                              </Pressable>
                            ))}
                        </View>
                      </ScrollView>

                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#6B7280",
                              marginBottom: 6,
                            }}
                          >
                            Quantity
                          </Text>
                          <TextInput
                            value={item.quantity.toString()}
                            onChangeText={(text) =>
                              updateSaleItem(index, "quantity", text)
                            }
                            placeholder="0"
                            keyboardType="numeric"
                            style={{
                              borderWidth: 1,
                              borderColor: "#E5E7EB",
                              borderRadius: 8,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              fontSize: 16,
                              backgroundColor: "#fff",
                            }}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#6B7280",
                              marginBottom: 6,
                            }}
                          >
                            Unit Price ($)
                          </Text>
                          <TextInput
                            value={item.unit_price}
                            onChangeText={(text) =>
                              updateSaleItem(index, "unit_price", text)
                            }
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            style={{
                              borderWidth: 1,
                              borderColor: "#E5E7EB",
                              borderRadius: 8,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              fontSize: 16,
                              backgroundColor: "#fff",
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

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

            <ScrollView style={{ maxHeight: 500 }}>
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
                          Shop:
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
                          Date:
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

                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text style={{ fontSize: 14, color: "#6B7280" }}>
                          Items:
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#1F2937",
                          }}
                        >
                          {selectedSale.items_count}
                        </Text>
                      </View>

                      {selectedSale.notes && (
                        <View style={{ marginTop: 8 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              color: "#6B7280",
                              marginBottom: 4,
                            }}
                          >
                            Notes:
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

                  {/* Summary Message */}
                  <View
                    style={{
                      backgroundColor: "#EFF6FF",
                      borderRadius: 12,
                      padding: 16,
                      alignItems: "center",
                    }}
                  >
                    <ShoppingCart size={32} color="#357AFF" />
                    <Text
                      style={{
                        fontSize: 16,
                        color: "#1F2937",
                        marginTop: 12,
                        textAlign: "center",
                        fontWeight: "500",
                      }}
                    >
                      This sale has been completed and stock has been updated.
                    </Text>
                  </View>
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
