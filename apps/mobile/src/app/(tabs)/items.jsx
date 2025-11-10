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
import { Package, Plus, Edit, Trash2, X } from "lucide-react-native";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { getItems, createItem, getShops, updateItem, deleteItem } from "@/utils/frappeApi";
import { getActiveShop } from "@/utils/storage";
import { formatCurrency } from "@/utils/currency";

export default function Items() {
  useRequireAuth();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeShopId, setActiveShopId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [selectedShopId, setSelectedShopId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, shopsRes, activeId] = await Promise.all([
        getItems(),
        getShops(),
        getActiveShop(),
      ]);

      if (itemsRes && itemsRes.items) {
        setItems(itemsRes.items);
      }

      if (shopsRes && shopsRes.shops) {
        setShops(shopsRes.shops);
        if (activeId) {
          setActiveShopId(activeId);
          setSelectedShopId(activeId.toString());
        } else if (shopsRes.shops.length > 0) {
          setSelectedShopId(shopsRes.shops[0].id.toString());
        }
      }
    } catch (error) {
      console.error("Error loading items:", error);
      Alert.alert("Error", "Failed to load items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const resetForm = () => {
    setItemName("");
    setDescription("");
    setSellingPrice("");
    setBuyingPrice("");
    setCurrentStock("");
    setLowStockThreshold("5");
  };

  const handleAddItem = async () => {
    if (!itemName.trim()) {
      Alert.alert("Error", "Please enter item name");
      return;
    }

    if (!selectedShopId) {
      Alert.alert("Error", "Please select a shop");
      return;
    }

    if (!sellingPrice || parseFloat(sellingPrice) < 0) {
      Alert.alert("Error", "Please enter a valid selling price");
      return;
    }

    if (!buyingPrice || parseFloat(buyingPrice) < 0) {
      Alert.alert("Error", "Please enter a valid buying price");
      return;
    }

    try {
      setSubmitting(true);
      const result = await createItem({
        shop_id: parseInt(selectedShopId),
        item_name: itemName.trim(),
        description: description.trim() || null,
        unit_price: parseFloat(sellingPrice),  // Frappe field name
        cost_price: parseFloat(buyingPrice),    // Frappe field name
        current_stock: currentStock ? parseInt(currentStock) : 0,
        low_stock_threshold: lowStockThreshold ? parseInt(lowStockThreshold) : 5,
      });

      if (result && result.item) {
        Alert.alert("Success", "Item added successfully!");
        resetForm();
        setShowAddModal(false);
        await loadData();
      }
    } catch (error) {
      console.error("Error creating item:", error);
      Alert.alert("Error", error.message || "Failed to create item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditItem = async () => {
    if (!itemName.trim()) {
      Alert.alert("Error", "Please enter item name");
      return;
    }

    if (!sellingPrice || parseFloat(sellingPrice) < 0) {
      Alert.alert("Error", "Please enter a valid selling price");
      return;
    }

    if (!buyingPrice || parseFloat(buyingPrice) < 0) {
      Alert.alert("Error", "Please enter a valid buying price");
      return;
    }

    try {
      setSubmitting(true);
      const result = await updateItem(editingItem.id, {
        item_name: itemName.trim(),
        description: description.trim() || null,
        unit_price: parseFloat(sellingPrice),  // Frappe field name
        cost_price: parseFloat(buyingPrice),    // Frappe field name
        low_stock_threshold: lowStockThreshold ? parseInt(lowStockThreshold) : 5,
      });

      if (result && result.item) {
        Alert.alert("Success", "Item updated successfully!");
        resetForm();
        setShowEditModal(false);
        setEditingItem(null);
        await loadData();
      }
    } catch (error) {
      console.error("Error updating item:", error);
      Alert.alert("Error", error.message || "Failed to update item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      "Delete Item",
      `Are you sure you want to delete "${item.item_name}"? This will also delete all associated transactions.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteItem(item.id);
              
              if (result && result.success) {
                Alert.alert("Success", "Item deleted successfully!");
                await loadData();
              }
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", error.message || "Failed to delete item");
            }
          },
        },
      ]
    );
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setItemName(item.item_name);
    setDescription(item.description || "");
    setSellingPrice(item.unit_price.toString());
    setBuyingPrice(item.cost_price.toString());
    setCurrentStock(item.current_stock.toString());
    setLowStockThreshold(item.low_stock_threshold?.toString() || "5");
    setSelectedShopId(item.shop_id.toString());
    setShowEditModal(true);
  };

  const openAddModal = () => {
    resetForm();
    if (activeShopId) {
      setSelectedShopId(activeShopId.toString());
    }
    setShowAddModal(true);
  };

  const getStockStatusColor = (stock) => {
    if (stock === 0) return "#EF4444";
    if (stock < 5) return "#F59E0B";
    return "#10B981";
  };

  const getStockStatusText = (stock) => {
    if (stock === 0) return "Out of Stock";
    if (stock < 5) return "Low Stock";
    return "In Stock";
  };

  // Filter items by active shop and search query
  const displayItems = items.filter((item) => {
    // Filter by active shop if one is selected
    if (activeShopId && item.shop_id !== activeShopId) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (item.item_name && item.item_name.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.sku && item.sku.toLowerCase().includes(query))
      );
    }

    return true;
  });

  if (loading && items.length === 0) {
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
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 12 }}>
          Loading items...
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
            Items
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>
            {displayItems.length} item{displayItems.length !== 1 ? "s" : ""}
            {activeShopId ? " in active shop" : " across all shops"}
          </Text>
        </View>

        <Pressable
          onPress={openAddModal}
          style={({ pressed }) => ({
            backgroundColor: "#10B981",
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
            Add Item
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
          placeholder="Search items by name or description..."
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
        {displayItems.length > 0 ? (
          <View style={{ padding: 20 }}>
            {displayItems.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
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
                        backgroundColor: "#10B98115",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 16,
                      }}
                    >
                      <Package size={24} color="#10B981" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: "#1F2937",
                        }}
                      >
                        {item.item_name}
                      </Text>
                      <Text
                        style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}
                      >
                        {item.sku ? `SKU: ${item.sku} • ` : ""}{item.shop_name}
                      </Text>

                      <View
                        style={{
                          flexDirection: "row",
                          marginTop: 8,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <View
                          style={{
                            backgroundColor:
                              getStockStatusColor(item.current_stock) + "15",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            marginRight: 8,
                            marginBottom: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: getStockStatusColor(item.current_stock),
                              fontWeight: "600",
                            }}
                          >
                            {item.current_stock} units •{" "}
                            {getStockStatusText(item.current_stock)}
                          </Text>
                        </View>

                        <View
                          style={{
                            backgroundColor: "#F3F4F6",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            marginBottom: 4,
                            marginRight: 8,
                          }}
                        >
                          <Text style={{ fontSize: 12, color: "#6B7280" }}>
                            Price: {formatCurrency(item.unit_price)}
                          </Text>
                        </View>

                        <View
                          style={{
                            backgroundColor: "#FEF3C7",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            marginBottom: 4,
                          }}
                        >
                          <Text style={{ fontSize: 12, color: "#92400E" }}>
                            Cost: {formatCurrency(item.cost_price)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: "#F3F4F6",
                  }}
                >
                  <Pressable
                    onPress={() => openEditModal(item)}
                    style={({ pressed }) => ({
                      flex: 1,
                      backgroundColor: "#F59E0B15",
                      paddingVertical: 8,
                      borderRadius: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Edit size={16} color="#F59E0B" />
                    <Text
                      style={{
                        color: "#F59E0B",
                        marginLeft: 4,
                        fontWeight: "600",
                        fontSize: 14,
                      }}
                    >
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteItem(item)}
                    style={({ pressed }) => ({
                      flex: 1,
                      backgroundColor: "#EF444415",
                      paddingVertical: 8,
                      borderRadius: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text
                      style={{
                        color: "#EF4444",
                        marginLeft: 4,
                        fontWeight: "600",
                        fontSize: 14,
                      }}
                    >
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 40,
              paddingTop: 100,
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
              <Package size={32} color="#9CA3AF" />
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
              No Items Yet
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
              {shops.length === 0
                ? "Create a shop first, then add products to track inventory"
                : "Add your first product to start tracking inventory levels"}
            </Text>

            {shops.length > 0 && (
              <Pressable
                onPress={openAddModal}
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
                  Add First Item
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Item Modal */}
      <Modal
        visible={showAddModal || showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setEditingItem(null);
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
                {showEditModal ? "Edit Item" : "Add New Item"}
              </Text>
              <Pressable
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
                style={{ padding: 4 }}
              >
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
              <ScrollView
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={{ padding: 20, gap: 16, paddingBottom: 40 }}>
                {/* Shop Selection */}
                {!showEditModal && (
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
                    >
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {shops.map((shop) => (
                          <Pressable
                            key={shop.id}
                            onPress={() =>
                              setSelectedShopId(shop.id.toString())
                            }
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 10,
                              borderRadius: 20,
                              backgroundColor:
                                selectedShopId === shop.id.toString()
                                  ? "#10B981"
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
                )}

                {/* Item Name */}
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: 8,
                    }}
                  >
                    Item Name *
                  </Text>
                  <TextInput
                    value={itemName}
                    onChangeText={setItemName}
                    placeholder="Enter item name"
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
                </View>

                {/* Description */}
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: 8,
                    }}
                  >
                    Description (Optional)
                  </Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter description"
                    multiline
                    numberOfLines={2}
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

                {/* Pricing Row */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: 8,
                      }}
                    >
                      Selling Price *
                    </Text>
                    <TextInput
                      value={sellingPrice}
                      onChangeText={setSellingPrice}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
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
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: 8,
                      }}
                    >
                      Buying Price *
                    </Text>
                    <TextInput
                      value={buyingPrice}
                      onChangeText={setBuyingPrice}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
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
                  </View>
                </View>

                {/* Stock Row */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: 8,
                      }}
                    >
                      Initial Stock
                    </Text>
                    <TextInput
                      value={currentStock}
                      onChangeText={setCurrentStock}
                      placeholder="0"
                      keyboardType="numeric"
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
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: 8,
                      }}
                    >
                      Low Stock Alert
                    </Text>
                    <TextInput
                      value={lowStockThreshold}
                      onChangeText={setLowStockThreshold}
                      placeholder="5"
                      keyboardType="numeric"
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
                  </View>
                </View>
              </View>
              </ScrollView>

              <View
                style={{
                  padding: 20,
                  paddingBottom: insets.bottom + 20,
                  borderTopWidth: 1,
                  borderTopColor: "#E5E7EB",
                }}
              >
                <Pressable
                  onPress={showEditModal ? handleEditItem : handleAddItem}
                  disabled={submitting}
                  style={({ pressed }) => ({
                    backgroundColor: "#10B981",
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
                      {showEditModal ? "Update Item" : "Add Item"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
