/**
 * EXAMPLE: How to Connect Mobile Screens to Real API
 * 
 * This example shows you how to update the placeholder data
 * in your mobile screens to use the real backend API.
 * 
 * Pattern to follow for ALL screens:
 * 1. Import the API helper
 * 2. Add useState for loading/error states
 * 3. Use useEffect to fetch data on mount
 * 4. Update the placeholder data with real data
 * 5. Add RefreshControl for pull-to-refresh
 */

import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRequireAuth } from "@/utils/auth/useAuth";
import { Store, Plus } from "lucide-react-native";
import { router } from "expo-router";
import { useState, useEffect, useCallback } from "react";

// 1. Import the API helper
import { getShops, createShop } from "@/utils/api";

export default function ShopsExample() {
  useRequireAuth();
  const insets = useSafeAreaInsets();

  // 2. Add state for data, loading, and errors
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // 3. Function to fetch data from API
  const fetchShops = useCallback(async () => {
    try {
      setError(null);
      const response = await getShops();
      setShops(response.shops || []);
    } catch (err) {
      console.error("Error fetching shops:", err);
      setError(err.message);
      Alert.alert("Error", "Failed to load shops. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 4. Fetch data when component mounts
  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  // 5. Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchShops();
  }, [fetchShops]);

  // 6. Handle creating new shop
  const handleAddShop = () => {
    Alert.prompt(
      "Add New Shop",
      "Enter shop name",
      async (shopName) => {
        if (shopName && shopName.trim()) {
          try {
            await createShop({
              shop_name: shopName.trim(),
              description: "",
            });
            // Refresh the list
            fetchShops();
            Alert.alert("Success", "Shop created successfully!");
          } catch (err) {
            Alert.alert("Error", "Failed to create shop: " + err.message);
          }
        }
      }
    );
  };

  const handleShopPress = (shop) => {
    Alert.alert(
      shop.shop_name,
      `Items: ${shop.itemCount || 0}\nTotal Value: $${shop.totalValue || 0}`,
      [
        { text: "View Details", onPress: () => {} },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  // 7. Show loading state
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading shops...</Text>
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
            Manage your business locations
          </Text>
        </View>

        <Pressable
          onPress={handleAddShop}
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

      {/* 8. Add RefreshControl to ScrollView */}
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
            {shops.map((shop) => (
              <Pressable
                key={shop.id}
                onPress={() => handleShopPress(shop)}
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
                        backgroundColor: "#357AFF15",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 16,
                      }}
                    >
                      <Store size={24} color="#357AFF" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: "#1F2937",
                        }}
                      >
                        {shop.shop_name}
                      </Text>
                      {shop.description && (
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#6B7280",
                            marginTop: 2,
                          }}
                        >
                          {shop.description}
                        </Text>
                      )}
                    </View>
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
              Create your first shop to start managing your inventory
            </Text>

            <Pressable
              onPress={handleAddShop}
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
    </View>
  );
}

/**
 * SUMMARY - Steps to Connect ANY Screen to API:
 * 
 * 1. Import API function: import { getShops } from "@/utils/api"
 * 
 * 2. Add state:
 *    const [data, setData] = useState([]);
 *    const [loading, setLoading] = useState(true);
 *    const [refreshing, setRefreshing] = useState(false);
 * 
 * 3. Create fetch function:
 *    const fetchData = async () => {
 *      try {
 *        const response = await getShops();
 *        setData(response.shops);
 *      } catch (err) {
 *        Alert.alert("Error", err.message);
 *      } finally {
 *        setLoading(false);
 *      }
 *    };
 * 
 * 4. Fetch on mount:
 *    useEffect(() => { fetchData(); }, []);
 * 
 * 5. Add RefreshControl to ScrollView
 * 
 * Apply this pattern to:
 * - shops.jsx
 * - items.jsx
 * - purchases.jsx
 * - sales.jsx
 * - stock.jsx
 */
