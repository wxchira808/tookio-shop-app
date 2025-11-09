import { Tabs } from "expo-router";
import {
  Home,
  Store,
  Package,
  BarChart3,
  TrendingUp,
  ShoppingCart, // Add ShoppingCart icon for purchases
} from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderColor: "#E5E7EB",
          paddingTop: 4,
        },
        tabBarActiveTintColor: "#357AFF",
        tabBarInactiveTintColor: "#6B6B6B",
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="shops"
        options={{
          title: "Shops",
          tabBarIcon: ({ color, size }) => <Store color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="items"
        options={{
          title: "Items",
          tabBarIcon: ({ color, size }) => <Package color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="purchases"
        options={{
          title: "Purchases",
          href: null, // Hide tab - Coming Soon feature
          tabBarIcon: ({ color, size }) => (
            <ShoppingCart color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
          tabBarIcon: ({ color, size }) => (
            <BarChart3 color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: "Sales",
          tabBarIcon: ({ color, size }) => (
            <TrendingUp color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
