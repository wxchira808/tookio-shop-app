import { View, Text, ScrollView, Pressable, ActivityIndicator, useWindowDimensions, FlatList } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, RefreshCw, FileText, ChevronRight, Download } from "lucide-react-native";
import { router } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { getFrappeReports, runFrappeReport } from "@/utils/frappeApi";
import { colors, spacing, type } from "@/theme/frappeTheme";
import { ListRow } from "@/components/frappe-ui";

export default function ReportsView() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for active report view
  const [activeReport, setActiveReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    loadReportsList();
  }, []);

  const loadReportsList = async () => {
    try {
      setLoading(true);
      const list = await getFrappeReports();
      setReports(list);
    } catch (error) {
      console.error("Error loading reports list:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReport = async (reportName) => {
    setActiveReport(reportName);
    setLoadingReport(true);
    setReportData(null);
    try {
      const data = await runFrappeReport(reportName);
      setReportData(data);
    } catch (error) {
      console.error("Error running report:", error);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleBack = () => {
    if (activeReport) {
      setActiveReport(null);
    } else {
      router.back();
    }
  };

  const renderReportTable = () => {
    if (loadingReport) {
      return (
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.inkGray6} />
          <Text style={[type.bodyMuted, { marginTop: spacing.md }]}>Generating report...</Text>
        </View>
      );
    }

    if (!reportData || !reportData.columns || !reportData.result) {
      return (
        <View style={{ padding: 40, alignItems: "center" }}>
          <Text style={type.bodyMuted}>No data available for this report.</Text>
        </View>
      );
    }

    const columns = reportData.columns;
    const rows = reportData.result;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
        <View style={{ backgroundColor: colors.surfaceBase, borderRadius: 12, borderWidth: 1, borderColor: colors.outlineGray1, overflow: 'hidden' }}>
          {/* Header */}
          <View style={{ flexDirection: "row", backgroundColor: colors.surfaceHover, borderBottomWidth: 1, borderBottomColor: colors.outlineGray1 }}>
            {columns.map((col, index) => (
              <View key={index} style={{ padding: spacing.md, width: Math.max(120, width / 3), borderRightWidth: index === columns.length - 1 ? 0 : 1, borderRightColor: colors.outlineGray1 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.inkGray8 }}>{col.label || col.fieldname || col}</Text>
              </View>
            ))}
          </View>

          {/* Rows */}
          {rows.map((row, rowIndex) => {
            // Some frappe reports return array of arrays instead of dicts, handle both
            const isArray = Array.isArray(row);
            
            return (
              <View key={rowIndex} style={{ flexDirection: "row", borderBottomWidth: rowIndex === rows.length - 1 ? 0 : 1, borderBottomColor: colors.outlineGray1 }}>
                {columns.map((col, colIndex) => {
                  let cellValue = "";
                  if (isArray) {
                    cellValue = row[colIndex] !== undefined && row[colIndex] !== null ? String(row[colIndex]) : "";
                  } else {
                    const fieldName = col.fieldname || col;
                    cellValue = row[fieldName] !== undefined && row[fieldName] !== null ? String(row[fieldName]) : "";
                  }
                  
                  return (
                    <View key={colIndex} style={{ padding: spacing.md, width: Math.max(120, width / 3), borderRightWidth: colIndex === columns.length - 1 ? 0 : 1, borderRightColor: colors.outlineGray1 }}>
                      <Text style={{ fontSize: 13, color: colors.inkGray7 }} numberOfLines={2}>{cellValue}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceHover, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.surfaceBase, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.outlineGray1 }}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: pressed ? colors.surfaceHover : "transparent", alignItems: "center", justifyContent: "center", marginRight: spacing.sm })}
        >
          <ArrowLeft size={24} color={colors.inkGray8} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.inkGray8 }} numberOfLines={1}>
            {activeReport ? activeReport : "Reports"}
          </Text>
        </View>
        {activeReport && (
          <Pressable onPress={() => handleOpenReport(activeReport)} style={{ padding: spacing.sm }}>
            <RefreshCw size={20} color={colors.inkGray6} />
          </Pressable>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {!activeReport ? (
          <View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.inkGray8, marginBottom: spacing.md }}>Interactive Reports</Text>
            {loading ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.inkGray6} />
              </View>
            ) : (
              <View style={{ backgroundColor: colors.surfaceBase, borderRadius: 12, borderWidth: 1, borderColor: colors.outlineGray1, overflow: 'hidden' }}>
                {reports.map((report, idx) => (
                  <View key={idx}>
                    <Pressable
                      onPress={() => handleOpenReport(report)}
                      style={({ pressed }) => ({
                        padding: spacing.lg,
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: pressed ? colors.surfaceHover : "transparent",
                      })}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: "#F3E8FF", alignItems: "center", justifyContent: "center", marginRight: spacing.md }}>
                        <FileText size={20} color="#A855F7" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.inkGray8 }}>{report}</Text>
                        <Text style={{ fontSize: 13, color: colors.inkGray5, marginTop: 2 }}>Run and view data</Text>
                      </View>
                      <ChevronRight size={20} color={colors.inkGray4} />
                    </Pressable>
                    {idx < reports.length - 1 && <View style={{ height: 1, backgroundColor: colors.outlineGray1, marginLeft: 72 }} />}
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View>
            <Text style={{ fontSize: 16, color: colors.inkGray5, marginBottom: spacing.sm }}>Report Results</Text>
            {renderReportTable()}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
