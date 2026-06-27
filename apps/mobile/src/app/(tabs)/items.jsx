import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRequireAuth, useAuth, handleApiError } from "@/utils/auth/useAuth";
import { AppButton, FormField, FormSheet } from "@/components/frappe-ui";
import {
  Package,
  Plus,
  TrendingUp,
  TrendingDown,
  X,
  Store,
  ArrowUpDown,
  CheckCircle,
  Minus,
  Search,
  Edit3,
  Trash2,
  Check,
  Info,
} from "lucide-react-native";
import { useState, useEffect } from "react";
import {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  getShops,
  createBulkStockAdjustment,
  getStockTransactions,
  checkSession,
} from "@/utils/frappeApi";
import { formatCurrency } from "@/utils/currency";
import { AdBanner } from "@/components/AdBanner";

export default function InventoryScreen() {
  useRequireAuth();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState([]);
  const [shops, setShops] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showStockAdjustModal, setShowStockAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showItemActionsModal, setShowItemActionsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [enabledFilter, setEnabledFilter] = useState(null); // null = all, true = enabled, false = disabled

  // Add Item Form
  const [itemForm, setItemForm] = useState({
    shop: "",
    item_name: "",
    description: "",
    unit_price: "",
    cost_price: "",
    current_stock: "0",
    low_stock_threshold: "5",
    enabled: true,
    track_stock: true,
  });

  // Stock Adjustment
  const [adjustmentShop, setAdjustmentShop] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("Adjust Stock"); // Adjust Stock, Add Stock, or Remove Stock
  const [adjustmentItems, setAdjustmentItems] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Check session first
      await checkSession();

      setLoading(true);
      const [itemsRes, shopsRes, stockRes] = await Promise.all([
        getItems(),
        getShops(),
        getStockTransactions(),
      ]);

      setItems(itemsRes?.items || []);
      setShops((shopsRes?.shops || []).filter(shop => shop.enabled === 1));
      setStockHistory(stockRes?.transactions || []);

      // Don't auto-select a shop - show all items by default
    } catch (error) {
      console.error("Error loading data:", error);
      if (!handleApiError(error, signOut)) {
        Alert.alert("Error", "Failed to load inventory data");
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

  const handleAddItem = async () => {
    if (!itemForm.shop || !itemForm.item_name || !itemForm.unit_price || !itemForm.cost_price) {
      Alert.alert("Missing Fields", "Please fill in shop, name, and prices");
      return;
    }

    try {
      await createItem({
        shop_id: itemForm.shop,
        item_name: itemForm.item_name.trim(),
        description: itemForm.description.trim(),
        unit_price: parseFloat(itemForm.unit_price),
        cost_price: parseFloat(itemForm.cost_price),
        current_stock: parseInt(itemForm.current_stock) || 0,
        low_stock_threshold: parseInt(itemForm.low_stock_threshold) || 5,
        enabled: itemForm.enabled,
        track_stock: itemForm.track_stock ? 1 : 0,
      });

      Alert.alert("Success", "Item added successfully");
      setShowAddItemModal(false);
      resetItemForm();
      await loadData();
    } catch (error) {
      console.error("Error creating item:", error);
      if (!handleApiError(error, signOut)) {
        Alert.alert("Error", "Failed to create item");
      }
    }
  };

  const handleBulkStockAdjustment = async () => {
    if (!adjustmentShop) {
      Alert.alert("Missing Shop", "Please select a shop");
      return;
    }

    const itemsWithQty = adjustmentItems.filter(item => item.quantity > 0);
    if (itemsWithQty.length === 0) {
      Alert.alert("No Items", "Please add at least one item with quantity");
      return;
    }

    Alert.alert(
      "Confirm Stock Adjustment",
      `Are you sure you want to perform this stock adjustment (${adjustmentType})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await createBulkStockAdjustment({
                shop: adjustmentShop,
                purpose: adjustmentType,
                items: itemsWithQty.map(item => ({
                  product: item.product_id,
                  quantity: item.quantity,
                })),
              });

              Alert.alert("Success", "Stock adjustment completed successfully");
              setShowStockAdjustModal(false);
              resetStockAdjustment();
              await loadData();
            } catch (error) {
              console.error("Error adjusting stock:", error);
              if (!handleApiError(error, signOut)) {
                Alert.alert("Error", "Failed to adjust stock");
              }
            }
          },
        },
      ]
    );
  };

  const resetItemForm = () => {
    setItemForm({
      shop: "",
      item_name: "",
      description: "",
      unit_price: "",
      cost_price: "",
      current_stock: "0",
      low_stock_threshold: "5",
      enabled: true,
      track_stock: true,
    });
  };

  const resetStockAdjustment = () => {
    setAdjustmentShop("");
    setAdjustmentType("Add Stock");
    setAdjustmentItems([]);
    setItemSearchQuery("");
  };

  // Handle item click - show actions modal
  const handleItemClick = (item) => {
    setSelectedItem(item);
    setShowItemActionsModal(true);
  };

  // Handle edit item
  const handleEditItem = () => {
    if (!selectedItem) return;

    // Populate form with selected item data
    setItemForm({
      shop: selectedItem.shop_id,
      item_name: selectedItem.item_name,
      description: selectedItem.description || "",
      unit_price: selectedItem.unit_price?.toString() || "",
      cost_price: selectedItem.cost_price?.toString() || "",
      current_stock: selectedItem.current_stock?.toString() || "0",
      low_stock_threshold: selectedItem.low_stock_threshold?.toString() || "5",
      enabled: selectedItem.enabled !== false,
      track_stock: selectedItem.track_stock !== false,
    });

    setShowItemActionsModal(false);
    setShowEditItemModal(true);
  };

  // Handle delete item
  const handleDeleteItem = () => {
    if (!selectedItem) return;

    Alert.alert(
      "Delete Item",
      `Are you sure you want to delete "${selectedItem.item_name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setShowItemActionsModal(false);
              await deleteItem(selectedItem.id);
              Alert.alert("Success", "Item deleted successfully");
              await loadData();
            } catch (error) {
              console.error("Error deleting item:", error);
              if (!handleApiError(error, signOut)) {
                Alert.alert("Error", "Failed to delete item");
              }
            }
          },
        },
      ]
    );
  };

  // Handle update item
  const handleUpdateItem = async () => {
    if (!selectedItem || !itemForm.item_name || !itemForm.shop) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      await updateItem(selectedItem.id, {
        item_name: itemForm.item_name,
        shop: itemForm.shop,
        description: itemForm.description,
        unit_price: parseFloat(itemForm.unit_price) || 0,
        cost_price: parseFloat(itemForm.cost_price) || 0,
        current_stock: parseInt(itemForm.current_stock) || 0,
        low_stock_threshold: parseInt(itemForm.low_stock_threshold) || 5,
        enabled: itemForm.enabled,
        track_stock: itemForm.track_stock ? 1 : 0,
      });

      Alert.alert("Success", "Item updated successfully");
      setShowEditItemModal(false);
      resetItemForm();
      setSelectedItem(null);
      await loadData();
    } catch (error) {
      console.error("Error updating item:", error);
      if (!handleApiError(error, signOut)) {
        Alert.alert("Error", "Failed to update item");
      }
    }
  };

  const toggleItemSelection = (item) => {
    const existingIndex = adjustmentItems.findIndex((ai) => ai.product_id === item.id);

    if (existingIndex >= 0) {
      // Item already selected, remove it
      setAdjustmentItems(adjustmentItems.filter((_, i) => i !== existingIndex));
    } else {
      // Add new item with default quantity
      setAdjustmentItems([
        ...adjustmentItems,
        {
          product_id: item.id,
          product_name: item.item_name,
          quantity: 1,
          current_stock: item.current_stock,
        },
      ]);
    }
  };

  const updateAdjustmentQuantity = (productId, newQuantity) => {
    setAdjustmentItems(
      adjustmentItems.map((ai) =>
        ai.product_id === productId ? { ...ai, quantity: parseInt(newQuantity) || 1 } : ai
      )
    );
  };

  const removeItemFromAdjustment = (productId) => {
    setAdjustmentItems(adjustmentItems.filter((ai) => ai.product_id !== productId));
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesShop = !selectedShop || item.shop === selectedShop;
    const matchesSearch = !searchQuery ||
      item.item_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const isItemEnabled = item.enabled !== false && item.enabled !== 0;
    const matchesStatus = enabledFilter === null || (enabledFilter ? isItemEnabled : !isItemEnabled);
    return matchesShop && matchesSearch && matchesStatus;
  });

  // Get items for selected shop (for stock adjustment)
  const shopItems = items.filter(item => item.shop === adjustmentShop);

  // Debug: Log shop items when shop is selected
  useEffect(() => {
    if (adjustmentShop) {
      console.log('🏪 Selected shop for adjustment:', adjustmentShop);
      console.log('📦 Total items loaded:', items.length);
      console.log('📦 Shop items found:', shopItems.length);
      if (items.length > 0) {
        console.log('📦 First item shop field:', items[0].shop);
      }
      if (shopItems.length > 0) {
        console.log('📦 First shop item:', JSON.stringify(shopItems[0], null, 2));
      }
    }
  }, [adjustmentShop, items, shopItems.length]);

  const totalInventoryValue = filteredItems.reduce((sum, item) => {
    // Only count enabled items (enabled !== false, defaults to true) in inventory value using buying price
    if (item.enabled === false) return sum;
    return sum + (item.cost_price || 0) * (item.current_stock || 0);
  }, 0);

  const lowStockItems = filteredItems.filter(
    item => item.current_stock <= (item.low_stock_threshold || 5)
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAFA", paddingTop: insets.top }}>
        <StatusBar style="dark" />

        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            backgroundColor: "#F7F7F7",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#171717", letterSpacing: 0 }}>
                Inventory
              </Text>
              <Text style={{ fontSize: 13, color: "#737373", marginTop: 4 }}>
                Products and stock
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setShowStockAdjustModal(true)}
                style={({ pressed }) => ({
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: pressed ? "#262626" : "#171717",
                  flexDirection: "row",
                  alignItems: "center",
                })}
              >
                <ArrowUpDown size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF", marginLeft: 6 }}>
                  Adjust
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShowAddItemModal(true)}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: pressed ? "#262626" : "#171717",
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Search Bar - Inside ScrollView */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#E5E5E5" }}>
              <Search size={18} color="#A3A3A3" strokeWidth={2} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search items..."
                placeholderTextColor="#A3A3A3"
                style={{ flex: 1, marginLeft: 10, fontSize: 15, color: "#171717" }}
              />
            </View>
          </View>
        {/* Stats Cards */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 10, padding: 16, borderWidth: 1, borderColor: "#E5E5E5" }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#737373", marginBottom: 4 }}>
                Inventory value
              </Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#171717", letterSpacing: 0 }}>
                {formatCurrency(totalInventoryValue, false)}
              </Text>
            </View>

            <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 10, padding: 16, borderWidth: 1, borderColor: "#E5E5E5" }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#737373", marginBottom: 4 }}>
                Low stock
              </Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#171717", letterSpacing: 0 }}>
                {lowStockItems.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Filter */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setEnabledFilter(null)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: enabledFilter === null ? "#171717" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: enabledFilter === null ? "#171717" : "#E5E7EB",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: enabledFilter === null ? "#FFFFFF" : "#737373" }}>
                  All items
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setEnabledFilter(true)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: enabledFilter === true ? "#171717" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: enabledFilter === true ? "#171717" : "#E5E7EB",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: enabledFilter === true ? "#FFFFFF" : "#737373" }}>
                  Enabled
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setEnabledFilter(false)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: enabledFilter === false ? "#171717" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: enabledFilter === false ? "#171717" : "#E5E7EB",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: enabledFilter === false ? "#FFFFFF" : "#737373" }}>
                  Disabled
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>

        {/* Shop Filter */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
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

        {/* Items List */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: 1 }}>
              Items ({filteredItems.length})
            </Text>
            <Pressable onPress={() => setShowHistoryModal(true)}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#404040" }}>
                View History
              </Text>
            </Pressable>
          </View>

          {loading && filteredItems.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <Text style={{ fontSize: 14, color: "#94A3B8" }}>Loading items...</Text>
            </View>
          ) : filteredItems.length === 0 ? (
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
              <Package size={48} color="#CBD5E1" strokeWidth={1.5} />
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#171717", marginTop: 16 }}>
                No items yet
              </Text>
              <Text style={{ fontSize: 14, color: "#64748B", textAlign: "center", marginTop: 8 }}>
                Start by adding your first product
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {filteredItems.map(item => {
                const isLowStock = item.current_stock <= (item.low_stock_threshold || 5);
                const stockColor = item.current_stock === 0 ? "#A3A3A3" : isLowStock ? "#D97706" : "#2563EB";

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleItemClick(item)}
                    style={({ pressed }) => ({
                      backgroundColor: "#FFFFFF",
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: "#F1F5F9",
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>
                          {item.item_name}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                        {/* Status Badge */}
                        <View
                          style={{
                            backgroundColor: (item.enabled !== false && item.enabled !== 0) ? "#EFF6FF" : "#FEE2E2",
                            borderWidth: 1,
                            borderColor: (item.enabled !== false && item.enabled !== 0) ? "#BFDBFE" : "#FCA5A5",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: "700", color: (item.enabled !== false && item.enabled !== 0) ? "#2563EB" : "#DC2626" }}>
                            {(item.enabled !== false && item.enabled !== 0) ? "Enabled" : "Disabled"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <View>
                        <Text style={{ fontSize: 13, color: "#64748B" }}>
                          {item.shop_name || item.shop}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: stockColor, marginTop: 2 }}>
                          {item.current_stock || 0} in stock
                        </Text>
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 12, color: "#64748B" }}>
                          Buy: {formatCurrency(item.cost_price || 0, false)} | Sell: {formatCurrency(item.unit_price || 0, false)}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#0F172A", marginTop: 2 }}>
                          Value: {formatCurrency((item.cost_price || 0) * (item.current_stock || 0), false)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <FormSheet
        visible={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        title="Add item"
        insets={insets}
        footer={<AppButton label="Save item" onPress={handleAddItem} />}
      >
        <Text style={{ fontSize: 13, fontWeight: "500", color: "#525252", marginBottom: 8 }}>Shop</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {shops.map((shop) => {
              const active = itemForm.shop === shop.id;
              return (
                <Pressable
                  key={shop.id}
                  onPress={() => setItemForm({ ...itemForm, shop: shop.id })}
                  style={{
                    minHeight: 34,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? "#2E69FF" : "#E2E2E2",
                    backgroundColor: active ? "#EAF0FF" : "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
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
        <FormField label="Item name" value={itemForm.item_name} onChangeText={(text) => setItemForm({ ...itemForm, item_name: text })} placeholder="Enter item name" />
        <FormField label="Description" value={itemForm.description} onChangeText={(text) => setItemForm({ ...itemForm, description: text })} placeholder="Additional details..." multiline />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FormField label="Buying price" value={itemForm.cost_price} onChangeText={(text) => setItemForm({ ...itemForm, cost_price: text })} placeholder="0.00" keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <FormField label="Selling price" value={itemForm.unit_price} onChangeText={(text) => setItemForm({ ...itemForm, unit_price: text })} placeholder="0.00" keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FormField label="Initial stock" value={itemForm.current_stock} onChangeText={(text) => setItemForm({ ...itemForm, current_stock: text })} placeholder="0" keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <FormField label="Low stock alert" value={itemForm.low_stock_threshold} onChangeText={(text) => setItemForm({ ...itemForm, low_stock_threshold: text })} placeholder="5" keyboardType="number-pad" />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => setItemForm({ ...itemForm, enabled: !itemForm.enabled })}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 14,
              paddingVertical: 14,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#E2E2E2",
              backgroundColor: "#FFFFFF",
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: itemForm.enabled ? "#3A3A3A" : "#B8B8B8",
                backgroundColor: itemForm.enabled ? "#242424" : "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {itemForm.enabled ? <Check size={12} color="#FFFFFF" strokeWidth={2.4} /> : null}
            </View>
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#242424" }}>Enabled</Text>
          </Pressable>

          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 14,
              paddingVertical: 14,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#E2E2E2",
              backgroundColor: "#FFFFFF",
            }}
          >
            <Pressable
              onPress={() => setItemForm({ ...itemForm, track_stock: !itemForm.track_stock })}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: itemForm.track_stock ? "#3A3A3A" : "#B8B8B8",
                  backgroundColor: itemForm.track_stock ? "#242424" : "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {itemForm.track_stock ? <Check size={12} color="#FFFFFF" strokeWidth={2.4} /> : null}
              </View>
              <Text style={{ fontSize: 14, fontWeight: "500", color: "#242424" }}>Track stock</Text>
            </Pressable>

            <Pressable
              onPress={() => Alert.alert("Track Stock", "Select if you want to manage stock of the item in the system.")}
              style={{ padding: 4 }}
            >
              <Info size={15} color="#707070" />
            </Pressable>
          </View>
        </View>
      </FormSheet>

      {/* Legacy Add Item Modal */}
      <Modal visible={false && showAddItemModal} transparent animationType="slide" onRequestClose={() => setShowAddItemModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%", paddingBottom: insets.bottom + 20 }}>
            {/* Header - Outside KeyboardAvoidingView */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#171717" }}>
                Add item
              </Text>
              <Pressable onPress={() => { setShowAddItemModal(false); resetItemForm(); }}>
                <X size={24} color="#64748B" strokeWidth={2} />
              </Pressable>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
            >
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ padding: 20, gap: 16, paddingBottom: 40 }}>
                  {/* Shop Selection */}
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B" }}>
                        Shop
                      </Text>
                      <Text style={{ fontSize: 12, color: "#EF4444", marginLeft: 4 }}>*</Text>
                      <Text style={{ fontSize: 11, color: "#EF4444", marginLeft: 2 }}>Required</Text>
                    </View>
                    {!itemForm.shop && (
                      <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 8, fontStyle: "italic" }}>
                        Please select a shop for this item
                      </Text>
                    )}
                    <View style={{ gap: 8 }}>
                      {shops.map(shop => (
                        <Pressable
                          key={shop.id}
                          onPress={() => setItemForm({ ...itemForm, shop: shop.id })}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 12,
                            borderRadius: 12,
                            borderWidth: 2,
                            borderColor: itemForm.shop === shop.id ? "#6366F1" : "#E2E8F0",
                            backgroundColor: itemForm.shop === shop.id ? "#EEF2FF" : "#FAFAFA",
                          }}
                        >
                          <Store size={18} color={itemForm.shop === shop.id ? "#6366F1" : "#94A3B8"} strokeWidth={2} />
                          <Text style={{ fontSize: 15, fontWeight: "600", color: itemForm.shop === shop.id ? "#6366F1" : "#64748B", marginLeft: 10 }}>
                            {shop.shop_name}
                          </Text>
                          {itemForm.shop === shop.id && (
                            <View style={{ marginLeft: "auto" }}>
                              <Check size={16} color="#6366F1" />
                            </View>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Item Name */}
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                      Item Name
                    </Text>
                    <TextInput
                      value={itemForm.item_name}
                      onChangeText={(text) => setItemForm({ ...itemForm, item_name: text })}
                      placeholder="Enter item name"
                      style={{
                        backgroundColor: "#F8FAFC",
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                        borderRadius: 12,
                        padding: 14,
                        fontSize: 15,
                        color: "#0F172A",
                      }}
                    />
                  </View>

                  {/* Description */}
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                      Description (Optional)
                    </Text>
                    <TextInput
                      value={itemForm.description}
                      onChangeText={(text) => setItemForm({ ...itemForm, description: text })}
                      placeholder="Additional details..."
                      style={{
                        backgroundColor: "#F8FAFC",
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                        borderRadius: 12,
                        padding: 14,
                        fontSize: 15,
                        color: "#0F172A",
                      }}
                      multiline
                      numberOfLines={2}
                    />
                  </View>

                  {/* Prices */}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                        Buying Price
                      </Text>
                      <TextInput
                        value={itemForm.cost_price}
                        onChangeText={(text) => setItemForm({ ...itemForm, cost_price: text })}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        style={{
                          backgroundColor: "#F8FAFC",
                          borderWidth: 1,
                          borderColor: "#E2E8F0",
                          borderRadius: 12,
                          padding: 14,
                          fontSize: 15,
                          color: "#0F172A",
                        }}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                        Selling Price
                      </Text>
                      <TextInput
                        value={itemForm.unit_price}
                        onChangeText={(text) => setItemForm({ ...itemForm, unit_price: text })}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        style={{
                          backgroundColor: "#F8FAFC",
                          borderWidth: 1,
                          borderColor: "#E2E8F0",
                          borderRadius: 12,
                          padding: 14,
                          fontSize: 15,
                          color: "#0F172A",
                        }}
                      />
                    </View>
                  </View>

                  {/* Stock */}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                        Initial Stock
                      </Text>
                      <TextInput
                        value={itemForm.current_stock}
                        onChangeText={(text) => setItemForm({ ...itemForm, current_stock: text })}
                        placeholder="0"
                        keyboardType="number-pad"
                        style={{
                          backgroundColor: "#F8FAFC",
                          borderWidth: 1,
                          borderColor: "#E2E8F0",
                          borderRadius: 12,
                          padding: 14,
                          fontSize: 15,
                          color: "#0F172A",
                        }}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                        Low Stock Alert
                      </Text>
                      <TextInput
                        value={itemForm.low_stock_threshold}
                        onChangeText={(text) => setItemForm({ ...itemForm, low_stock_threshold: text })}
                        placeholder="5"
                        keyboardType="number-pad"
                        style={{
                          backgroundColor: "#F8FAFC",
                          borderWidth: 1,
                          borderColor: "#E2E8F0",
                          borderRadius: 12,
                          padding: 14,
                          fontSize: 15,
                          color: "#0F172A",
                        }}
                      />
                    </View>
                  </View>

                  {/* Enabled Checkbox */}
                  <Pressable
                    onPress={() => setItemForm({ ...itemForm, enabled: !itemForm.enabled })}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      backgroundColor: "#F8FAFC",
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      borderRadius: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: itemForm.enabled ? "#2563EB" : "#E2E8F0",
                        backgroundColor: itemForm.enabled ? "#2563EB" : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      {itemForm.enabled && (
                        <Text style={{ fontSize: 14, fontWeight: "bold", color: "#FFFFFF" }}>✓</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#171717" }}>
                      Item is enabled
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>

              {/* Submit Button - Footer outside ScrollView but inside KeyboardAvoidingView */}
              <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
                <Pressable
                  onPress={handleAddItem}
                  style={({ pressed }) => ({
                    backgroundColor: "#171717",
                    borderRadius: 10,
                    paddingVertical: 16,
                    alignItems: "center",
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                    Save item
                  </Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      <FormSheet
        visible={showStockAdjustModal}
        onClose={() => {
          setShowStockAdjustModal(false);
          resetStockAdjustment();
        }}
        title="Stock adjustment"
        insets={insets}
        height="90%"
        footer={
          adjustmentShop && adjustmentItems.length > 0 ? (
            <AppButton label="Save adjustment" onPress={handleBulkStockAdjustment} />
          ) : null
        }
      >
        <Text style={{ fontSize: 13, fontWeight: "500", color: "#525252", marginBottom: 8 }}>Shop</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {shops.map((shop) => {
              const active = adjustmentShop === shop.id;
              return (
                <Pressable
                  key={shop.id}
                  onPress={() => setAdjustmentShop(shop.id)}
                  style={{
                    minHeight: 34,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? "#2E69FF" : "#E2E2E2",
                    backgroundColor: active ? "#EAF0FF" : "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
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
        <Text style={{ fontSize: 13, fontWeight: "500", color: "#525252", marginBottom: 8 }}>Adjustment type</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {["Adjust Stock", "Add Stock", "Remove Stock"].map((type) => {
            const active = adjustmentType === type;
            let borderColor = "#E2E2E2";
            let backgroundColor = "#FFFFFF";
            let textColor = "#525252";

            if (active) {
              if (type === "Adjust Stock") {
                borderColor = "#2E69FF";
                backgroundColor = "#EAF0FF";
                textColor = "#2E69FF";
              } else if (type === "Add Stock") {
                borderColor = "#1C7C45";
                backgroundColor = "#EAF7EF";
                textColor = "#1C7C45";
              } else if (type === "Remove Stock") {
                borderColor = "#C73A3A";
                backgroundColor = "#FDEEEE";
                textColor = "#C73A3A";
              }
            }

            return (
              <Pressable
                key={type}
                onPress={() => setAdjustmentType(type)}
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
                <Text style={{ fontSize: 13, fontWeight: "500", color: textColor }}>{type}</Text>
              </Pressable>
            );
          })}
        </View>
        <FormField label="Search items" value={itemSearchQuery} onChangeText={setItemSearchQuery} placeholder="Search items..." />
        <View style={{ maxHeight: 220, borderWidth: 1, borderColor: "#E2E2E2", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {shopItems
              .filter((product) =>
                itemSearchQuery ? product.item_name.toLowerCase().includes(itemSearchQuery.toLowerCase()) : true
              )
              .map((product) => {
                const isSelected = adjustmentItems.some((ai) => ai.product_id === product.id);
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
                      <Text style={{ fontSize: 12, color: "#707070", marginTop: 2 }}>Current stock: {product.current_stock}</Text>
                    </View>
                    {isSelected ? <Check size={14} color="#171717" strokeWidth={2.2} /> : null}
                  </Pressable>
                );
              })}
          </ScrollView>
        </View>
        {adjustmentItems.length > 0 ? (
          <View style={{ gap: 10 }}>
            {adjustmentItems.map((item) => (
              <View key={item.product_id} style={{ borderWidth: 1, borderColor: "#EDEDED", borderRadius: 8, padding: 12, backgroundColor: "#FFFFFF" }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: "#171717", flex: 1 }}>{item.product_name}</Text>
                  <Pressable onPress={() => removeItemFromAdjustment(item.product_id)} style={{ padding: 4 }}>
                    <X size={16} color="#707070" />
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Qty"
                      value={item.quantity.toString()}
                      onChangeText={(text) => updateAdjustmentQuantity(item.product_id, text)}
                      keyboardType="numeric"
                      selectTextOnFocus
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: 10 }}>
                    <Text style={{ fontSize: 12, color: "#707070", marginBottom: 4 }}>Current stock</Text>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: "#171717" }}>{item.current_stock}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </FormSheet>

      {/* Legacy Bulk Stock Adjustment Modal */}
      <Modal visible={false && showStockAdjustModal} transparent animationType="slide" onRequestClose={() => setShowStockAdjustModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%", paddingBottom: insets.bottom + 20 }}>
            {/* Header - Outside KeyboardAvoidingView */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#171717" }}>
                Stock adjustment
              </Text>
              <Pressable onPress={() => { setShowStockAdjustModal(false); resetStockAdjustment(); }}>
                <X size={24} color="#64748B" strokeWidth={2} />
              </Pressable>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
            >
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ padding: 20, gap: 20, paddingBottom: 40 }}>
                {/* Shop Selection */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                    Select Shop
                  </Text>
                  <View style={{ gap: 8 }}>
                    {shops.map(shop => (
                      <Pressable
                        key={shop.id}
                        onPress={() => setAdjustmentShop(shop.id)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 12,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: adjustmentShop === shop.id ? "#BFDBFE" : "#E5E7EB",
                          backgroundColor: adjustmentShop === shop.id ? "#EFF6FF" : "#FFFFFF",
                        }}
                      >
                        <Store size={18} color={adjustmentShop === shop.id ? "#2563EB" : "#64748B"} strokeWidth={2} />
                        <Text style={{ fontSize: 15, fontWeight: "600", color: adjustmentShop === shop.id ? "#2563EB" : "#171717", marginLeft: 10 }}>
                          {shop.shop_name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Adjustment Type */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                    Adjustment Type
                  </Text>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <Pressable
                      onPress={() => setAdjustmentType("Add Stock")}
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 14,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: adjustmentType === "Add Stock" ? "#BFDBFE" : "#E5E7EB",
                        backgroundColor: adjustmentType === "Add Stock" ? "#EFF6FF" : "#FFFFFF",
                      }}
                    >
                      <TrendingUp size={18} color={adjustmentType === "Add Stock" ? "#2563EB" : "#64748B"} strokeWidth={2} />
                      <Text style={{ fontSize: 15, fontWeight: "600", color: adjustmentType === "Add Stock" ? "#2563EB" : "#171717", marginLeft: 8 }}>
                        Add Stock
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setAdjustmentType("Remove Stock")}
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 14,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: adjustmentType === "Remove Stock" ? "#EF4444" : "#F1F5F9",
                        backgroundColor: adjustmentType === "Remove Stock" ? "#FEF2F2" : "#FFFFFF",
                      }}
                    >
                      <TrendingDown size={18} color={adjustmentType === "Remove Stock" ? "#EF4444" : "#64748B"} strokeWidth={2} />
                      <Text style={{ fontSize: 15, fontWeight: "600", color: adjustmentType === "Remove Stock" ? "#EF4444" : "#0F172A", marginLeft: 8 }}>
                        Remove Stock
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Select Items */}
                {adjustmentShop && (
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                      Select Items ({adjustmentItems.length} selected)
                    </Text>

                    {/* Search Bar */}
                    <TextInput
                      value={itemSearchQuery}
                      onChangeText={setItemSearchQuery}
                      placeholder="Search items..."
                      style={{
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
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
                      maxHeight: 220,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 8,
                      backgroundColor: "#FAFAFA",
                    }}>
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {shopItems
                          .filter((product) => {
                            const matchesSearch = itemSearchQuery
                              ? product.item_name.toLowerCase().includes(itemSearchQuery.toLowerCase())
                              : true;
                            return matchesSearch;
                          })
                          .map((product) => {
                            const isSelected = adjustmentItems.some((ai) => ai.product_id === product.id);
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
                                  borderBottomColor: "#E2E8F0",
                                  backgroundColor: isSelected ? "#EFF6FF" : "#fff",
                                }}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={{
                                    fontSize: 14,
                                    fontWeight: "600",
                                    color: "#171717",
                                  }}>
                                    {product.item_name}
                                  </Text>
                                  <Text style={{
                                    fontSize: 12,
                                    color: "#64748B",
                                    marginTop: 2,
                                  }}>
                                    Current stock: {product.current_stock}
                                  </Text>
                                </View>
                                {isSelected && (
                                  <View style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: "#2563EB",
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
                )}

                {/* Selected Items with Quantities */}
                {adjustmentItems.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                      Selected Items
                    </Text>
                    {adjustmentItems.map((item) => (
                      <View
                        key={item.product_id}
                        style={{
                          backgroundColor: "#FAFAFA",
                          borderRadius: 8,
                          padding: 12,
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
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
                            color: "#171717",
                            flex: 1,
                          }}>
                            {item.product_name}
                          </Text>
                          <Pressable
                            onPress={() => removeItemFromAdjustment(item.product_id)}
                            style={{ padding: 4 }}
                          >
                            <X size={16} color="#525252" />
                          </Pressable>
                        </View>
                        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{
                              fontSize: 12,
                              color: "#64748B",
                              marginBottom: 4,
                            }}>
                              Quantity
                            </Text>
                            <TextInput
                              value={item.quantity.toString()}
                              onChangeText={(text) => updateAdjustmentQuantity(item.product_id, text)}
                              keyboardType="numeric"
                              selectTextOnFocus={true}
                              style={{
                                borderWidth: 1,
                                borderColor: "#E2E8F0",
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
                              color: "#64748B",
                              marginBottom: 4,
                            }}>
                              Current Stock
                            </Text>
                            <Text style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#64748B",
                            }}>
                              {item.current_stock}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                </View>
              </ScrollView>

              {/* Submit Button - Footer outside ScrollView but inside KeyboardAvoidingView */}
              {adjustmentShop && adjustmentItems.length > 0 && (
                <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
                  <Pressable
                    onPress={handleBulkStockAdjustment}
                    style={({ pressed }) => ({
                      backgroundColor: "#171717",
                      borderRadius: 10,
                      paddingVertical: 16,
                      alignItems: "center",
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                      Save adjustment
                    </Text>
                  </Pressable>
                </View>
              )}
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* Stock History Modal */}
      <Modal visible={showHistoryModal} transparent animationType="slide" onRequestClose={() => setShowHistoryModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 20, maxHeight: "84%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#171717" }}>
                Stock history
              </Text>
              <Pressable onPress={() => setShowHistoryModal(false)}>
                <X size={24} color="#64748B" strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ padding: 20 }}>
                {stockHistory.length === 0 ? (
                  <View style={{ paddingVertical: 48, alignItems: "center" }}>
                    <Text style={{ fontSize: 14, color: "#94A3B8" }}>No stock transactions yet</Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {stockHistory.slice(0, 20).map(transaction => (
                      <View
                        key={transaction.id}
                        style={{
                          backgroundColor: "#FAFAFA",
                          borderRadius: 12,
                          padding: 14,
                          borderLeftWidth: 4,
                          borderLeftColor: transaction.purpose === "Add Stock" ? "#2563EB" : transaction.purpose === "Remove Stock" ? "#525252" : "#A3A3A3",
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: "#171717" }}>
                            {transaction.purpose}
                          </Text>
                          <Text style={{ fontSize: 12, color: "#64748B" }}>
                            {new Date(transaction.date).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, color: "#64748B" }}>
                          {transaction.shop_name || transaction.shop}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Item Actions Modal */}
      <Modal visible={showItemActionsModal} transparent animationType="fade" onRequestClose={() => setShowItemActionsModal(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}
          onPress={() => setShowItemActionsModal(false)}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 20,
              width: "80%",
              maxWidth: 300,
            }}
            onStartShouldSetResponder={() => true}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#171717", marginBottom: 16, textAlign: "center" }}>
              {selectedItem?.item_name}
            </Text>

            <Pressable
              onPress={handleEditItem}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderRadius: 12,
                backgroundColor: "#FAFAFA",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                marginBottom: 12,
              }}
            >
              <Edit3 size={20} color="#404040" strokeWidth={2} />
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#171717", marginLeft: 12 }}>
                Edit item
              </Text>
            </Pressable>

            <Pressable
              onPress={handleDeleteItem}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderRadius: 12,
                backgroundColor: "#FAFAFA",
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <Trash2 size={20} color="#525252" strokeWidth={2} />
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#171717", marginLeft: 12 }}>
                Delete item
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowItemActionsModal(false)}
              style={{
                padding: 16,
                marginTop: 12,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#64748B", textAlign: "center" }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <FormSheet
        visible={showEditItemModal}
        onClose={() => {
          setShowEditItemModal(false);
          resetItemForm();
          setSelectedItem(null);
        }}
        title="Edit item"
        insets={insets}
        footer={<AppButton label="Save changes" onPress={handleUpdateItem} />}
      >
        <Text style={{ fontSize: 13, fontWeight: "500", color: "#525252", marginBottom: 8 }}>Shop</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {shops.map((shop) => {
              const active = itemForm.shop === shop.id;
              return (
                <Pressable
                  key={shop.id}
                  onPress={() => setItemForm({ ...itemForm, shop: shop.id })}
                  style={{
                    minHeight: 34,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? "#2E69FF" : "#E2E2E2",
                    backgroundColor: active ? "#EAF0FF" : "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
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
        <FormField label="Item name" value={itemForm.item_name} onChangeText={(text) => setItemForm({ ...itemForm, item_name: text })} placeholder="Enter item name" />
        <FormField label="Description" value={itemForm.description} onChangeText={(text) => setItemForm({ ...itemForm, description: text })} placeholder="Additional details..." multiline />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FormField label="Buying price" value={itemForm.cost_price} onChangeText={(text) => setItemForm({ ...itemForm, cost_price: text })} placeholder="0.00" keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <FormField label="Selling price" value={itemForm.unit_price} onChangeText={(text) => setItemForm({ ...itemForm, unit_price: text })} placeholder="0.00" keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FormField label="Stock quantity" value={itemForm.current_stock} onChangeText={(text) => setItemForm({ ...itemForm, current_stock: text })} placeholder="0" keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <FormField label="Low stock alert" value={itemForm.low_stock_threshold} onChangeText={(text) => setItemForm({ ...itemForm, low_stock_threshold: text })} placeholder="5" keyboardType="number-pad" />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => setItemForm({ ...itemForm, enabled: !itemForm.enabled })}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 14,
              paddingVertical: 14,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#E2E2E2",
              backgroundColor: "#FFFFFF",
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: itemForm.enabled ? "#3A3A3A" : "#B8B8B8",
                backgroundColor: itemForm.enabled ? "#242424" : "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {itemForm.enabled ? <Check size={12} color="#FFFFFF" strokeWidth={2.4} /> : null}
            </View>
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#242424" }}>Enabled</Text>
          </Pressable>

          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 14,
              paddingVertical: 14,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#E2E2E2",
              backgroundColor: "#FFFFFF",
            }}
          >
            <Pressable
              onPress={() => setItemForm({ ...itemForm, track_stock: !itemForm.track_stock })}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: itemForm.track_stock ? "#3A3A3A" : "#B8B8B8",
                  backgroundColor: itemForm.track_stock ? "#242424" : "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {itemForm.track_stock ? <Check size={12} color="#FFFFFF" strokeWidth={2.4} /> : null}
              </View>
              <Text style={{ fontSize: 14, fontWeight: "500", color: "#242424" }}>Track stock</Text>
            </Pressable>

            <Pressable
              onPress={() => Alert.alert("Track Stock", "Select if you want to manage stock of the item in the system.")}
              style={{ padding: 4 }}
            >
              <Info size={15} color="#707070" />
            </Pressable>
          </View>
        </View>
      </FormSheet>

      {/* Legacy Edit Item Modal */}
      <Modal visible={false && showEditItemModal} transparent animationType="slide" onRequestClose={() => {setShowEditItemModal(false); resetItemForm();}}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%", paddingBottom: insets.bottom + 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#171717" }}>
                Edit item
              </Text>
              <Pressable onPress={() => { setShowEditItemModal(false); resetItemForm(); setSelectedItem(null); }}>
                <X size={24} color="#64748B" strokeWidth={2} />
              </Pressable>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
            >
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ padding: 20, gap: 16, paddingBottom: 40 }}>
                  {/* Shop Selection */}
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B" }}>
                        Shop
                      </Text>
                      <Text style={{ fontSize: 12, color: "#EF4444", marginLeft: 4 }}>*</Text>
                      <Text style={{ fontSize: 11, color: "#EF4444", marginLeft: 2 }}>Required</Text>
                    </View>
                    {!itemForm.shop && (
                      <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 8, fontStyle: "italic" }}>
                        Please select a shop for this item
                      </Text>
                    )}
                    <View style={{ gap: 8 }}>
                      {shops.map(shop => (
                        <Pressable
                          key={shop.id}
                          onPress={() => setItemForm({ ...itemForm, shop: shop.id })}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 12,
                            borderRadius: 12,
                            borderWidth: 2,
                            borderColor: itemForm.shop === shop.id ? "#BFDBFE" : "#E2E8F0",
                            backgroundColor: itemForm.shop === shop.id ? "#EFF6FF" : "#FAFAFA",
                          }}
                        >
                          <Store size={18} color={itemForm.shop === shop.id ? "#2563EB" : "#94A3B8"} strokeWidth={2} />
                          <Text style={{ fontSize: 15, fontWeight: "600", color: itemForm.shop === shop.id ? "#2563EB" : "#64748B", marginLeft: 10 }}>
                            {shop.shop_name}
                          </Text>
                          {itemForm.shop === shop.id && (
                            <View style={{ marginLeft: "auto" }}>
                              <Check size={16} color="#2563EB" />
                            </View>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Item Name */}
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                      Item Name
                    </Text>
                    <TextInput
                      value={itemForm.item_name}
                      onChangeText={(text) => setItemForm({ ...itemForm, item_name: text })}
                      placeholder="Enter item name"
                      style={{
                        backgroundColor: "#F8FAFC",
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                        borderRadius: 12,
                        padding: 14,
                        fontSize: 15,
                        color: "#0F172A",
                      }}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                      Description (Optional)
                    </Text>
                    <TextInput
                      value={itemForm.description}
                      onChangeText={(text) => setItemForm({ ...itemForm, description: text })}
                      placeholder="Additional details..."
                      style={{
                        backgroundColor: "#F8FAFC",
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                        borderRadius: 12,
                        padding: 14,
                        fontSize: 15,
                        color: "#0F172A",
                      }}
                      multiline
                      numberOfLines={2}
                    />
                  </View>

                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                        Buying Price
                      </Text>
                      <TextInput
                        value={itemForm.cost_price}
                        onChangeText={(text) => setItemForm({ ...itemForm, cost_price: text })}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        style={{
                          backgroundColor: "#F8FAFC",
                          borderWidth: 1,
                          borderColor: "#E2E8F0",
                          borderRadius: 12,
                          padding: 14,
                          fontSize: 15,
                          color: "#0F172A",
                        }}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                        Selling Price
                      </Text>
                      <TextInput
                        value={itemForm.unit_price}
                        onChangeText={(text) => setItemForm({ ...itemForm, unit_price: text })}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        style={{
                          backgroundColor: "#F8FAFC",
                          borderWidth: 1,
                          borderColor: "#E2E8F0",
                          borderRadius: 12,
                          padding: 14,
                          fontSize: 15,
                          color: "#0F172A",
                        }}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 4 }}>
                        Stock Quantity
                      </Text>
                      <Text style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6 }}>
                        Edit directly to set stock
                      </Text>
                      <TextInput
                        value={itemForm.current_stock}
                        onChangeText={(text) => setItemForm({ ...itemForm, current_stock: text })}
                        placeholder="0"
                        keyboardType="number-pad"
                        style={{
                          backgroundColor: "#F8FAFC",
                          borderWidth: 1,
                          borderColor: "#E2E8F0",
                          borderRadius: 12,
                          padding: 14,
                          fontSize: 15,
                          color: "#0F172A",
                        }}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                        Low Stock Alert
                      </Text>
                      <TextInput
                        value={itemForm.low_stock_threshold}
                        onChangeText={(text) => setItemForm({ ...itemForm, low_stock_threshold: text })}
                        placeholder="5"
                        keyboardType="number-pad"
                        style={{
                          backgroundColor: "#F8FAFC",
                          borderWidth: 1,
                          borderColor: "#E2E8F0",
                          borderRadius: 12,
                          padding: 14,
                          fontSize: 15,
                          color: "#0F172A",
                        }}
                      />
                    </View>
                  </View>

                  {/* Enabled Checkbox */}
                  <Pressable
                    onPress={() => setItemForm({ ...itemForm, enabled: !itemForm.enabled })}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      backgroundColor: "#F8FAFC",
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      borderRadius: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: itemForm.enabled ? "#2563EB" : "#E2E8F0",
                        backgroundColor: itemForm.enabled ? "#2563EB" : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      {itemForm.enabled && (
                        <Text style={{ fontSize: 14, fontWeight: "bold", color: "#FFFFFF" }}>✓</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#171717" }}>
                      Item is enabled
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>

              <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
                <Pressable
                  onPress={handleUpdateItem}
                  style={({ pressed }) => ({
                    backgroundColor: "#171717",
                    borderRadius: 10,
                    paddingVertical: 16,
                    alignItems: "center",
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                    Save changes
                  </Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
      {/* Slim Ad Banner */}
      <AdBanner variant="slim" context="items" />
      </View>
  );
}
