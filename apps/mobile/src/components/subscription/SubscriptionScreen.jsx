import { crossAlert } from '@/utils/crossAlert';
import {
  ActivityIndicator,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRequireAuth, useAuth, handleApiError } from "@/utils/auth/useAuth";
import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Check,
  Crown,
  FileText,
  Package,
  Store,
} from "lucide-react-native";
import {
  calculateSubscriptionUpgradeCost,
  checkSession,
  checkSubscriptionPaymentStatus,
  checkUserLimits,
  getSubscriptionPlans,
  getUserSubscription,
  initiateSubscriptionPayment,
  refreshUserDetails,
  switchToFreePlan,
} from "@/utils/frappeApi";
import { formatCurrency } from "@/utils/currency";
import { getStorageItem, setJsonStorageItem } from "@/utils/authStorage";
import { authKey } from "@/utils/auth/store";
import {
  AppButton,
  Badge,
  Card,
  FormField,
  FormSheet,
  IconButton,
  PageHeader,
  Screen,
  Section,
} from "@/components/frappe-ui";
import { colors, spacing, type } from "@/theme/frappeTheme";

const FREE_PLAN_MATCHERS = ["free plan", "free"];

function UsageRow({ label, value, exceeded }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineGray1,
      }}
    >
      <Text style={type.bodyMuted}>{label}</Text>
      <Text
        style={[
          type.body,
          {
            color: exceeded ? colors.red : colors.inkGray8,
            fontWeight: "600",
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function PlanFeature({ icon: Icon, label }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <Icon size={15} color={colors.inkGray5} strokeWidth={1.9} />
      <Text style={type.body}>{label}</Text>
    </View>
  );
}

export default function SubscriptionScreen() {
  useRequireAuth();
  const { signOut, setAuth } = useAuth();
  const insets = useSafeAreaInsets();

  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [processing, setProcessing] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  const pollingRef = useRef({ interval: null, timeout: null });

  const normalizeText = (value) => String(value || "").trim().toLowerCase();

  const normalizeKenyanPhoneNumber = (value) => {
    const raw = String(value || "").trim();
    if (!raw) {
      return { isValid: false, message: "Please enter your M-Pesa phone number." };
    }

    const cleaned = raw.replace(/[\s()-]/g, "");
    const digits = cleaned.replace(/[^\d]/g, "");

    if (!digits) {
      return { isValid: false, message: "Please enter a valid phone number." };
    }

    if (digits.length === 10 && (digits.startsWith("07") || digits.startsWith("01"))) {
      return { isValid: true, normalized: `254${digits.slice(1)}` };
    }

    if (digits.length === 12 && digits.startsWith("254") && (digits[3] === "7" || digits[3] === "1")) {
      return { isValid: true, normalized: digits };
    }

    return {
      isValid: false,
      message: "Use 07XXXXXXXX, 01XXXXXXXX, or 2547/2541 format.",
    };
  };

  const isFreePlan = (plan) => {
    const planName = normalizeText(plan?.subscription_name);
    return plan?.price === 0 || FREE_PLAN_MATCHERS.some((marker) => planName.includes(marker));
  };

  const currentPlanLabel =
    currentSubscription?.subscription_plan ||
    currentSubscription?.current_subscription ||
    "Free Plan";

  const clearPolling = useCallback(() => {
    if (pollingRef.current.interval) {
      clearInterval(pollingRef.current.interval);
      pollingRef.current.interval = null;
    }

    if (pollingRef.current.timeout) {
      clearTimeout(pollingRef.current.timeout);
      pollingRef.current.timeout = null;
    }
  }, []);

  const refreshUserState = async () => {
    try {
      const updatedUser = await refreshUserDetails();
      const authData = await getStorageItem(authKey);

      if (authData) {
        const auth = JSON.parse(authData);
        const updatedAuth = {
          ...auth,
          user: {
            ...auth.user,
            ...updatedUser,
          },
        };

        await setJsonStorageItem(authKey, updatedAuth);
        setAuth(updatedAuth);
      }
    } catch (error) {
      console.error("Error refreshing auth state:", error);
    }
  };

  const loadData = useCallback(async () => {
    try {
      await checkSession();
      setLoading(true);

      const [plansRes, subRes, limitsRes] = await Promise.all([
        getSubscriptionPlans(),
        getUserSubscription(),
        checkUserLimits(),
      ]);

      setPlans(plansRes?.plans || []);
      setCurrentSubscription(subRes || null);
      setLimits(limitsRes || null);
    } catch (error) {
      console.error("Error loading subscription data:", error);
      if (!handleApiError(error, signOut)) {
        crossAlert("Error", "Failed to load subscription data");
      }
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => clearPolling();
    }, [clearPolling, loadData])
  );

  useEffect(() => {
    return () => clearPolling();
  }, [clearPolling]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const persistSuccessfulPayment = async () => {
    await refreshUserState();
    await loadData();
  };

  const resolveSubscriptionRecordName = useCallback(async () => {
    const localRecordName = currentSubscription?.name || currentSubscription?.subscription_record_name;

    if (localRecordName) {
      return localRecordName;
    }

    const latestSubscription = await getUserSubscription();
    if (latestSubscription) {
      setCurrentSubscription(latestSubscription);
    }

    return latestSubscription?.name || latestSubscription?.subscription_record_name || null;
  }, [currentSubscription]);

  const startStatusPolling = (transactionId) => {
    clearPolling();

    pollingRef.current.interval = setInterval(async () => {
      try {
        const statusResult = await checkSubscriptionPaymentStatus(transactionId);

        if (statusResult?.status === "Success") {
          clearPolling();
          setPaymentMessage("Payment successful. Updating your subscription...");
          await persistSuccessfulPayment();
          setPaymentModalVisible(false);
          setSelectedPlan(null);
          setPhoneNumber("");
          setPaymentMessage("");
          setProcessing(false);
          crossAlert("Success", "Your subscription has been updated successfully.");
          return;
        }

        if (statusResult?.status === "Failed") {
          clearPolling();
          setProcessing(false);
          setPaymentMessage("");
          crossAlert(
            "Payment Failed",
            statusResult?.result_desc || "Payment was not successful. Please try again."
          );
        }
      } catch (error) {
        console.error("Error checking subscription payment status:", error);
      }
    }, 5000);

    pollingRef.current.timeout = setTimeout(() => {
      clearPolling();
      setProcessing(false);
      setPaymentMessage("");
      crossAlert(
        "Payment Timeout",
        "Payment confirmation timed out. Please check the subscription again or contact support."
      );
    }, 120000);
  };

  const openPaymentModal = (plan) => {
    setSelectedPlan(plan);
    setPhoneNumber("");
    setPaymentMessage("");
    setPaymentModalVisible(true);
  };

  const handleSelectPlan = async (plan) => {
    const currentSubscriptionName = currentSubscription?.current_subscription || "Free Plan";
    const currentIsActive = normalizeText(currentSubscription?.status) === "active";
    const currentPlanIsFree =
      isFreePlan({ subscription_name: currentPlanLabel, price: 0 }) ||
      normalizeText(currentSubscriptionName).includes("free");
    const selectedIsFree = isFreePlan(plan);

    const currentIsExpired = normalizeText(currentSubscription?.status) === "expired";

    if (currentSubscription?.name && currentSubscriptionName === plan.name && !currentIsExpired) {
      crossAlert("Same plan", "You already have this subscription plan.");
      return;
    }

    if (currentIsActive && !currentPlanIsFree && selectedIsFree) {
      crossAlert(
        "Downgrade not allowed",
        "Your current subscription stays active until it expires. You can switch to the free plan after expiry."
      );
      return;
    }

    if (selectedIsFree) {
      try {
        setProcessing(true);
        const result = await switchToFreePlan();

        if (result?.success) {
          await refreshUserState();
          crossAlert("Success", "You have successfully switched to the Free Plan!", [
            { text: "OK", onPress: loadData },
          ]);
        } else {
          throw new Error(result?.message || "Failed to switch to free plan");
        }
      } catch (error) {
        console.error("Error switching to free plan:", error);
        crossAlert("Error", error.message || "Failed to switch to free plan");
      } finally {
        setProcessing(false);
      }
      return;
    }

    if (currentIsActive && !currentPlanIsFree) {
      const currentPlan = plans.find((item) => item.name === currentSubscriptionName);

      if (currentPlan && Number(plan.price) < Number(currentPlan.price)) {
        crossAlert(
          "Downgrade not allowed",
          "You cannot downgrade from your current active plan. Wait until it expires before choosing a lower-priced plan."
        );
        return;
      }
    }

    openPaymentModal(plan);
  };

  const handleProceedToPayment = async () => {
    if (!selectedPlan) {
      return;
    }

    const phoneResult = normalizeKenyanPhoneNumber(phoneNumber);
    if (!phoneResult.isValid) {
      crossAlert("Invalid phone number", phoneResult.message);
      return;
    }

    try {
      setProcessing(true);
      setPaymentMessage("Calculating the final amount...");

      const subscriptionRecordName = await resolveSubscriptionRecordName();
      const normalizedPhone = phoneResult.normalized;

      const costInfo = await calculateSubscriptionUpgradeCost(subscriptionRecordName, selectedPlan.name);
      const amountToPay = Number(costInfo?.amount_to_pay ?? selectedPlan.price);
      const currency = costInfo?.currency || selectedPlan.currency || "KES";
      const creditAmount = Number(costInfo?.credit_from_old_plan || 0);
      const daysRemaining = Number(costInfo?.days_remaining || 0);

      crossAlert(
        "Confirm STK Push",
        `Plan: ${selectedPlan.subscription_name}\nAmount: ${currency} ${amountToPay.toLocaleString()}${creditAmount > 0 ? `\nCredit: -${currency} ${creditAmount.toLocaleString()} (${daysRemaining} days remaining)` : ""}\nPhone: ${normalizedPhone}\n\nProceed to send the M-Pesa STK push?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => setProcessing(false) },
          {
            text: "Send STK Push",
            onPress: async () => {
              try {
                setPaymentMessage("Sending M-Pesa STK push...");

                const paymentResult = await initiateSubscriptionPayment(
                  subscriptionRecordName,
                  selectedPlan.name,
                  normalizedPhone,
                  amountToPay
                );

                if (paymentResult?.success && paymentResult?.transaction_id) {
                  setPaymentMessage("STK push sent. Complete the prompt on your phone.");
                  startStatusPolling(paymentResult.transaction_id);
                  crossAlert(
                    "STK Push Sent",
                    paymentResult?.message || "Check your phone and enter your M-Pesa PIN to complete payment."
                  );
                  return;
                }

                throw new Error(paymentResult?.message || "Failed to initiate payment");
              } catch (error) {
                console.error("Error initiating subscription payment:", error);
                setProcessing(false);
                setPaymentMessage("");
                crossAlert("Error", error.message || "Failed to initiate payment");
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error preparing subscription payment:", error);
      setProcessing(false);
      setPaymentMessage("");
      crossAlert("Error", error.message || "Failed to prepare payment");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const currentIsExpired = normalizeText(currentSubscription?.status) === "expired";

  const sortedPlans = [...plans].sort((left, right) => Number(left.price || 0) - Number(right.price || 0));

  if (loading) {
    return (
      <Screen insets={insets}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md }}>
          <ActivityIndicator size="large" color={colors.inkGray6} />
          <Text style={type.bodyMuted}>Loading subscription details...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      insets={insets}
      contentStyle={{ paddingBottom: Math.max(insets.bottom + 112, 132) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <StatusBar style="dark" />
      <PageHeader
        title="Subscription"
        left={<IconButton icon={ArrowLeft} onPress={() => router.replace("/(tabs)/profile")} />}
      />

      <Section label="Current plan">
        <Card style={{ padding: spacing.xl, gap: spacing.md }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Crown size={18} color={colors.inkGray6} strokeWidth={1.9} />
                <Text style={type.cardTitle}>{currentPlanLabel}</Text>
              </View>
              <Text style={type.bodyMuted}>
                {normalizeText(currentSubscription?.status) === "expired"
                  ? "Your subscription has expired."
                  : "Manage your plan and usage from here."}
              </Text>
            </View>
            <Badge
              label={(currentSubscription?.status || "Active").toUpperCase()}
              theme={normalizeText(currentSubscription?.status) === "expired" ? "red" : "green"}
            />
          </View>

          {formatDate(currentSubscription?.subscription_end_date) ? (
            <Text style={type.bodyMuted}>
              {normalizeText(currentSubscription?.status) === "expired" ? "Expired on " : "Renews on "}
              {formatDate(currentSubscription?.subscription_end_date)}
            </Text>
          ) : null}

          {limits ? (
            <View style={{ marginTop: spacing.sm }}>
              <UsageRow
                label="Shops"
                value={`${limits.shops?.used ?? 0} / ${limits.shops?.limit ?? "N/A"}`}
                exceeded={limits.shops?.exceeded}
              />
              <UsageRow
                label="Products"
                value={`${limits.products?.used ?? 0} / ${limits.products?.limit ?? "N/A"}`}
                exceeded={limits.products?.exceeded}
              />
              <UsageRow
                label="Sales invoices"
                value={`${limits.sales_invoices?.used ?? 0} / ${limits.sales_invoices?.limit ?? "N/A"}`}
                exceeded={limits.sales_invoices?.exceeded}
              />
            </View>
          ) : null}
        </Card>
      </Section>

      <Section label="Plans">
        {sortedPlans.length === 0 ? (
          <Card style={{ padding: spacing.xl }}>
            <Text style={type.bodyMuted}>No subscription plans are available right now.</Text>
          </Card>
        ) : (
          sortedPlans.map((plan) => {
            const isCurrentPlan =
              currentSubscription?.current_subscription === plan.name ||
              currentPlanLabel === plan.subscription_name;

            const planTheme = plan.price > 0 ? "blue" : "gray";
            const salesLimit =
              plan.sales_invoice_limit === null ||
              plan.sales_invoice_limit === undefined ||
              plan.sales_invoice_limit === 0
                ? "Unlimited sales invoices"
                : `${plan.sales_invoice_limit} sales invoices`;

            return (
              <Card
                key={plan.name}
                style={{
                  padding: spacing.xl,
                  gap: spacing.lg,
                  marginBottom: spacing.md,
                  borderColor: isCurrentPlan ? colors.outlineGray3 : colors.outlineGray1,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1, paddingRight: spacing.md }}>
                    <Text style={type.cardTitle}>{plan.subscription_name}</Text>
                    {plan.description ? <Text style={[type.bodyMuted, { marginTop: spacing.sm }]}>{plan.description}</Text> : null}
                  </View>
                  {isCurrentPlan ? <Badge label="Current" theme={planTheme} /> : null}
                </View>

                <View style={{ gap: spacing.xs }}>
                  <Text style={{ fontSize: 30, fontWeight: "600", color: colors.inkGray9 }}>
                    {formatCurrency(plan.price)}
                    <Text style={{ fontSize: 14, fontWeight: "400", color: colors.inkGray5 }}>/month</Text>
                  </Text>
                  <Text style={type.bodyMuted}>Currency: {plan.currency || "KES"}</Text>
                </View>

                <View style={{ gap: spacing.md }}>
                  <PlanFeature
                    icon={Store}
                    label={plan.shop_limit === 0 ? "Unlimited shops" : `${plan.shop_limit} ${plan.shop_limit === 1 ? "shop" : "shops"}`}
                  />
                  <PlanFeature
                    icon={Package}
                    label={plan.products_limit === 0 ? "Unlimited products" : `${plan.products_limit} products`}
                  />
                  <PlanFeature icon={FileText} label={salesLimit} />
                </View>

                {(!isCurrentPlan || currentIsExpired) ? (
                  <AppButton
                    label={isCurrentPlan && currentIsExpired ? "Renew Plan" : (plan.price === 0 ? "Switch to free" : "Pay with M-Pesa")}
                    onPress={() => handleSelectPlan(plan)}
                    disabled={processing}
                    theme={planTheme}
                  />
                ) : null}
              </Card>
            );
          })
        )}
      </Section>

      <FormSheet
        visible={paymentModalVisible}
        onClose={() => {
          if (!processing) {
            setPaymentModalVisible(false);
            setSelectedPlan(null);
            setPhoneNumber("");
            setPaymentMessage("");
          }
        }}
        title="M-Pesa payment"
        insets={insets}
        footer={
          <AppButton
            label={processing ? "Processing..." : "Send STK push"}
            onPress={handleProceedToPayment}
            disabled={processing}
          />
        }
      >
        {selectedPlan ? (
          <View style={{ gap: spacing.lg }}>
            <Card style={{ padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.surfaceElevation1 }}>
              <Text style={type.cardTitle}>{selectedPlan.subscription_name}</Text>
              <Text style={{ fontSize: 26, fontWeight: "600", color: colors.inkGray9 }}>
                {formatCurrency(selectedPlan.price)}
              </Text>
              <Text style={type.bodyMuted}>{selectedPlan.currency || "KES"} per month</Text>
            </Card>

            <Card style={{ padding: spacing.lg, gap: spacing.md }}>
              <Text style={type.cardTitle}>What you’re paying for</Text>
              <PlanFeature
                icon={Store}
                label={selectedPlan.shop_limit === 0 ? "Unlimited shops" : `${selectedPlan.shop_limit} shops`}
              />
              <PlanFeature
                icon={Package}
                label={selectedPlan.products_limit === 0 ? "Unlimited products" : `${selectedPlan.products_limit} products`}
              />
              <PlanFeature
                icon={FileText}
                label={
                  selectedPlan.sales_invoice_limit === 0 ||
                  selectedPlan.sales_invoice_limit === null ||
                  selectedPlan.sales_invoice_limit === undefined
                    ? "Unlimited sales invoices"
                    : `${selectedPlan.sales_invoice_limit} sales invoices`
                }
              />
            </Card>

            <FormField
              label="M-Pesa phone number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="0712345678, 0112345678, or 2547XXXXXXXX"
              keyboardType="phone-pad"
              autoCapitalize="none"
              editable={!processing}
              helperText="We’ll send an STK push to this number."
            />

            {paymentMessage ? (
              <Card style={{ padding: spacing.lg, backgroundColor: colors.surfaceElevation1 }}>
                <Text style={type.body}>{paymentMessage}</Text>
              </Card>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Check size={15} color={colors.green} strokeWidth={1.9} />
              <Text style={[type.bodyMuted, { flex: 1 }]}>
                Once the prompt appears on your phone, enter your M-Pesa PIN to finish.
              </Text>
            </View>
          </View>
        ) : null}
      </FormSheet>
    </Screen>
  );
}
