import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRequireAuth, useAuth, handleApiError } from "@/utils/auth/useAuth";
import { AdBanner } from "@/components/AdBanner";
import {
  AppButton,
  BottomSheet,
  Card,
  FormField,
  FormSheet,
  IconButton,
} from "@/components/frappe-ui";
import {
  Plus,
  ShoppingCart,
  DollarSign,
  Tag,
  Store,
  Edit3,
  Trash2,
  Check,
} from "lucide-react-native";
import { useState, useEffect, useCallback } from "react";
import {
  getPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
  getShops,
  checkSession,
} from "@/utils/frappeApi";
import { formatCurrency } from "@/utils/currency";
import { colors, spacing, type } from "@/theme/frappeTheme";

const CATEGORIES = [
  "Stock",
  "Utilities",
  "Rent",
  "Transport",
  "Other",
];

export default function PurchasesScreen() {
  useRequireAuth();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [purchases, setPurchases] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filters state
  const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month
  const [selectedShop, setSelectedShop] = useState(""); // Shop ID filter

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
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
      await checkSession();
      setLoading(true);
      const [purchasesRes, shopsRes] = await Promise.all([
        getPurchases(),
        getShops(),
      ]);

      setPurchases(purchasesRes?.purchases || []);
      setShops((shopsRes?.shops || []).filter((shop) => shop.enabled === 1));
    } catch (error) {
      console.error("Error loading purchases:", error);
      if (!handleApiError(error, signOut)) {
        Alert.alert("Error", "Failed to load purchases");
      }
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
      Alert.alert("Missing Fields", "Please select a shop and fill in description and amount.");
      return;
    }

    setSubmitting(true);
    try {
      await createPurchase(formData);
      Alert.alert("Success", "Purchase recorded successfully");
      setShowAddModal(false);
      resetForm();
      await loadPurchases();
    } catch (error) {
      console.error("Error creating purchase:", error);
      if (!handleApiError(error, signOut)) {
        Alert.alert("Error", "Failed to record purchase");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      shop: "",
      description: "",
      amount: "",
      category: "Stock",
    });
  };

  const handlePurchaseClick = (purchase) => {
    setSelectedPurchase(purchase);
    setShowActionsModal(true);
  };

  const handleEditPurchase = () => {
    if (!selectedPurchase) return;

    setFormData({
      date: selectedPurchase.date,
      shop: selectedPurchase.shop,
      description: selectedPurchase.description,
      amount: selectedPurchase.amount?.toString() || "",
      category: selectedPurchase.category || "Stock",
    });

    setShowActionsModal(false);
    setShowEditModal(true);
  };

  const handleDeletePurchase = () => {
    if (!selectedPurchase) return;

    Alert.alert(
      "Delete Purchase",
      `Are you sure you want to delete this purchase? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setShowActionsModal(false);
              await deletePurchase(selectedPurchase.id);
              Alert.alert("Success", "Purchase deleted successfully");
              await loadPurchases();
            } catch (error) {
              console.error("Error deleting purchase:", error);
              if (!handleApiError(error, signOut)) {
                Alert.alert("Error", "Failed to delete purchase");
              }
            }
          },
        },
      ]
    );
  };

  const handleUpdatePurchase = async () => {
    if (!selectedPurchase || !formData.shop || !formData.amount || !formData.description) {
      Alert.alert("Missing Fields", "Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      await updatePurchase(selectedPurchase.id, formData);
      Alert.alert("Success", "Purchase updated successfully");
      setShowEditModal(false);
      resetForm();
      setSelectedPurchase(null);
      await loadPurchases();
    } catch (error) {
      console.error("Error updating purchase:", error);
      if (!handleApiError(error, signOut)) {
        Alert.alert("Error", "Failed to update purchase");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryColor = (category) => {
    const colorsMap = {
      Stock: colors.green || "#10B981",
      Utilities: colors.amber || "#F59E0B",
      Rent: colors.red || "#EF4444",
      Transport: "#F97316",
      Other: "#64748B",
    };
    return colorsMap[category] || "#64748B";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Filter purchases by date, shop, and search query
  const filteredPurchases = purchases.filter((purchase) => {
    // Shop filtering
    if (selectedShop && purchase.shop !== selectedShop) {
      return false;
    }

    // Date filtering
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const purchaseDate = new Date(purchase.date || purchase.created_at);

      if (dateFilter === "today") {
        const purchaseDateOnly = new Date(
          purchaseDate.getFullYear(),
          purchaseDate.getMonth(),
          purchaseDate.getDate()
        );
        if (purchaseDateOnly.getTime() !== today.getTime()) return false;
      } else if (dateFilter === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        if (purchaseDate < weekAgo) return false;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        if (purchaseDate < monthAgo) return false;
      }
    }

    // Search query filtering
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      (purchase.description && purchase.description.toLowerCase().includes(query)) ||
      (purchase.shop && purchase.shop.toLowerCase().includes(query)) ||
      (purchase.category && purchase.category.toLowerCase().includes(query)) ||
      (purchase.id && purchase.id.toString().includes(query))
    );
  });

  const totalExpenses = filteredPurchases.reduce(
    (sum, p) => sum + parseFloat(p.amount || 0),
    0
  );

  const filters = [
    { label: "All time", value: "all" },
    { label: "Today", value: "today" },
    { label: "7 days", value: "week" },
    { label: "30 days", value: "month" },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
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
            <Text
              style={{ fontSize: 24, fontWeight: "700", color: "#171717" }}
            >
              Expenses
            </Text>
            <Text style={{ fontSize: 14, color: "#737373", marginTop: 4 }}>
              Track and manage business costs
            </Text>
          </View>

          <Pressable
            onPress={() => setShowAddModal(true)}
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
              New Expense
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
              placeholder="Search expenses by description, shop, or category..."
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
                    Total Expenses
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 20, fontWeight: "700", color: "#171717" }}
                >
                  {formatCurrency(totalExpenses, false)}
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
                    Transactions
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 20, fontWeight: "700", color: "#171717" }}
                >
                  {filteredPurchases.length}
                </Text>
              </View>
            </View>
          </View>

          {/* Expenses List */}
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
                Recent expenses
              </Text>
            </View>

            {/* Date Filter */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              {filters.map((filter) => (
                <Pressable
                  key={filter.value}
                  onPress={() => setDateFilter(filter.value)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor:
                      dateFilter === filter.value ? "#171717" : "#FFFFFF",
                    borderWidth: 1,
                    borderColor:
                      dateFilter === filter.value ? "#171717" : "#E5E7EB",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: dateFilter === filter.value ? "#fff" : "#737373",
                    }}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Shop Filter */}
            <View style={{ marginBottom: 16 }}>
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
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: !selectedShop ? "#FFFFFF" : "#737373",
                      }}
                    >
                      All shops
                    </Text>
                  </Pressable>
                  {shops.map((shop) => (
                    <Pressable
                      key={shop.id}
                      onPress={() => setSelectedShop(shop.id)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor:
                          selectedShop === shop.id ? "#171717" : "#FFFFFF",
                        borderWidth: 1,
                        borderColor:
                          selectedShop === shop.id ? "#171717" : "#E5E7EB",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: selectedShop === shop.id ? "#FFFFFF" : "#737373",
                        }}
                      >
                        {shop.shop_name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {loading && purchases.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <ActivityIndicator size="large" color={colors.inkGray6} />
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.inkGray5,
                    marginTop: spacing.md,
                  }}
                >
                  Loading expenses...
                </Text>
              </View>
            ) : filteredPurchases.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 10,
                  padding: 32,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#E5E5E5",
                }}
              >
                <ShoppingCart size={48} color="#CBD5E1" strokeWidth={1.5} />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#171717",
                    marginTop: 16,
                  }}
                >
                  {searchQuery ? "No matching expenses" : "No expenses yet"}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#737373",
                    textAlign: "center",
                    marginTop: 8,
                  }}
                >
                  {searchQuery
                    ? "Try adjusting your filters"
                    : "Start tracking your business expenses"}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {filteredPurchases.map((purchase) => (
                  <Pressable
                    key={purchase.id}
                    onPress={() => handlePurchaseClick(purchase)}
                    style={({ pressed }) => ({
                      backgroundColor: "#FFFFFF",
                      borderRadius: 10,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: "#E5E5E5",
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
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            backgroundColor:
                              getCategoryColor(purchase.category) + "15",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 8,
                          }}
                        >
                          <Tag
                            size={14}
                            color={getCategoryColor(purchase.category)}
                            strokeWidth={2}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#171717",
                            }}
                          >
                            {purchase.description}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#737373",
                              marginTop: 1,
                            }}
                          >
                            {purchase.shop_name || purchase.shop}
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
                                {formatDate(purchase.date)}
                              </Text>
                            </View>

                            <View
                              style={{
                                backgroundColor:
                                  getCategoryColor(purchase.category) + "15",
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                                marginRight: 6,
                                marginBottom: 2,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "600",
                                  color: getCategoryColor(purchase.category),
                                }}
                              >
                                {purchase.category}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: colors.red,
                          }}
                        >
                          -{formatCurrency(purchase.amount, false)}
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
        <FormSheet
          visible={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            resetForm();
          }}
          title="Record expense"
          insets={insets}
          height="90%"
          footer={
            <AppButton
              label={submitting ? "Saving..." : "Record expense"}
              onPress={handleAddPurchase}
              disabled={submitting}
            />
          }
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: "#525252",
              marginBottom: 8,
            }}
          >
            Shop
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
          >
            <View style={{ flexDirection: "row", gap: 8 }}>
              {shops.map((shop) => {
                const active = formData.shop === shop.id.toString();
                return (
                  <Pressable
                    key={shop.id}
                    onPress={() =>
                      setFormData({ ...formData, shop: shop.id.toString() })
                    }
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
                    <Text
                      style={{
                        fontSize: 13,
                        color: active ? "#2E69FF" : "#525252",
                        fontWeight: "500",
                      }}
                    >
                      {shop.shop_name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: "#525252",
              marginBottom: 8,
            }}
          >
            Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
          >
            <View style={{ flexDirection: "row", gap: 8 }}>
              {CATEGORIES.map((category) => {
                const active = formData.category === category;
                const catColor = getCategoryColor(category);
                return (
                  <Pressable
                    key={category}
                    onPress={() => setFormData({ ...formData, category })}
                    style={{
                      minHeight: 32,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? catColor : "#E2E2E2",
                      backgroundColor: active ? catColor + "15" : "#FFFFFF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: active ? catColor : "#525252",
                        fontWeight: "500",
                      }}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <FormField
            label="Description"
            value={formData.description}
            onChangeText={(text) =>
              setFormData({ ...formData, description: text })
            }
            placeholder="What was purchased?"
          />

          <FormField
            label="Amount"
            value={formData.amount}
            onChangeText={(text) => setFormData({ ...formData, amount: text })}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <FormField
            label="Date"
            value={formData.date}
            onChangeText={(text) => setFormData({ ...formData, date: text })}
            placeholder="YYYY-MM-DD"
          />
        </FormSheet>

        {/* Purchase Actions Modal */}
        <BottomSheet
          visible={showActionsModal}
          onClose={() => setShowActionsModal(false)}
          title="Expense Options"
        >
          <View style={{ padding: spacing.xl, gap: spacing.md }}>
            <AppButton
              label="Edit purchase"
              onPress={handleEditPurchase}
              variant="outline"
            />
            <AppButton
              label="Delete purchase"
              onPress={handleDeletePurchase}
              variant="solid"
              theme="red"
            />
          </View>
        </BottomSheet>

        {/* Edit Purchase Modal */}
        <FormSheet
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            resetForm();
            setSelectedPurchase(null);
          }}
          title="Edit expense"
          insets={insets}
          height="90%"
          footer={
            <AppButton
              label={submitting ? "Saving..." : "Save changes"}
              onPress={handleUpdatePurchase}
              disabled={submitting}
            />
          }
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: "#525252",
              marginBottom: 8,
            }}
          >
            Shop
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
          >
            <View style={{ flexDirection: "row", gap: 8 }}>
              {shops.map((shop) => {
                const active = formData.shop === shop.id.toString();
                return (
                  <Pressable
                    key={shop.id}
                    onPress={() =>
                      setFormData({ ...formData, shop: shop.id.toString() })
                    }
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
                    <Text
                      style={{
                        fontSize: 13,
                        color: active ? "#2E69FF" : "#525252",
                        fontWeight: "500",
                      }}
                    >
                      {shop.shop_name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: "#525252",
              marginBottom: 8,
            }}
          >
            Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
          >
            <View style={{ flexDirection: "row", gap: 8 }}>
              {CATEGORIES.map((category) => {
                const active = formData.category === category;
                const catColor = getCategoryColor(category);
                return (
                  <Pressable
                    key={category}
                    onPress={() => setFormData({ ...formData, category })}
                    style={{
                      minHeight: 32,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? catColor : "#E2E2E2",
                      backgroundColor: active ? catColor + "15" : "#FFFFFF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: active ? catColor : "#525252",
                        fontWeight: "500",
                      }}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <FormField
            label="Description"
            value={formData.description}
            onChangeText={(text) =>
              setFormData({ ...formData, description: text })
            }
            placeholder="What was purchased?"
          />

          <FormField
            label="Amount"
            value={formData.amount}
            onChangeText={(text) => setFormData({ ...formData, amount: text })}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <FormField
            label="Date"
            value={formData.date}
            onChangeText={(text) => setFormData({ ...formData, date: text })}
            placeholder="YYYY-MM-DD"
          />
        </FormSheet>
        <AdBanner variant="slim" context="sales" />
      </View>
    </KeyboardAvoidingView>
  );
}
