import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRequireAuth } from "@/utils/auth/useAuth";
import { useState, useEffect } from "react";
import {
  Plus,
  ShoppingCart,
  Calendar,
  Receipt,
  X,
  Minus,
  Package,
} from "lucide-react-native";
import { router } from "expo-router";
import { getPurchases, createPurchase, getShops, getItems } from "@/utils/api";

export default function Purchases() {
  useRequireAuth();
  const insets = useSafeAreaInsets();
  const [purchases, setPurchases] = useState([]);
  const [shops, setShops] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [notes, setNotes] = useState("");
  const [purchaseItems, setPurchaseItems] = useState([
    { item_id: "", quantity: 1, unit_cost: "" },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [purchasesRes, shopsRes, itemsRes] = await Promise.all([
        getPurchases(),
        getShops(),
        getItems(),
      ]);

      if (purchasesRes && purchasesRes.purchases) {
        setPurchases(purchasesRes.purchases);
      }

      if (shopsRes && shopsRes.shops) {
        setShops(shopsRes.shops);
      }

      if (itemsRes && itemsRes.items) {
        setItems(itemsRes.items);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load purchases data");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const addPurchaseItem = () => {
    setPurchaseItems([
      ...purchaseItems,
      { item_id: "", quantity: 1, unit_cost: "" },
    ]);
  };

  const removePurchaseItem = (index) => {
    if (purchaseItems.length > 1) {
      setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
    }
  };

  const updatePurchaseItem = (index, field, value) => {
    const updated = [...purchaseItems];
    updated[index] = { ...updated[index], [field]: value };
    setPurchaseItems(updated);
  };

  const calculateTotal = () => {
    return purchaseItems.reduce(
      (sum, item) =>
        sum + parseFloat(item.unit_cost || 0) * parseInt(item.quantity || 0),
      0,
    );
  };

  const handleAddPurchase = async () => {
    if (!selectedShopId) {
      Alert.alert("Error", "Please select a shop");
      return;
    }

    const validItems = purchaseItems.filter(
      (item) => item.item_id && item.quantity && item.unit_cost,
    );

    if (validItems.length === 0) {
      Alert.alert("Error", "Please add at least one valid item");
      return;
    }

    try {
      const result = await createPurchase({
        shop_id: parseInt(selectedShopId),
        items: validItems.map((item) => ({
          item_id: parseInt(item.item_id),
          quantity: parseInt(item.quantity),
          unit_cost: parseFloat(item.unit_cost),
        })),
        notes,
      });

      if (result && result.purchase) {
        Alert.alert("Success", "Purchase recorded successfully! Stock levels have been updated.");
        setShowAddModal(false);
        setSelectedShopId("");
        setNotes("");
        setPurchaseItems([{ item_id: "", quantity: 1, unit_cost: "" }]);
        loadData();
      }
    } catch (error) {
      console.error("Error adding purchase:", error);
      Alert.alert("Error", error.message || "Failed to record purchase");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  if (loading && purchases.length === 0) {
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
        <Text style={{ fontSize: 16, color: "#6B7280" }}>Loading...</Text>
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
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ fontSize: 28, fontWeight: "bold", color: "#1F2937" }}>
            Purchases
          </Text>
          <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 4 }}>
            Track your inventory expenses
          </Text>
        </View>

        <Pressable
          onPress={() => setShowAddModal(true)}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#357AFF",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Plus size={20} color="#fff" />
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
        {purchases.length === 0 ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ShoppingCart size={64} color="#D1D5DB" />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#6B7280",
                marginTop: 16,
                textAlign: "center",
              }}
            >
              No purchases yet
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#9CA3AF",
                textAlign: "center",
                marginTop: 8,
                lineHeight: 20,
              }}
            >
              Record your inventory purchases to track expenses and
              automatically update stock levels
            </Text>
          </View>
        ) : (
          <View style={{ padding: 20, gap: 12 }}>
            {purchases.map((purchase) => (
              <View
                key={purchase.id}
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
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "#F59E0B15",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Receipt size={16} color="#F59E0B" />
                    </View>
                    <View>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: "#1F2937",
                        }}
                      >
                        {purchase.shop_name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#6B7280",
                          marginTop: 2,
                        }}
                      >
                        <Calendar size={10} color="#6B7280" />{" "}
                        {formatDate(purchase.purchase_date)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: "#F59E0B",
                    }}
                  >
                    {formatCurrency(purchase.total_amount)}
                  </Text>
                </View>

                {/* Items */}
                {purchase.items && purchase.items.length > 0 && (
                  <View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: 8,
                      }}
                    >
                      Items Purchased:
                    </Text>
                    {purchase.items.map((item, index) => (
                      <View
                        key={index}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#6B7280",
                            flex: 1,
                          }}
                        >
                          {item.item_name} × {item.quantity}
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          {formatCurrency(item.total_cost)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {purchase.notes && (
                  <View style={{ marginTop: 12 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#6B7280",
                        fontStyle: "italic",
                      }}
                    >
                      Note: {purchase.notes}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Purchase Modal */}
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
            {/* Modal Header */}
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
                Record Purchase
              </Text>
              <Pressable
                onPress={() => setShowAddModal(false)}
                style={{
                  padding: 4,
                }}
              >
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
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ gap: 8 }}
                  >
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
                                ? "#357AFF"
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
                      onPress={addPurchaseItem}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        backgroundColor: "#357AFF15",
                      }}
                    >
                      <Plus size={14} color="#357AFF" />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "500",
                          color: "#357AFF",
                        }}
                      >
                        Add Item
                      </Text>
                    </Pressable>
                  </View>

                  {purchaseItems.map((item, index) => (
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
                        {purchaseItems.length > 1 && (
                          <Pressable
                            onPress={() => removePurchaseItem(index)}
                            style={{
                              padding: 4,
                            }}
                          >
                            <Minus size={16} color="#EF4444" />
                          </Pressable>
                        )}
                      </View>

                      {/* Item Selection */}
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
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 12 }}
                      >
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          {items.map((product) => (
                            <Pressable
                              key={product.id}
                              onPress={() =>
                                updatePurchaseItem(
                                  index,
                                  "item_id",
                                  product.id.toString(),
                                )
                              }
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 16,
                                backgroundColor:
                                  item.item_id === product.id.toString()
                                    ? "#357AFF"
                                    : "#fff",
                                borderWidth: 1,
                                borderColor:
                                  item.item_id === product.id.toString()
                                    ? "#357AFF"
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
                                {product.item_name}
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
                              updatePurchaseItem(index, "quantity", text)
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
                            Unit Cost ($)
                          </Text>
                          <TextInput
                            value={item.unit_cost}
                            onChangeText={(text) =>
                              updatePurchaseItem(index, "unit_cost", text)
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
                    placeholder="Add any notes about this purchase..."
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
                    backgroundColor: "#F0F9FF",
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
                        color: "#357AFF",
                      }}
                    >
                      {formatCurrency(calculateTotal())}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View
              style={{
                padding: 20,
                borderTopWidth: 1,
                borderTopColor: "#E5E7EB",
              }}
            >
              <Pressable
                onPress={handleAddPurchase}
                style={({ pressed }) => ({
                  backgroundColor: "#357AFF",
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#fff",
                  }}
                >
                  Record Purchase
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
