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
import { useRequireAuth } from "@/utils/auth/useAuth";
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
} from "lucide-react-native";
import { useState, useEffect } from "react";
import {
  getItems,
  createItem,
  getShops,
  createBulkStockAdjustment,
  getStockTransactions,
} from "@/utils/frappeApi";
import { formatCurrency } from "@/utils/currency";

export default function InventoryScreen() {
  useRequireAuth();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState([]);
  const [shops, setShops] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showStockAdjustModal, setShowStockAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemSearchQuery, setItemSearchQuery] = useState("");

  // Add Item Form
  const [itemForm, setItemForm] = useState({
    shop: "",
    item_name: "",
    description: "",
    unit_price: "",
    cost_price: "",
    current_stock: "0",
    low_stock_threshold: "5",
  });

  // Stock Adjustment
  const [adjustmentShop, setAdjustmentShop] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("Add Stock"); // Add Stock or Remove Stock
  const [adjustmentItems, setAdjustmentItems] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, shopsRes, stockRes] = await Promise.all([
        getItems(),
        getShops(),
        getStockTransactions(),
      ]);

      setItems(itemsRes?.items || []);
      setShops(shopsRes?.shops || []);
      setStockHistory(stockRes?.transactions || []);

      // Don't auto-select a shop - show all items by default
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load inventory data");
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
      });

      Alert.alert("Success", "Item added successfully");
      setShowAddItemModal(false);
      resetItemForm();
      await loadData();
    } catch (error) {
      console.error("Error creating item:", error);
      Alert.alert("Error", "Failed to create item");
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

    try {
      await createBulkStockAdjustment({
        shop: adjustmentShop,
        purpose: adjustmentType,
        items: itemsWithQty.map(item => ({
          product: item.product_id,
          quantity: item.quantity,
        })),
      });

      Alert.alert("Success", `Stock ${adjustmentType === "Add Stock" ? "added" : "removed"} successfully`);
      setShowStockAdjustModal(false);
      resetStockAdjustment();
      await loadData();
    } catch (error) {
      console.error("Error adjusting stock:", error);
      Alert.alert("Error", "Failed to adjust stock");
    }
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
    });
  };

  const resetStockAdjustment = () => {
    setAdjustmentShop("");
    setAdjustmentType("Add Stock");
    setAdjustmentItems([]);
    setItemSearchQuery("");
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
    return matchesShop && matchesSearch;
  });

  // Get items for selected shop (for stock adjustment)
  const shopItems = items.filter(item => item.shop === adjustmentShop);

  const totalInventoryValue = filteredItems.reduce((sum, item) => {
    return sum + (item.unit_price || 0) * (item.current_stock || 0);
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
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#F1F5F9",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 }}>
              Inventory
            </Text>
            <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
              Items & Stock Management
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => setShowStockAdjustModal(true)}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: pressed ? "#5B21B6" : "#6366F1",
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
                borderRadius: 20,
                backgroundColor: pressed ? "#059669" : "#10B981",
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Search size={18} color="#94A3B8" strokeWidth={2} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search items..."
            placeholderTextColor="#94A3B8"
            style={{ flex: 1, marginLeft: 10, fontSize: 15, color: "#0F172A" }}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Cards */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#F1F5F9" }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B", marginBottom: 4 }}>
                TOTAL VALUE
              </Text>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 }}>
                {formatCurrency(totalInventoryValue, false)}
              </Text>
            </View>

            <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#F1F5F9" }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B", marginBottom: 4 }}>
                LOW STOCK
              </Text>
              <Text style={{ fontSize: 20, fontWeight: "800", color: lowStockItems.length > 0 ? "#EF4444" : "#0F172A", letterSpacing: -0.5 }}>
                {lowStockItems.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Shop Filter */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setSelectedShop("")}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: !selectedShop ? "#0F172A" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: !selectedShop ? "#0F172A" : "#E2E8F0",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: !selectedShop ? "#FFFFFF" : "#64748B" }}>
                  All Shops
                </Text>
              </Pressable>

              {shops.map(shop => (
                <Pressable
                  key={shop.id}
                  onPress={() => setSelectedShop(shop.id)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: selectedShop === shop.id ? "#0F172A" : "#FFFFFF",
                    borderWidth: 1,
                    borderColor: selectedShop === shop.id ? "#0F172A" : "#E2E8F0",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: selectedShop === shop.id ? "#FFFFFF" : "#64748B" }}>
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
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#6366F1" }}>
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
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#0F172A", marginTop: 16 }}>
                No Items Yet
              </Text>
              <Text style={{ fontSize: 14, color: "#64748B", textAlign: "center", marginTop: 8 }}>
                Start by adding your first product
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {filteredItems.map(item => {
                const isLowStock = item.current_stock <= (item.low_stock_threshold || 5);
                const stockColor = item.current_stock === 0 ? "#EF4444" : isLowStock ? "#F59E0B" : "#10B981";

                return (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: "#F1F5F9",
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A", flex: 1 }}>
                        {item.item_name}
                      </Text>
                      <View
                        style={{
                          backgroundColor: stockColor + "15",
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "700", color: stockColor }}>
                          {item.current_stock || 0} in stock
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View>
                        <Text style={{ fontSize: 13, color: "#64748B" }}>
                          {item.shop_name || item.shop}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#0F172A", marginTop: 2 }}>
                          {formatCurrency(item.unit_price || 0, false)}
                        </Text>
                      </View>

                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B" }}>
                        Value: {formatCurrency((item.unit_price || 0) * (item.current_stock || 0), false)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={showAddItemModal} transparent animationType="slide" onRequestClose={() => setShowAddItemModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, height: "90%", paddingBottom: insets.bottom }}>
            {/* Header - Outside KeyboardAvoidingView */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>
                Add New Item
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
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                      Shop
                    </Text>
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
                            borderColor: itemForm.shop === shop.id ? "#6366F1" : "#F1F5F9",
                            backgroundColor: itemForm.shop === shop.id ? "#EEF2FF" : "#FFFFFF",
                          }}
                        >
                          <Store size={18} color={itemForm.shop === shop.id ? "#6366F1" : "#64748B"} strokeWidth={2} />
                          <Text style={{ fontSize: 15, fontWeight: "600", color: itemForm.shop === shop.id ? "#6366F1" : "#0F172A", marginLeft: 10 }}>
                            {shop.shop_name}
                          </Text>
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
                      placeholder="e.g., Coca Cola 500ml"
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

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                        Cost Price
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
                </View>
              </ScrollView>

              {/* Submit Button - Footer outside ScrollView but inside KeyboardAvoidingView */}
              <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
                <Pressable
                  onPress={handleAddItem}
                  style={({ pressed }) => ({
                    backgroundColor: "#10B981",
                    borderRadius: 12,
                    paddingVertical: 16,
                    alignItems: "center",
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                    Add Item
                  </Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* Bulk Stock Adjustment Modal */}
      <Modal visible={showStockAdjustModal} transparent animationType="slide" onRequestClose={() => setShowStockAdjustModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, height: "90%", paddingBottom: insets.bottom }}>
            {/* Header - Outside KeyboardAvoidingView */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>
                Bulk Stock Adjustment
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
                          borderColor: adjustmentShop === shop.id ? "#6366F1" : "#F1F5F9",
                          backgroundColor: adjustmentShop === shop.id ? "#EEF2FF" : "#FFFFFF",
                        }}
                      >
                        <Store size={18} color={adjustmentShop === shop.id ? "#6366F1" : "#64748B"} strokeWidth={2} />
                        <Text style={{ fontSize: 15, fontWeight: "600", color: adjustmentShop === shop.id ? "#6366F1" : "#0F172A", marginLeft: 10 }}>
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
                        borderColor: adjustmentType === "Add Stock" ? "#10B981" : "#F1F5F9",
                        backgroundColor: adjustmentType === "Add Stock" ? "#ECFDF5" : "#FFFFFF",
                      }}
                    >
                      <TrendingUp size={18} color={adjustmentType === "Add Stock" ? "#10B981" : "#64748B"} strokeWidth={2} />
                      <Text style={{ fontSize: 15, fontWeight: "600", color: adjustmentType === "Add Stock" ? "#10B981" : "#0F172A", marginLeft: 8 }}>
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
                      maxHeight: 200,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      borderRadius: 8,
                      backgroundColor: "#FAFAFA",
                    }}>
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
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
                                  backgroundColor: isSelected ? "#EEF2FF" : "#fff",
                                }}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={{
                                    fontSize: 14,
                                    fontWeight: "600",
                                    color: "#0F172A",
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
                                    backgroundColor: "#6366F1",
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
                          backgroundColor: "#F8FAFC",
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
                            color: "#0F172A",
                            flex: 1,
                          }}>
                            {item.product_name}
                          </Text>
                          <Pressable
                            onPress={() => removeItemFromAdjustment(item.product_id)}
                            style={{ padding: 4 }}
                          >
                            <X size={16} color="#EF4444" />
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
                      backgroundColor: adjustmentType === "Add Stock" ? "#10B981" : "#EF4444",
                      borderRadius: 12,
                      paddingVertical: 16,
                      alignItems: "center",
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                      {adjustmentType === "Add Stock" ? "Add Stock" : "Remove Stock"}
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
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom, maxHeight: "80%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>
                Stock History
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
                          backgroundColor: "#F8FAFC",
                          borderRadius: 12,
                          padding: 14,
                          borderLeftWidth: 4,
                          borderLeftColor: transaction.purpose === "Add Stock" ? "#10B981" : transaction.purpose === "Remove Stock" ? "#EF4444" : "#6366F1",
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>
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
    </View>
  );
}
