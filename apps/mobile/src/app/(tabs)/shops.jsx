import { crossAlert } from '@/utils/crossAlert';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRequireAuth, useAuth, handleApiError } from "@/utils/auth/useAuth";
import { AdBanner } from "@/components/AdBanner";
import { AppButton, FormField, FormSheet, SelectField } from "@/components/frappe-ui";
import {
  Store,
  Plus,
  X,
  Edit,
  Check,
  Trash2,
} from "lucide-react-native";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import {
  getShops,
  createShop,
  updateShop,
  deleteShop,
  getItems,
  checkSession,
  getCountryOptions,
  getCurrencyOptions,
} from "@/utils/frappeApi";
import {
  getActiveShop,
  setActiveShop as saveActiveShop,
} from "@/utils/storage";
import { formatCurrency } from "@/utils/currency";

export default function Shops() {
  useRequireAuth();
  const { signOut } = useAuth();
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
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [countryOptions, setCountryOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const pickDefault = (options, preferred) => {
    if (!options.length) return "";
    const preferredMatch = preferred.find((value) => options.includes(value));
    return preferredMatch || options[0] || "";
  };

  const loadData = async () => {
    try {
      // Check session first
      await checkSession();

      setLoading(true);
      const [shopsRes, activeId, countriesRes, currenciesRes] = await Promise.all([
        getShops(),
        getActiveShop(),
        getCountryOptions().catch(() => []),
        getCurrencyOptions().catch(() => []),
      ]);

      const normalizedCountries = (countriesRes || []).length > 0 ? countriesRes : ["Kenya"];
      const normalizedCurrencies = (currenciesRes || []).length > 0 ? currenciesRes : ["KES"];
      setCountryOptions(normalizedCountries);
      setCurrencyOptions(normalizedCurrencies);

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
      if (!handleApiError(error, signOut)) {
        crossAlert("Error", "Failed to load shops. Please try again.");
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

  const handleAddShop = async () => {
    if (!shopName.trim()) {
      crossAlert("Error", "Please enter a shop name");
      return;
    }

    try {
      setSubmitting(true);
      const result = await createShop({
        shop_name: shopName.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        address: address.trim() || null,
        mobile_number: mobileNumber.trim() || null,
        email_address: emailAddress.trim() || null,
        country: country || null,
        currency: currency || null,
        enabled: enabled ? 1 : 0, // Convert boolean to 1/0
      });

      if (result && result.shop) {
        crossAlert("Success", "Shop created successfully!");
        setShopName("");
        setDescription("");
        setLocation("");
        setAddress("");
        setMobileNumber("");
        setEmailAddress("");
        setCountry("");
        setCurrency("");
        setEnabled(true);
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
      crossAlert("Error", error.message || "Failed to create shop");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditShop = async () => {
    if (!shopName.trim()) {
      crossAlert("Error", "Please enter a shop name");
      return;
    }

    try {
      setSubmitting(true);
      const result = await updateShop(editingShop.id, {
        shop_name: shopName.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        address: address.trim() || null,
        mobile_number: mobileNumber.trim() || null,
        email_address: emailAddress.trim() || null,
        country: country || null,
        currency: currency || null,
        enabled: enabled ? 1 : 0, // Convert boolean to 1/0
      });

      if (result && result.shop) {
        crossAlert("Success", "Shop updated successfully!");
        setShopName("");
        setDescription("");
        setLocation("");
        setAddress("");
        setMobileNumber("");
        setEmailAddress("");
        setCountry("");
        setCurrency("");
        setEnabled(true);
        setShowEditModal(false);
        setEditingShop(null);
        await loadData();
      }
    } catch (error) {
      console.error("Error updating shop:", error);
      crossAlert("Error", error.message || "Failed to update shop");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShop = async () => {
    if (!editingShop) return;

    crossAlert(
      "Delete Shop",
      `Are you sure you want to delete "${editingShop.shop_name}"? This action cannot be undone and will also delete all items in this shop.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setSubmitting(true);
              await deleteShop(editingShop.id);

              // If the deleted shop was the active shop, clear the active shop
              if (activeShopId === editingShop.id) {
                setActiveShopId(null);
                await saveActiveShop(null);
              }

              crossAlert("Success", "Shop deleted successfully!");
              setShowEditModal(false);
              setEditingShop(null);
              await loadData();
            } catch (error) {
              console.error("Error deleting shop:", error);
              crossAlert("Error", error.message || "Failed to delete shop");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleSetActiveShop = async (shopId) => {
    setActiveShopId(shopId);
    await saveActiveShop(shopId);
    crossAlert("Success", "Active shop updated!");
  };

  const openEditModal = (shop) => {
    setEditingShop(shop);
    setShopName(shop.shop_name);
    setDescription(shop.description || "");
    setLocation(shop.location || "");
    setAddress(shop.address || "");
    setMobileNumber(shop.mobile_number || "");
    setEmailAddress(shop.email_address || "");
    setCountry(shop.country || pickDefault(countryOptions, ["Kenya"]));
    setCurrency(shop.currency || pickDefault(currencyOptions, ["KES"]));
    setEnabled(shop.enabled === 1); // Convert 1 to true, anything else to false
    setShowEditModal(true);
  };

  const openAddModal = () => {
    setShopName("");
    setDescription("");
    setLocation("");
    setAddress("");
    setMobileNumber("");
    setEmailAddress("");
    setCountry(pickDefault(countryOptions, ["Kenya"]));
    setCurrency(pickDefault(currencyOptions, ["KES"]));
    setEnabled(true);
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
          backgroundColor: "#F7F7F7",
          paddingTop: insets.top,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#525252" />
        <Text style={{ fontSize: 15, color: "#737373", marginTop: 12 }}>
          Loading shops...
        </Text>
      </View>
    );
  }

  return (
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
          <Text style={{ fontSize: 24, fontWeight: "700", color: "#171717" }}>
            Shops
          </Text>
          <Text style={{ fontSize: 14, color: "#737373", marginTop: 4 }}>
            {shops.length} shop{shops.length !== 1 ? "s" : ""} •{" "}
            {activeShopId ? "one active" : "choose an active shop"}
          </Text>
        </View>

        <Pressable
          onPress={openAddModal}
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
            Add Shop
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
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
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: isActive ? "#93C5FD" : "#E5E5E5",
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
                          width: 42,
                          height: 42,
                          borderRadius: 10,
                          backgroundColor: "#F5F5F5",
                          borderWidth: 1,
                          borderColor: isActive ? "#BFDBFE" : "#E5E5E5",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 14,
                        }}
                      >
                        <Store size={20} color={isActive ? "#2563EB" : "#525252"} />
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
                              color: "#171717",
                            }}
                          >
                            {shop.shop_name}
                          </Text>
                          {isActive && (
                            <View
                              style={{
                                backgroundColor: "#EFF6FF",
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: "#BFDBFE",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  color: "#2563EB",
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
                            <Text style={{ fontSize: 12, color: "#737373" }}>
                              {shop.location}
                            </Text>
                          )}
                          {shop.address && (
                            <Text style={{ fontSize: 12, color: "#737373" }}>
                              {shop.address}
                            </Text>
                          )}
                          {shop.mobile_number && (
                            <Text style={{ fontSize: 12, color: "#737373" }}>
                              {shop.mobile_number}
                            </Text>
                          )}
                          {shop.email_address && (
                            <Text style={{ fontSize: 12, color: "#737373" }}>
                              {shop.email_address}
                            </Text>
                          )}
                        </View>

                        <View style={{ flexDirection: "row", marginTop: 8, gap: 8, flexWrap: "wrap" }}>
                          <View
                            style={{
                              backgroundColor: "#F5F5F5",
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: "#737373" }}>
                              {shop.item_count || 0} items
                            </Text>
                          </View>
                          <View
                            style={{
                              backgroundColor: "#FAFAFA",
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: "#E5E7EB",
                            }}
                          >
                            <Text style={{ fontSize: 12, color: "#171717" }}>
                              {formatCurrency(shop.total_value || 0)}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => viewShopDetails(shop)}
                            style={{
                              backgroundColor: "#F5F5F5",
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              flexShrink: 1,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: "#404040", fontWeight: "500" }}>
                              View items
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
                      borderTopColor: "#F5F5F5",
                    }}
                  >
                    {/* Enabled Status Badge */}
                    <View
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        backgroundColor: "#FAFAFA",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: shop.enabled === 1 ? "#2563EB" : "#A3A3A3",
                          marginRight: 6,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: shop.enabled === 1 ? "#2563EB" : "#525252",
                        }}
                      >
                        {shop.enabled === 1 ? "Enabled" : "Disabled"}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => openEditModal(shop)}
                      style={({ pressed }) => ({
                        flex: 1,
                        backgroundColor: "#FAFAFA",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        paddingVertical: 8,
                        borderRadius: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Edit size={16} color="#404040" />
                      <Text
                        style={{
                          color: "#404040",
                          marginLeft: 4,
                          fontWeight: "600",
                          fontSize: 14,
                        }}
                      >
                        Edit
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
                borderWidth: 1,
                borderColor: "#E5E5E5",
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
              No shops yet
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: "#737373",
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
                backgroundColor: "#171717",
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
                Create shop
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <FormSheet
        visible={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setEditingShop(null);
        }}
        title={showEditModal ? "Edit shop" : "Add shop"}
        insets={insets}
        footer={
          showEditModal ? (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <AppButton
                label={submitting ? "Deleting..." : "Delete"}
                onPress={handleDeleteShop}
                disabled={submitting}
                variant="outline"
                theme="red"
                icon={Trash2}
                style={{ flex: 1 }}
              />
              <AppButton
                label={submitting ? "Saving..." : "Save changes"}
                onPress={handleEditShop}
                disabled={submitting}
                icon={Check}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <AppButton
              label={submitting ? "Creating..." : "Create shop"}
              onPress={handleAddShop}
              disabled={submitting}
            />
          )
        }
      >
        <FormField
          label="Shop name"
          value={shopName}
          onChangeText={setShopName}
          placeholder="Enter shop name"
          helperText="Required"
        />
        <FormField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Tell people what this shop is for"
          multiline
        />
        <FormField
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="Downtown, market, mall..."
        />
        <FormField
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="Full address"
          multiline
        />
        <FormField
          label="Mobile number"
          value={mobileNumber}
          onChangeText={setMobileNumber}
          placeholder="07..."
          keyboardType="phone-pad"
        />
        <FormField
          label="Email address"
          value={emailAddress}
          onChangeText={setEmailAddress}
          placeholder="shop@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <SelectField
          label="Country"
          value={country}
          onValueChange={setCountry}
          options={countryOptions.map((option) => ({ label: option, value: option }))}
          placeholder="Choose country"
          helperText="Linked to the Country doctype"
        />
        <SelectField
          label="Currency"
          value={currency}
          onValueChange={setCurrency}
          options={currencyOptions.map((option) => ({ label: option, value: option }))}
          placeholder="Choose currency"
          helperText="Linked to the Currency doctype"
        />
        <Pressable
          onPress={() => setEnabled(!enabled)}
          style={{
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
              borderColor: enabled ? "#3A3A3A" : "#B8B8B8",
              backgroundColor: enabled ? "#242424" : "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {enabled ? <Check size={12} color="#FFFFFF" strokeWidth={2.4} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#242424" }}>
              {enabled ? "Shop enabled" : "Shop disabled"}
            </Text>
            <Text style={{ fontSize: 12, color: "#707070", marginTop: 2 }}>
              {enabled ? "Visible in sales and inventory" : "Hidden from sales and inventory"}
            </Text>
          </View>
        </Pressable>
      </FormSheet>

      {/* Legacy Add/Edit Shop Modal */}
      <Modal
        visible={false && (showAddModal || showEditModal)}
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
              maxHeight: "90%",
              paddingBottom: insets.bottom + 20,
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                {showEditModal && (
                  <Pressable
                    onPress={handleDeleteShop}
                    disabled={submitting}
                    style={({ pressed }) => ({
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: pressed ? "#FEE2E215" : "transparent",
                      opacity: submitting ? 0.5 : 1,
                    })}
                  >
                    <Trash2 size={20} color="#EF4444" />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setEditingShop(null);
                  }}
                  disabled={submitting}
                  style={{ padding: 4, opacity: submitting ? 0.5 : 1 }}
                >
                  <X size={24} color="#6B7280" />
                </Pressable>
              </View>
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
                showsVerticalScrollIndicator={true}
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

              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Location
                </Text>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Enter location (e.g., Downtown, Mall)"
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
                  Address
                </Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter full address"
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

              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Mobile Number
                </Text>
                <TextInput
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  placeholder="Enter mobile number"
                  keyboardType="phone-pad"
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
                  Email Address
                </Text>
                <TextInput
                  value={emailAddress}
                  onChangeText={setEmailAddress}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
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
                  Shop Status
                </Text>
                <Pressable
                  onPress={() => setEnabled(!enabled)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
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
                      borderColor: enabled ? "#10B981" : "#E2E8F0",
                      backgroundColor: enabled ? "#10B981" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    {enabled && (
                      <Text style={{ fontSize: 14, fontWeight: "bold", color: "#FFFFFF" }}>✓</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#0F172A" }}>
                    {enabled ? "Enabled" : "Disabled"}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#64748B", marginLeft: 8 }}>
                    {enabled ? "Shop is active and visible" : "Shop is hidden from sales/inventory"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>

          <View style={{ padding: 20, paddingTop: 0 }}>
            {showEditModal ? (
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable
                  onPress={handleDeleteShop}
                  disabled={submitting}
                  style={({ pressed }) => ({
                    flex: 1,
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
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Trash2 size={16} color="#fff" />
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: "#fff",
                          marginLeft: 8,
                        }}
                      >
                        Delete
                      </Text>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  onPress={handleEditShop}
                  disabled={submitting}
                  style={({ pressed }) => ({
                    flex: 1,
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
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Check size={16} color="#fff" />
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: "#fff",
                          marginLeft: 8,
                        }}
                      >
                        Update
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleAddShop}
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
                    Create Shop
                  </Text>
                )}
              </Pressable>
            )}
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
              maxHeight: "84%",
              paddingBottom: insets.bottom + 20,
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

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
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
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Text style={{ fontSize: 14, color: "#6B7280", width: 80 }}>
                          Country:
                        </Text>
                        <Text style={{ fontSize: 14, color: "#1F2937", flex: 1, fontWeight: "500" }}>
                          {selectedShop.country || "Not set"}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Text style={{ fontSize: 14, color: "#6B7280", width: 80 }}>
                          Currency:
                        </Text>
                        <Text style={{ fontSize: 14, color: "#1F2937", flex: 1, fontWeight: "500" }}>
                          {selectedShop.currency || "Not set"}
                        </Text>
                      </View>
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

      {/* Slim Ad Banner */}
      <AdBanner variant="slim" context="shops" />
    </View>
  );
}
