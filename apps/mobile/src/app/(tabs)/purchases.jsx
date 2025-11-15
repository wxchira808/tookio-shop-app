import { View, Text, ScrollView, Pressable, Modal, TextInput, Alert, RefreshControl, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRequireAuth } from "@/utils/auth/useAuth";
import {
  Plus,
  X,
  ShoppingCart,
  Calendar,
  DollarSign,
  FileText,
  Tag,
  Store,
  ChevronRight,
} from "lucide-react-native";
import { useState, useEffect } from "react";
import { getPurchases, createPurchase, getShops } from "@/utils/frappeApi";
import { formatCurrency } from "@/utils/currency";

const CATEGORIES = [
  "Stock",
  "Utilities",
  "Rent",
  "Transport",
  "Other",
];

export default function PurchasesScreen() {
  useRequireAuth();
  const insets = useSafeAreaInsets();

  const [purchases, setPurchases] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shop: "",
    description: "",
    amount: "",
    category: "Stock",
  });

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const [purchasesRes, shopsRes] = await Promise.all([
        getPurchases(),
        getShops(),
      ]);

      setPurchases(purchasesRes?.purchases || []);
      setShops(shopsRes?.shops || []);
    } catch (error) {
      console.error("Error loading purchases:", error);
      Alert.alert("Error", "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPurchases();
    setRefreshing(false);
  };

  const handleAddPurchase = async () => {
    if (!formData.shop || !formData.amount || !formData.description) {
      Alert.alert("Missing Fields", "Please fill in shop, description, and amount");
      return;
    }

    try {
      await createPurchase(formData);
      Alert.alert("Success", "Purchase recorded successfully");
      setShowAddModal(false);
      resetForm();
      await loadPurchases();
    } catch (error) {
      console.error("Error creating purchase:", error);
      Alert.alert("Error", "Failed to record purchase");
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      shop: "",
      description: "",
      amount: "",
      category: "Stock",
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      "Stock": "#10B981",
      "Utilities": "#F59E0B",
      "Rent": "#EF4444",
      "Transport": "#F97316",
      "Other": "#64748B",
    };
    return colors[category] || "#64748B";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalExpenses = purchases.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

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
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 }}>
              Purchases
            </Text>
            <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
              Track expenses and purchases
            </Text>
          </View>

          <Pressable
            onPress={() => setShowAddModal(true)}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: pressed ? "#5B21B6" : "#6366F1",
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Total Expenses Card */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
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
                  backgroundColor: "#FEF2F2",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <DollarSign size={20} color="#EF4444" strokeWidth={2.5} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Total Expenses
              </Text>
            </View>
            <Text style={{ fontSize: 32, fontWeight: "800", color: "#0F172A", letterSpacing: -1 }}>
              {formatCurrency(totalExpenses, false)}
            </Text>
            <Text style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
              {purchases.length} transaction{purchases.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Purchases List */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
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
            Recent Purchases
          </Text>

          {loading && purchases.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <Text style={{ fontSize: 14, color: "#94A3B8" }}>Loading purchases...</Text>
            </View>
          ) : purchases.length === 0 ? (
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
              <ShoppingCart size={48} color="#CBD5E1" strokeWidth={1.5} />
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#0F172A", marginTop: 16 }}>
                No Purchases Yet
              </Text>
              <Text style={{ fontSize: 14, color: "#64748B", textAlign: "center", marginTop: 8 }}>
                Start tracking your business expenses
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {purchases.map((purchase) => (
                <Pressable
                  key={purchase.id}
                  onPress={() => setSelectedPurchase(purchase)}
                  style={({ pressed }) => ({
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: "#F1F5F9",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: getCategoryColor(purchase.category) + "15",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 14,
                      }}
                    >
                      <Tag size={20} color={getCategoryColor(purchase.category)} strokeWidth={2} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A", marginBottom: 4 }}>
                        {purchase.description}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <View
                          style={{
                            backgroundColor: getCategoryColor(purchase.category) + "20",
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: "600", color: getCategoryColor(purchase.category) }}>
                            {purchase.category}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, color: "#64748B" }}>
                          {purchase.shop_name || purchase.shop}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                        {formatDate(purchase.date)}
                      </Text>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: "#EF4444", letterSpacing: -0.5 }}>
                        {formatCurrency(purchase.amount, false)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Purchase Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom, maxHeight: "90%" }}>
              {/* Header */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>
                  Record Purchase
                </Text>
                <Pressable onPress={() => { setShowAddModal(false); resetForm(); }} style={{ padding: 4 }}>
                  <X size={24} color="#64748B" strokeWidth={2} />
                </Pressable>
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ padding: 20, gap: 20 }}>
                {/* Shop Selection */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                    Shop
                  </Text>
                  <View style={{ gap: 8 }}>
                    {shops.map((shop) => (
                      <Pressable
                        key={shop.id}
                        onPress={() => setFormData({ ...formData, shop: shop.id })}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 12,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: formData.shop === shop.id ? "#6366F1" : "#F1F5F9",
                          backgroundColor: formData.shop === shop.id ? "#EEF2FF" : "#FFFFFF",
                        }}
                      >
                        <Store size={18} color={formData.shop === shop.id ? "#6366F1" : "#64748B"} strokeWidth={2} />
                        <Text style={{ fontSize: 15, fontWeight: "600", color: formData.shop === shop.id ? "#6366F1" : "#0F172A", marginLeft: 10 }}>
                          {shop.shop_name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Category Selection */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                    Category
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {CATEGORIES.map((category) => (
                      <Pressable
                        key={category}
                        onPress={() => setFormData({ ...formData, category })}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 20,
                          borderWidth: 2,
                          borderColor: formData.category === category ? getCategoryColor(category) : "#F1F5F9",
                          backgroundColor: formData.category === category ? getCategoryColor(category) + "15" : "#FFFFFF",
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "600", color: formData.category === category ? getCategoryColor(category) : "#64748B" }}>
                          {category}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Description */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                    Description
                  </Text>
                  <TextInput
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    placeholder="What was purchased?"
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
                    numberOfLines={3}
                  />
                </View>

                {/* Amount */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                    Amount
                  </Text>
                  <TextInput
                    value={formData.amount}
                    onChangeText={(text) => setFormData({ ...formData, amount: text })}
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

                {/* Date */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 }}>
                    Date
                  </Text>
                  <TextInput
                    value={formData.date}
                    onChangeText={(text) => setFormData({ ...formData, date: text })}
                    placeholder="YYYY-MM-DD"
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

                {/* Submit Button */}
                <Pressable
                  onPress={handleAddPurchase}
                  style={({ pressed }) => ({
                    backgroundColor: "#6366F1",
                    borderRadius: 12,
                    paddingVertical: 16,
                    alignItems: "center",
                    marginTop: 8,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                    Record Purchase
                  </Text>
                </Pressable>
              </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Purchase Details Modal */}
      <Modal visible={!!selectedPurchase} transparent animationType="fade" onRequestClose={() => setSelectedPurchase(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, overflow: "hidden" }}>
            {/* Header */}
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A", flex: 1 }}>
                  Purchase Details
                </Text>
                <Pressable onPress={() => setSelectedPurchase(null)} style={{ padding: 4 }}>
                  <X size={24} color="#64748B" strokeWidth={2} />
                </Pressable>
              </View>
            </View>

            {/* Content */}
            {selectedPurchase && (
              <View style={{ padding: 20, gap: 16 }}>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 4 }}>
                    DESCRIPTION
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#0F172A" }}>
                    {selectedPurchase.description}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 4 }}>
                      AMOUNT
                    </Text>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: "#EF4444", letterSpacing: -0.5 }}>
                      {formatCurrency(selectedPurchase.amount, false)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 4 }}>
                      CATEGORY
                    </Text>
                    <View
                      style={{
                        backgroundColor: getCategoryColor(selectedPurchase.category) + "20",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        alignSelf: "flex-start",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: getCategoryColor(selectedPurchase.category) }}>
                        {selectedPurchase.category}
                      </Text>
                    </View>
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 4 }}>
                    SHOP
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#0F172A" }}>
                    {selectedPurchase.shop_name || selectedPurchase.shop}
                  </Text>
                </View>

                <View>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 4 }}>
                    DATE
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#0F172A" }}>
                    {formatDate(selectedPurchase.date)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
