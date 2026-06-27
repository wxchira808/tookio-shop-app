import { View, Text, ScrollView, Pressable, ActivityIndicator, useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, RefreshCw, BarChart2 } from "lucide-react-native";
import { router } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { getDashboardDetails, getFrappeNumberCardValue, getDashboardChartData } from "@/utils/frappeApi";
import { colors, spacing, type } from "@/theme/frappeTheme";
import { formatCurrency } from "@/utils/currency";

export default function DashboardView() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardConfig, setDashboardConfig] = useState(null);
  const [cardValues, setCardValues] = useState({});
  const [chartData, setChartData] = useState({});

  const loadDashboard = useCallback(async () => {
    try {
      const config = await getDashboardDetails("Tookio Shop Dashboard");
      setDashboardConfig(config);

      // Load cards
      if (config && config.cards) {
        const cardsObj = {};
        await Promise.all(
          config.cards.map(async (c) => {
            const data = await getFrappeNumberCardValue(c.card);
            if (data) cardsObj[c.card] = data.value;
          })
        );
        setCardValues(cardsObj);
      }

      // Load charts (defaulting to 'Last Year' or 'Last Month' to ensure data exists)
      if (config && config.charts) {
        const chartsObj = {};
        await Promise.all(
          config.charts.map(async (c) => {
            const data = await getDashboardChartData(c.chart, "Last Year");
            if (data) chartsObj[c.chart] = data;
          })
        );
        setChartData(chartsObj);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const renderSimpleBarChart = (chartConfig) => {
    const data = chartData[chartConfig.chart];
    if (!data || !data.labels || !data.datasets || data.datasets.length === 0) {
      return (
        <View style={{ padding: spacing.xl, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceBase, borderRadius: 12, borderWidth: 1, borderColor: colors.outlineGray1, marginTop: spacing.sm }}>
          <Text style={type.bodyMuted}>No data available for {chartConfig.chart}</Text>
        </View>
      );
    }

    const dataset = data.datasets[0];
    const maxVal = Math.max(...dataset.values.map(v => Number(v) || 0), 1);
    
    // Take only last 7 data points for mobile display if there are too many
    const startIndex = Math.max(0, data.labels.length - 7);
    const labels = data.labels.slice(startIndex);
    const values = dataset.values.slice(startIndex);

    return (
      <View style={{ backgroundColor: colors.surfaceBase, borderRadius: 12, borderWidth: 1, borderColor: colors.outlineGray1, padding: spacing.md, marginTop: spacing.sm }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.inkGray8, marginBottom: spacing.md }}>{chartConfig.chart}</Text>
        <View style={{ height: 150, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingTop: spacing.md }}>
          {values.map((val, idx) => {
            const numVal = Number(val) || 0;
            const heightPct = (numVal / maxVal) * 100;
            return (
              <View key={idx} style={{ flex: 1, alignItems: "center" }}>
                {numVal > 0 && (
                  <Text style={{ fontSize: 10, color: colors.inkGray5, marginBottom: 4 }} numberOfLines={1}>
                    {numVal > 1000 ? (numVal/1000).toFixed(1) + 'k' : numVal}
                  </Text>
                )}
                <View style={{ width: "60%", height: `${Math.max(heightPct, 2)}%`, backgroundColor: "#3B82F6", borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, borderTopWidth: 1, borderTopColor: colors.outlineGray1, paddingTop: 8 }}>
          {labels.map((lbl, idx) => (
            <View key={idx} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 10, color: colors.inkGray5 }} numberOfLines={1}>{lbl}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceHover, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.surfaceBase, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.outlineGray1 }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: pressed ? colors.surfaceHover : "transparent", alignItems: "center", justifyContent: "center", marginRight: spacing.sm })}
        >
          <ArrowLeft size={24} color={colors.inkGray8} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.inkGray8 }}>Business Dashboard</Text>
        </View>
        <Pressable onPress={handleRefresh} style={{ padding: spacing.sm }}>
          <RefreshCw size={20} color={colors.inkGray6} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ padding: 40, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color={colors.inkGray6} />
            <Text style={[type.bodyMuted, { marginTop: spacing.md }]}>Loading Dashboard...</Text>
          </View>
        ) : !dashboardConfig ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={type.bodyMuted}>Could not load dashboard config.</Text>
          </View>
        ) : (
          <View style={{ gap: spacing.xl }}>
            
            {/* KPI Cards */}
            {dashboardConfig.cards && dashboardConfig.cards.length > 0 && (
              <View>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.inkGray8, marginBottom: spacing.md }}>Key Metrics</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -spacing.sm }}>
                  {dashboardConfig.cards.map((card, index) => {
                    const val = cardValues[card.card];
                    const isCurrency = card.card.toLowerCase().includes("sales") || card.card.toLowerCase().includes("expenses");
                    const displayVal = val !== undefined ? (isCurrency ? formatCurrency(val) : val) : "...";
                    return (
                      <View key={index} style={{ width: width >= 768 ? "33.33%" : "50%", paddingHorizontal: spacing.sm, marginBottom: spacing.md }}>
                        <View style={{ backgroundColor: colors.surfaceBase, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.outlineGray1 }}>
                          <Text style={{ fontSize: 13, color: colors.inkGray5, marginBottom: 4 }} numberOfLines={1}>{card.card}</Text>
                          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.inkGray8 }}>{displayVal}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Charts */}
            {dashboardConfig.charts && dashboardConfig.charts.length > 0 && (
              <View>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.inkGray8, marginBottom: spacing.sm }}>Trends & Analysis</Text>
                {dashboardConfig.charts.map((chart, index) => (
                  <View key={index} style={{ marginBottom: spacing.lg }}>
                    {renderSimpleBarChart(chart)}
                  </View>
                ))}
              </View>
            )}

          </View>
        )}
      </ScrollView>
    </View>
  );
}
