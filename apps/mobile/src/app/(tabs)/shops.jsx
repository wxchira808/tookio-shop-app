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
  Store,
  Plus,
  ChevronRight,
  X,
  Edit,
  Trash2,
  Check,
} from "lucide-react-native";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import {
  getShops,
  createShop,
  updateShop,
  deleteShop,
  getItems,
} from "@/utils/frappeApi";
import {
  getActiveShop,
  setActiveShop as saveActiveShop,
} from "@/utils/storage";
import { formatCurrency } from "@/utils/currency";

export default function Shops() {
  useRequireAuth();
  const insets = useSafeAreaInsets();

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [activeShopId, setActiveShopId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState(null);
  const [shopItems, setShopItems] = useState([]);

  // Form states
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shopsRes, activeId] = await Promise.all([
        getShops(),
        getActiveShop(),
      ]);

      if (shopsRes && shopsRes.shops) {
        setShops(shopsRes.shops);
        // If no active shop set but shops exist, set the first one as active
        if (!activeId && shopsRes.shops.length > 0) {
          const firstShopId = shopsRes.shops[0].id;
          setActiveShopId(firstShopId);
          await saveActiveShop(firstShopId);
        } else {
          setActiveShopId(activeId);
        }
      }
    } catch (error) {
      console.error("Error loading shops:", error);
      Alert.alert("Error", "Failed to load shops. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddShop = async () => {
    if (!shopName.trim()) {
      Alert.alert("Error", "Please enter a shop name");
      return;
    }

    try {
      setSubmitting(true);
      const result = await createShop({
        shop_name: shopName.trim(),
        description: description.trim() || null,
      });

      if (result && result.shop) {
        Alert.alert("Success", "Shop created successfully!");
        setShopName("");
        setDescription("");
        setShowAddModal(false);
        
        // Set as active shop if it's the first one
        if (shops.length === 0) {
          setActiveShopId(result.shop.id);
          await saveActiveShop(result.shop.id);
        }
        
        await loadData();
      }
    } catch (error) {
      console.error("Error creating shop:", error);
      Alert.alert("Error", error.message || "Failed to create shop");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditShop = async () => {
    if (!shopName.trim()) {
      Alert.alert("Error", "Please enter a shop name");
      return;
    }

    try {
      setSubmitting(true);
      const result = await updateShop(editingShop.id, {
        shop_name: shopName.trim(),
        description: description.trim() || null,
      });

      if (result && result.shop) {
        Alert.alert("Success", "Shop updated successfully!");
        setShopName("");
        setDescription("");
        setShowEditModal(false);
        setEditingShop(null);
        await loadData();
      }
    } catch (error) {
      console.error("Error updating shop:", error);
      Alert.alert("Error", error.message || "Failed to update shop");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShop = (shop) => {
    Alert.alert(
      "Delete Shop",
      `Are you sure you want to delete "${shop.shop_name}"? This will also delete all items, purchases, and sales associated with this shop.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteShop(shop.id);
              
              if (result && result.success) {
                Alert.alert("Success", "Shop deleted successfully!");
                
                // Clear active shop if it was deleted
                if (activeShopId === shop.id) {
                  setActiveShopId(null);
                  await saveActiveShop(null);
                }
                
                await loadData();
              }
            } catch (error) {
              console.error("Error deleting shop:", error);
              Alert.alert("Error", error.message || "Failed to delete shop");
            }
          },
        },
      ]
    );
  };

  const handleSetActiveShop = async (shopId) => {
    setActiveShopId(shopId);
    await saveActiveShop(shopId);
    Alert.alert("Success", "Active shop updated!");
  };

  const openEditModal = (shop) => {
    setEditingShop(shop);
    setShopName(shop.shop_name);
    setDescription(shop.description || "");
    setShowEditModal(true);
  };

  const openAddModal = () => {
    setShopName("");
    setDescription("");
    setShowAddModal(true);
  };

  const viewShopDetails = async (shop) => {
    setSelectedShop(shop);
    try {
      const itemsRes = await getItems();
      if (itemsRes && itemsRes.items) {
        const filteredItems = itemsRes.items.filter(item => item.shop_id === shop.id);
        setShopItems(filteredItems);
      }
    } catch (error) {
      console.error("Error loading shop items:", error);
      setShopItems([]);
    }
    setShowDetailsModal(true);
  };

  if (loading && shops.length === 0) {
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
        <ActivityIndicator size="large" color="#357AFF" />
        <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 12 }}>
          Loading shops...
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
            My Shops
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>
            {shops.length} shop{shops.length !== 1 ? "s" : ""} •{" "}
            {activeShopId ? "Active shop selected" : "No active shop"}
          </Text>
        </View>

        <Pressable
          onPress={openAddModal}
          style={({ pressed }) => ({
            backgroundColor: "#357AFF",
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
            Add Shop
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
        {shops.length > 0 ? (
          <View style={{ padding: 20 }}>
            {shops.map((shop) => {
              const isActive = shop.id === activeShopId;
              return (
                <View
                  key={shop.id}
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
                    borderWidth: isActive ? 2 : 0,
                    borderColor: isActive ? "#357AFF" : "transparent",
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
                          backgroundColor: isActive ? "#357AFF" : "#357AFF15",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 16,
                        }}
                      >
                        <Store size={24} color={isActive ? "#fff" : "#357AFF"} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "600",
                              color: "#1F2937",
                            }}
                          >
                            {shop.shop_name}
                          </Text>
                          {isActive && (
                            <View
                              style={{
                                backgroundColor: "#10B981",
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 12,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  color: "#fff",
                                  fontWeight: "600",
                                }}
                              >
                                ACTIVE
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Shop Details */}
                        <View style={{ marginTop: 8, gap: 4 }}>
                          {shop.location && (
                            <Text style={{ fontSize: 12, color: "#6B7280" }}>
                              📍 {shop.location}
                            </Text>
                          )}
                          {shop.address && (
                            <Text style={{ fontSize: 12, color: "#6B7280" }}>
                              🏠 {shop.address}
                            </Text>
                          )}
                          {shop.mobile_number && (
                            <Text style={{ fontSize: 12, color: "#6B7280" }}>
                              📱 {shop.mobile_number}
                            </Text>
                          )}
                          {shop.email_address && (
                            <Text style={{ fontSize: 12, color: "#6B7280" }}>
                              ✉️ {shop.email_address}
                            </Text>
                          )}
                        </View>

                        <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
                          <View
                            style={{
                              backgroundColor: "#F3F4F6",
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: "#6B7280" }}>
                              {shop.item_count || 0} items
                            </Text>
                          </View>
                          <View
                            style={{
                              backgroundColor: "#F0FDF4",
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: "#16A34A" }}>
                              {formatCurrency(shop.total_value || 0)}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => viewShopDetails(shop)}
                            style={{
                              backgroundColor: "#357AFF15",
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: "#357AFF", fontWeight: "500" }}>
                              View Items →
                            </Text>
                          </Pressable>
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
                    {!isActive && (
                      <Pressable
                        onPress={() => handleSetActiveShop(shop.id)}
                        style={({ pressed }) => ({
                          flex: 1,
                          backgroundColor: "#357AFF15",
                          paddingVertical: 8,
                          borderRadius: 8,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Check size={16} color="#357AFF" />
                        <Text
                          style={{
                            color: "#357AFF",
                            marginLeft: 4,
                            fontWeight: "600",
                            fontSize: 14,
                          }}
                        >
                          Set Active
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => openEditModal(shop)}
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
                      onPress={() => handleDeleteShop(shop)}
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
              <Store size={32} color="#9CA3AF" />
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
              No Shops Yet
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
              Create your first shop to start managing your inventory and
              tracking sales
            </Text>

            <Pressable
              onPress={openAddModal}
              style={({ pressed }) => ({
                backgroundColor: "#357AFF",
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
                Create First Shop
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Shop Modal */}
      <Modal
        visible={showAddModal || showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setEditingShop(null);
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
              height: "70%",
              paddingBottom: insets.bottom,
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
                {showEditModal ? "Edit Shop" : "Add New Shop"}
              </Text>
              <Pressable
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingShop(null);
                }}
                style={{ padding: 4 }}
              >
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>

            {/* Form */}
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
            >
              <ScrollView
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={{ padding: 20, gap: 20, paddingBottom: 40 }}>
                  <View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: 8,
                      }}
                    >
                      Shop Name *
                    </Text>
                <TextInput
                  value={shopName}
                  onChangeText={setShopName}
                  placeholder="Enter shop name"
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
                  placeholder="Enter shop description"
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
              onPress={showEditModal ? handleEditShop : handleAddShop}
              disabled={submitting}
              style={({ pressed }) => ({
                backgroundColor: "#357AFF",
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
                  {showEditModal ? "Update Shop" : "Create Shop"}
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* Shop Details Modal */}
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
                {selectedShop?.shop_name}
              </Text>
              <Pressable
                onPress={() => setShowDetailsModal(false)}
                style={{ padding: 4 }}
              >
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {selectedShop && (
                <View style={{ padding: 20 }}>
                  {/* Shop Information */}
                  <View
                    style={{
                      backgroundColor: "#F9FAFB",
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#1F2937",
                        marginBottom: 12,
                      }}
                    >
                      Shop Information
                    </Text>
                    <View style={{ gap: 8 }}>
                      {selectedShop.location && (
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Text style={{ fontSize: 14, color: "#6B7280", width: 80 }}>
                            Location:
                          </Text>
                          <Text style={{ fontSize: 14, color: "#1F2937", flex: 1, fontWeight: "500" }}>
                            {selectedShop.location}
                          </Text>
                        </View>
                      )}
                      {selectedShop.address && (
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Text style={{ fontSize: 14, color: "#6B7280", width: 80 }}>
                            Address:
                          </Text>
                          <Text style={{ fontSize: 14, color: "#1F2937", flex: 1, fontWeight: "500" }}>
                            {selectedShop.address}
                          </Text>
                        </View>
                      )}
                      {selectedShop.mobile_number && (
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Text style={{ fontSize: 14, color: "#6B7280", width: 80 }}>
                            Mobile:
                          </Text>
                          <Text style={{ fontSize: 14, color: "#1F2937", flex: 1, fontWeight: "500" }}>
                            {selectedShop.mobile_number}
                          </Text>
                        </View>
                      )}
                      {selectedShop.email_address && (
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Text style={{ fontSize: 14, color: "#6B7280", width: 80 }}>
                            Email:
                          </Text>
                          <Text style={{ fontSize: 14, color: "#1F2937", flex: 1, fontWeight: "500" }}>
                            {selectedShop.email_address}
                          </Text>
                        </View>
                      )}
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: "#6B7280" }}>Items</Text>
                          <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F2937" }}>
                            {selectedShop.item_count}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: "#6B7280" }}>Total Value</Text>
                          <Text style={{ fontSize: 18, fontWeight: "bold", color: "#10B981" }}>
                            {formatCurrency(selectedShop.total_value)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Items List */}
                  <View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#1F2937",
                        marginBottom: 12,
                      }}
                    >
                      Items in this Shop ({shopItems.length})
                    </Text>

                    {shopItems.length > 0 ? (
                      shopItems.map((item) => (
                        <View
                          key={item.id}
                          style={{
                            backgroundColor: "#fff",
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 8,
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#1F2937",
                              marginBottom: 4,
                            }}
                          >
                            {item.item_name}
                          </Text>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                            <Text style={{ fontSize: 12, color: "#6B7280" }}>
                              Stock: {item.current_stock} units
                            </Text>
                            <Text style={{ fontSize: 12, color: "#10B981", fontWeight: "500" }}>
                              {formatCurrency(item.unit_price)}
                            </Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <View
                        style={{
                          padding: 40,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 14, color: "#6B7280", textAlign: "center" }}>
                          No items in this shop yet
                        </Text>
                      </View>
                    )}
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
