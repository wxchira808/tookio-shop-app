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
  BarChart3,
  Plus,
  Minus,
  Edit,
  TrendingUp,
  TrendingDown,
  X,
} from "lucide-react-native";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import {
  getStockTransactions,
  createStockTransaction,
  getItems,
} from "@/utils/frappeApi";

export default function Stock() {
  useRequireAuth();
  const insets = useSafeAreaInsets();

  const [stockTransactions, setStockTransactions] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalType, setModalType] = useState("in"); // 'in', 'out', 'adjustment'
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [transactionsRes, itemsRes] = await Promise.all([
        getStockTransactions(),
        getItems(),
      ]);

      if (transactionsRes && transactionsRes.transactions) {
        setStockTransactions(transactionsRes.transactions);
      }

      if (itemsRes && itemsRes.items) {
        setItems(itemsRes.items);
      }
    } catch (error) {
      console.error("Error loading stock data:", error);
      Alert.alert("Error", "Failed to load stock transactions");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openModal = (type) => {
    setModalType(type);
    setSelectedItemId("");
    setQuantity("");
    setReason("");
    setItemSearchQuery("");
    setShowModal(true);
  };

  const handleStockTransaction = async () => {
    if (!selectedItemId) {
      Alert.alert("Error", "Please select an item");
      return;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert("Error", "Please enter a valid quantity");
      return;
    }

    // Find the selected item to get its shop_id
    const selectedItem = items.find(item => item.id.toString() === selectedItemId);
    if (!selectedItem) {
      Alert.alert("Error", "Selected item not found");
      return;
    }

    try {
      setSubmitting(true);
      let finalQuantity = parseInt(quantity);

      // For 'out' transactions, quantity should be negative in the request
      // But we keep it positive in the UI for clarity
      const result = await createStockTransaction({
        item_id: selectedItemId,  // Pass as string (item name)
        shop_id: selectedItem.shop_id,
        transaction_type: modalType,
        quantity: finalQuantity,
        reason: reason || null,
      });

      if (result) {
        Alert.alert("Success", "Stock transaction recorded successfully!");
        setShowModal(false);
        setSelectedItemId("");
        setQuantity("");
        setReason("");
        loadData();
      }
    } catch (error) {
      console.error("Error recording stock transaction:", error);
      Alert.alert("Error", error.message || "Failed to record transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStock = () => openModal("in");
  const handleRemoveStock = () => openModal("out");
  const handleStockAdjustment = () => openModal("adjustment");

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case "in":
        return <TrendingUp size={20} color="#10B981" />;
      case "out":
        return <TrendingDown size={20} color="#EF4444" />;
      case "adjustment":
        return <Edit size={20} color="#F59E0B" />;
      default:
        return <BarChart3 size={20} color="#6B7280" />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case "in":
        return "#10B981";
      case "out":
        return "#EF4444";
      case "adjustment":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const getTransactionText = (type) => {
    switch (type) {
      case "in":
        return "Stock Added";
      case "out":
        return "Stock Removed";
      case "adjustment":
        return "Adjustment";
      default:
        return "Unknown";
    }
  };

  if (loading && stockTransactions.length === 0) {
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
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 12 }}>
          Loading stock data...
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
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}>
          Stock Management
        </Text>
        <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>
          Track inventory movements and levels
        </Text>
      </View>

      {/* Action Buttons */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: "#fff",
          marginBottom: 8,
        }}
      >
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            onPress={handleAddStock}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: "#10B981",
              paddingVertical: 12,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Plus size={16} color="#fff" />
            <Text style={{ color: "#fff", marginLeft: 4, fontWeight: "600" }}>
              Add Stock
            </Text>
          </Pressable>

          <Pressable
            onPress={handleRemoveStock}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: "#EF4444",
              paddingVertical: 12,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Minus size={16} color="#fff" />
            <Text style={{ color: "#fff", marginLeft: 4, fontWeight: "600" }}>
              Remove Stock
            </Text>
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
        {stockTransactions.length > 0 ? (
          <View style={{ padding: 20 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#1F2937",
                marginBottom: 16,
              }}
            >
              Recent Transactions
            </Text>

            {stockTransactions.map((transaction) => (
              <Pressable
                key={transaction.id}
                onPress={() => {
                  setSelectedTransaction(transaction);
                  setShowDetailsModal(true);
                }}
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
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      flex: 1,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor:
                          getTransactionColor(transaction.transaction_type) +
                          "15",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      {getTransactionIcon(transaction.transaction_type)}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: "#1F2937",
                        }}
                      >
                        {transaction.purpose}
                      </Text>
                      <Text
                        style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}
                      >
                        {transaction.shop_name}
                      </Text>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 8,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: "#6B7280" }}>
                          {formatDate(transaction.created_at)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        color: getTransactionColor(
                          transaction.transaction_type,
                        ),
                      }}
                    >
                      {transaction.quantity > 0 ? "+" : ""}
                      {transaction.quantity}
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
              <BarChart3 size={32} color="#9CA3AF" />
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
              No Stock Transactions
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
              Start managing your inventory by adding or removing stock from
              your items
            </Text>

            <Pressable
              onPress={handleAddStock}
              style={({ pressed }) => ({
                backgroundColor: "#10B981",
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
                Add Stock
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Stock Transaction Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
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
              height: "80%",
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
                {modalType === "in"
                  ? "Add Stock"
                  : modalType === "out"
                  ? "Remove Stock"
                  : "Adjust Stock"}
              </Text>
              <Pressable onPress={() => setShowModal(false)} style={{ padding: 4 }}>
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
                <View style={{ padding: 20, gap: 20, paddingBottom: 40 }}>
                  {/* Item Selection */}
                  <View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: 8,
                      }}
                    >
                      Select Item *
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

                    {/* Items List */}
                    <View style={{
                      maxHeight: 200,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 8,
                      backgroundColor: "#FAFAFA",
                    }}>
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {items
                          .filter((item) => {
                            const matchesSearch = itemSearchQuery
                              ? item.item_name.toLowerCase().includes(itemSearchQuery.toLowerCase())
                              : true;
                            return matchesSearch;
                          })
                          .map((item) => {
                            const isSelected = selectedItemId === item.id.toString();
                            const bgColor = isSelected
                              ? modalType === "in"
                                ? "#ECFDF5"
                                : modalType === "out"
                                ? "#FEF2F2"
                                : "#FFFBEB"
                              : "#fff";
                            const borderColor = isSelected
                              ? modalType === "in"
                                ? "#10B981"
                                : modalType === "out"
                                ? "#EF4444"
                                : "#F59E0B"
                              : "#E5E7EB";

                            return (
                              <Pressable
                                key={item.id}
                                onPress={() => setSelectedItemId(item.id.toString())}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: 12,
                                  borderBottomWidth: 1,
                                  borderBottomColor: "#E5E7EB",
                                  backgroundColor: bgColor,
                                }}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={{
                                    fontSize: 14,
                                    fontWeight: "600",
                                    color: "#1F2937",
                                  }}>
                                    {item.item_name}
                                  </Text>
                                  <Text style={{
                                    fontSize: 12,
                                    color: "#6B7280",
                                    marginTop: 2,
                                  }}>
                                    Current Stock: {item.current_stock} units
                                  </Text>
                                </View>
                                {isSelected && (
                                  <View style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: borderColor,
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

              {/* Quantity */}
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Quantity *
                </Text>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder={modalType === "adjustment" ? "Enter +/- amount" : "Enter quantity"}
                  keyboardType={modalType === "adjustment" ? "numbers-and-punctuation" : "numeric"}
                  selectTextOnFocus={true}
                  style={{
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    backgroundColor: "#fff",
                  }}
                />
                {modalType === "adjustment" && (
                  <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                    Use + for adding stock, - for removing (e.g., +10 or -5)
                  </Text>
                )}
              </View>

              {/* Reason */}
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Reason (Optional)
                </Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Enter reason for stock change..."
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
            </View>
          </ScrollView>

          <View style={{ padding: 20, paddingTop: 0 }}>
            <Pressable
              onPress={handleStockTransaction}
              disabled={submitting}
              style={({ pressed }) => ({
                backgroundColor:
                  modalType === "in"
                    ? "#10B981"
                    : modalType === "out"
                    ? "#EF4444"
                    : "#F59E0B",
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
                  {modalType === "in"
                    ? "Add Stock"
                    : modalType === "out"
                    ? "Remove Stock"
                    : "Adjust Stock"}
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* Transaction Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowDetailsModal(false);
          setSelectedTransaction(null);
        }}
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
              <Text style={{ fontSize: 20, fontWeight: "bold", color: "#1F2937" }}>
                Transaction Details
              </Text>
              <Pressable
                onPress={() => {
                  setShowDetailsModal(false);
                  setSelectedTransaction(null);
                }}
                style={{ padding: 4 }}
              >
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={true}>
              {selectedTransaction && (
                <View style={{ padding: 20, gap: 20 }}>
                  {/* Transaction Info */}
                  <View
                    style={{
                      backgroundColor: "#F9FAFB",
                      padding: 16,
                      borderRadius: 12,
                      gap: 12,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 14, color: "#6B7280" }}>Type</Text>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>
                        {selectedTransaction.purpose}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 14, color: "#6B7280" }}>Shop</Text>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>
                        {selectedTransaction.shop_name}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 14, color: "#6B7280" }}>Date</Text>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>
                        {formatDate(selectedTransaction.created_at)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 14, color: "#6B7280" }}>Total Quantity</Text>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: getTransactionColor(selectedTransaction.transaction_type) }}>
                        {selectedTransaction.quantity > 0 ? "+" : ""}{selectedTransaction.quantity}
                      </Text>
                    </View>
                  </View>

                  {/* Items List */}
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 12 }}>
                      Items ({selectedTransaction.items_count})
                    </Text>
                    {selectedTransaction.items && selectedTransaction.items.map((item, index) => (
                      <View
                        key={index}
                        style={{
                          backgroundColor: "#F9FAFB",
                          padding: 12,
                          borderRadius: 8,
                          marginBottom: 8,
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ fontSize: 14, color: "#1F2937", flex: 1 }}>
                          {item.product_name}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: getTransactionColor(selectedTransaction.transaction_type) }}>
                          {selectedTransaction.transaction_type === 'in' ? '+' : '-'}{item.quantity}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
