import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRequireAuth, useAuth, handleApiError } from "@/utils/auth/useAuth"
import { useCallback, useEffect, useRef, useState } from "react"
import { router, useFocusEffect } from "expo-router"
import { ArrowLeft, Check, Crown, FileText, Package, Store, X } from "lucide-react-native"
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
} from "@/utils/frappeApi"
import { formatCurrency } from "@/utils/currency"
import * as SecureStore from "expo-secure-store"
import { authKey } from "@/utils/auth/store"

const FREE_PLAN_MATCHERS = ["free plan", "free"]

export default function SubscriptionScreen() {
  useRequireAuth()
  const { signOut, setAuth } = useAuth()
  const insets = useSafeAreaInsets()

  const [plans, setPlans] = useState([])
  const [currentSubscription, setCurrentSubscription] = useState(null)
  const [limits, setLimits] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [processing, setProcessing] = useState(false)
  const [paymentMessage, setPaymentMessage] = useState("")

  const pollingRef = useRef({ interval: null, timeout: null })

  const normalizeText = (value) => String(value || "").trim().toLowerCase()

  const normalizeKenyanPhoneNumber = (value) => {
    const raw = String(value || "").trim()
    if (!raw) {
      return { isValid: false, message: "Please enter your M-Pesa phone number." }
    }

    const cleaned = raw.replace(/[\s()-]/g, "")
    const digits = cleaned.replace(/[^\d]/g, "")

    if (!digits) {
      return { isValid: false, message: "Please enter a valid phone number." }
    }

    if (digits.length === 10 && (digits.startsWith("07") || digits.startsWith("01"))) {
      return { isValid: true, normalized: `254${digits.slice(1)}` }
    }

    if (digits.length === 12 && digits.startsWith("254") && (digits[3] === "7" || digits[3] === "1")) {
      return { isValid: true, normalized: digits }
    }

    return {
      isValid: false,
      message: "Use 07XXXXXXXX, 01XXXXXXXX, or 2547/2541 format.",
    }
  }

  const isFreePlan = (plan) => {
    const planName = normalizeText(plan?.subscription_name)
    return plan?.price === 0 || FREE_PLAN_MATCHERS.some((marker) => planName.includes(marker))
  }

  const currentPlanLabel = currentSubscription?.subscription_plan || currentSubscription?.current_subscription || "Free Plan"

  const clearPolling = useCallback(() => {
    if (pollingRef.current.interval) {
      clearInterval(pollingRef.current.interval)
      pollingRef.current.interval = null
    }

    if (pollingRef.current.timeout) {
      clearTimeout(pollingRef.current.timeout)
      pollingRef.current.timeout = null
    }
  }, [])

  const refreshUserState = async () => {
    try {
      const updatedUser = await refreshUserDetails()
      const authData = await SecureStore.getItemAsync(authKey)

      if (authData) {
        const auth = JSON.parse(authData)
        const updatedAuth = {
          ...auth,
          user: {
            ...auth.user,
            ...updatedUser,
          },
        }

        await SecureStore.setItemAsync(authKey, JSON.stringify(updatedAuth))
        setAuth(updatedAuth)
      }
    } catch (error) {
      console.error("Error refreshing auth state:", error)
    }
  }

  const loadData = useCallback(async () => {
    try {
      await checkSession()
      setLoading(true)

      const [plansRes, subRes, limitsRes] = await Promise.all([
        getSubscriptionPlans(),
        getUserSubscription(),
        checkUserLimits(),
      ])

      setPlans(plansRes?.plans || [])
      setCurrentSubscription(subRes || null)
      setLimits(limitsRes || null)
    } catch (error) {
      console.error("Error loading subscription data:", error)
      if (!handleApiError(error, signOut)) {
        Alert.alert("Error", "Failed to load subscription data")
      }
    } finally {
      setLoading(false)
    }
  }, [signOut])

  useFocusEffect(
    useCallback(() => {
      loadData()
      return () => clearPolling()
    }, [clearPolling, loadData])
  )

  useEffect(() => {
    return () => clearPolling()
  }, [clearPolling])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const persistSuccessfulPayment = async () => {
    await refreshUserState()
    await loadData()
  }

  const resolveSubscriptionRecordName = useCallback(async () => {
    const localRecordName = currentSubscription?.name || currentSubscription?.subscription_record_name

    if (localRecordName) {
      return localRecordName
    }

    const latestSubscription = await getUserSubscription()
    if (latestSubscription) {
      setCurrentSubscription(latestSubscription)
    }

    return latestSubscription?.name || latestSubscription?.subscription_record_name || null
  }, [currentSubscription])

  const startStatusPolling = (transactionId) => {
    clearPolling()

    pollingRef.current.interval = setInterval(async () => {
      try {
        const statusResult = await checkSubscriptionPaymentStatus(transactionId)

        if (statusResult?.status === "Success") {
          clearPolling()
          setPaymentMessage("Payment successful. Updating your subscription...")
          await persistSuccessfulPayment()
          setPaymentModalVisible(false)
          setSelectedPlan(null)
          setPhoneNumber("")
          setPaymentMessage("")
          setProcessing(false)
          Alert.alert("Success", "Your subscription has been updated successfully.")
          return
        }

        if (statusResult?.status === "Failed") {
          clearPolling()
          setProcessing(false)
          setPaymentMessage("")
          Alert.alert(
            "Payment Failed",
            statusResult?.result_desc || "Payment was not successful. Please try again."
          )
        }
      } catch (error) {
        console.error("Error checking subscription payment status:", error)
      }
    }, 5000)

    pollingRef.current.timeout = setTimeout(() => {
      clearPolling()
      setProcessing(false)
      setPaymentMessage("")
      Alert.alert(
        "Payment Timeout",
        "Payment confirmation timed out. Please check the subscription again or contact support."
      )
    }, 120000)
  }

  const openPaymentModal = (plan) => {
    setSelectedPlan(plan)
    setPhoneNumber("")
    setPaymentMessage("")
    setPaymentModalVisible(true)
  }

  const handleSelectPlan = async (plan) => {
    const currentSubscriptionName = currentSubscription?.current_subscription || "Free Plan"
    const currentIsActive = normalizeText(currentSubscription?.status) === "active"
    const currentPlanIsFree = isFreePlan({ subscription_name: currentPlanLabel, price: 0 }) || normalizeText(currentSubscriptionName).includes("free")
    const selectedIsFree = isFreePlan(plan)

    if (currentSubscription?.name && currentSubscriptionName === plan.name) {
      Alert.alert("Same Plan Selected", "You already have this subscription plan.")
      return
    }

    if (currentIsActive && !currentPlanIsFree && selectedIsFree) {
      Alert.alert(
        "Downgrade Not Allowed",
        "Your current subscription will remain active until it expires. You can switch to the free plan after expiry.",
        [{ text: "OK" }]
      )
      return
    }

    if (selectedIsFree) {
      try {
        setProcessing(true)
        const result = await switchToFreePlan()

        if (result?.success) {
          await refreshUserState()
          Alert.alert("Success", "You have successfully switched to the Free Plan!", [
            {
              text: "OK",
              onPress: loadData,
            },
          ])
        } else {
          throw new Error(result?.message || "Failed to switch to free plan")
        }
      } catch (error) {
        console.error("Error switching to free plan:", error)
        Alert.alert("Error", error.message || "Failed to switch to free plan")
      } finally {
        setProcessing(false)
      }
      return
    }

    if (currentIsActive && !currentPlanIsFree) {
      const currentPlan = plans.find((item) => item.name === currentSubscriptionName)

      if (currentPlan && Number(plan.price) < Number(currentPlan.price)) {
        Alert.alert(
          "Downgrade Not Allowed",
          "You cannot downgrade from your current active plan. Please wait until it expires before selecting a lower-priced plan.",
          [{ text: "OK" }]
        )
        return
      }
    }

    openPaymentModal(plan)
  }

  const handleProceedToPayment = async () => {
    if (!selectedPlan) {
      return
    }

    const phoneResult = normalizeKenyanPhoneNumber(phoneNumber)
    if (!phoneResult.isValid) {
      Alert.alert("Invalid phone number", phoneResult.message)
      return
    }

    try {
      setProcessing(true)
      setPaymentMessage("Calculating the final amount...")

      const subscriptionRecordName = await resolveSubscriptionRecordName()
      const normalizedPhone = phoneResult.normalized

      const costInfo = await calculateSubscriptionUpgradeCost(subscriptionRecordName, selectedPlan.name)
      const amountToPay = Number(costInfo?.amount_to_pay ?? selectedPlan.price)
      const currency = costInfo?.currency || selectedPlan.currency || "KES"
      const creditAmount = Number(costInfo?.credit_from_old_plan || 0)
      const daysRemaining = Number(costInfo?.days_remaining || 0)

      Alert.alert(
        "Confirm STK Push",
        `Plan: ${selectedPlan.subscription_name}\nAmount: ${currency} ${amountToPay.toLocaleString()}${creditAmount > 0 ? `\nCredit: -${currency} ${creditAmount.toLocaleString()} (${daysRemaining} days remaining)` : ""}\nPhone: ${normalizedPhone}\n\nProceed to send the M-Pesa STK push?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => setProcessing(false) },
          {
            text: "Send STK Push",
            onPress: async () => {
              try {
                setPaymentMessage("Sending M-Pesa STK push...")

                const paymentResult = await initiateSubscriptionPayment(
                  subscriptionRecordName,
                  selectedPlan.name,
                  normalizedPhone,
                  amountToPay
                )

                if (paymentResult?.success && paymentResult?.transaction_id) {
                  setPaymentMessage("STK push sent. Complete the prompt on your phone.")
                  startStatusPolling(paymentResult.transaction_id)
                  Alert.alert(
                    "STK Push Sent",
                    paymentResult?.message || "Check your phone and enter your M-Pesa PIN to complete payment."
                  )
                  return
                }

                throw new Error(paymentResult?.message || "Failed to initiate payment")
              } catch (error) {
                console.error("Error initiating subscription payment:", error)
                setProcessing(false)
                setPaymentMessage("")
                Alert.alert("Error", error.message || "Failed to initiate payment")
              }
            },
          },
        ]
      )
    } catch (error) {
      console.error("Error preparing subscription payment:", error)
      setProcessing(false)
      setPaymentMessage("")
      Alert.alert("Error", error.message || "Failed to prepare payment")
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return null
    const parsed = new Date(dateString)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  }

  const sortedPlans = [...plans].sort((left, right) => Number(left.price || 0) - Number(right.price || 0))

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#357AFF" />
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <StatusBar style="dark" />

      <View
        style={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 20,
          paddingBottom: 20,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: pressed ? "#F1F5F9" : "transparent",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            })}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </Pressable>
          <Crown size={28} color="#8B5CF6" />
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937", marginLeft: 12 }}>
            Subscription Plans
          </Text>
        </View>
        <Text style={{ fontSize: 14, color: "#6B7280", marginLeft: 52 }}>
          Manage your Tookio subscription and pay through M-Pesa STK push
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {currentSubscription && (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#1F2937", marginBottom: 12 }}>
              Current Plan
            </Text>
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 16,
                borderWidth: 2,
                borderColor: normalizeText(currentSubscription.status) === "expired" ? "#EF4444" : "#10B981",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
                {currentPlanLabel}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                <View
                  style={{
                    backgroundColor: normalizeText(currentSubscription.status) === "expired" ? "#FEE2E2" : "#ECFDF3",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: normalizeText(currentSubscription.status) === "expired" ? "#B91C1C" : "#166534",
                    }}
                  >
                    {(currentSubscription.status || "Active").toUpperCase()}
                  </Text>
                </View>
                {formatDate(currentSubscription.subscription_end_date) && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: normalizeText(currentSubscription.status) === "expired" ? "#B91C1C" : "#6B7280",
                      marginLeft: 10,
                      marginTop: 4,
                    }}
                  >
                    {normalizeText(currentSubscription.status) === "expired" ? "Expired on" : "Renews on"} {formatDate(currentSubscription.subscription_end_date)}
                  </Text>
                )}
              </View>

              {limits && (
                <View style={{ marginTop: 12, gap: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>Shops</Text>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: limits.shops?.exceeded ? "#EF4444" : "#10B981" }}>
                      {limits.shops?.used ?? 0} / {limits.shops?.limit ?? "N/A"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>Products</Text>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: limits.products?.exceeded ? "#EF4444" : "#10B981" }}>
                      {limits.products?.used ?? 0} / {limits.products?.limit ?? "N/A"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>Sales Invoices</Text>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: limits.sales_invoices?.exceeded ? "#EF4444" : "#10B981" }}>
                      {limits.sales_invoices?.used ?? 0} / {limits.sales_invoices?.limit ?? "N/A"}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ padding: 20, paddingTop: 0 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#1F2937", marginBottom: 12 }}>
            Available Plans
          </Text>

          {sortedPlans.length === 0 ? (
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 20,
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <Text style={{ color: "#6B7280" }}>No subscription plans are available right now.</Text>
            </View>
          ) : (
            sortedPlans.map((plan) => {
              const isCurrentPlan = currentSubscription?.current_subscription === plan.name || currentPlanLabel === plan.subscription_name
              const planColor = plan.price > 0 ? "#7C3AED" : "#6B7280"
              const salesLimit = plan.sales_invoice_limit === null || plan.sales_invoice_limit === undefined || plan.sales_invoice_limit === 0
                ? "Unlimited"
                : `${plan.sales_invoice_limit} Sales Invoices`

              return (
                <View
                  key={plan.name}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 12,
                    borderWidth: isCurrentPlan ? 2 : 1,
                    borderColor: isCurrentPlan ? planColor : "#E5E7EB",
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 20, fontWeight: "bold", color: "#1F2937" }}>
                        {plan.subscription_name}
                      </Text>
                      {plan.description ? (
                        <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
                          {plan.description}
                        </Text>
                      ) : null}
                    </View>
                    {isCurrentPlan && (
                      <View
                        style={{
                          backgroundColor: `${planColor}15`,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: "600", color: planColor }}>
                          CURRENT
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ marginTop: 16 }}>
                    <Text style={{ fontSize: 32, fontWeight: "bold", color: planColor }}>
                      {formatCurrency(plan.price)}
                      <Text style={{ fontSize: 14, fontWeight: "normal", color: "#6B7280" }}>/month</Text>
                    </Text>
                    <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                      Currency: {plan.currency || "KES"}
                    </Text>
                  </View>

                  <View style={{ marginTop: 16, gap: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Store size={16} color={planColor} />
                      <Text style={{ fontSize: 14, color: "#374151", marginLeft: 8 }}>
                        {plan.shop_limit === 0 ? "Unlimited Shops" : `${plan.shop_limit} ${plan.shop_limit === 1 ? "Shop" : "Shops"}`}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Package size={16} color={planColor} />
                      <Text style={{ fontSize: 14, color: "#374151", marginLeft: 8 }}>
                        {plan.products_limit === 0 ? "Unlimited Products" : `${plan.products_limit} Products`}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <FileText size={16} color={planColor} />
                      <Text style={{ fontSize: 14, color: "#374151", marginLeft: 8 }}>
                        {salesLimit}
                      </Text>
                    </View>
                  </View>

                  {!isCurrentPlan && (
                    <Pressable
                      onPress={() => handleSelectPlan(plan)}
                      disabled={processing}
                      style={({ pressed }) => ({
                        backgroundColor: planColor,
                        borderRadius: 8,
                        paddingVertical: 12,
                        marginTop: 16,
                        alignItems: "center",
                        opacity: pressed || processing ? 0.8 : 1,
                      })}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
                        {plan.price === 0 ? "Switch to Free" : "Pay with M-Pesa"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!processing) {
            setPaymentModalVisible(false)
            setSelectedPlan(null)
            setPhoneNumber("")
            setPaymentMessage("")
          }
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "flex-end",
            }}
          >
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }} keyboardShouldPersistTaps="handled">
              <View
                style={{
                  backgroundColor: "#fff",
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  padding: 20,
                  paddingBottom: insets.bottom + 20,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <Text style={{ fontSize: 20, fontWeight: "bold", color: "#1F2937" }}>
                    M-Pesa Subscription Payment
                  </Text>
                  {!processing && (
                    <Pressable
                      onPress={() => {
                        setPaymentModalVisible(false)
                        setSelectedPlan(null)
                        setPhoneNumber("")
                        setPaymentMessage("")
                      }}
                      style={{ padding: 4 }}
                    >
                      <X size={24} color="#6B7280" />
                    </Pressable>
                  )}
                </View>

                {selectedPlan && (
                  <View>
                    <View
                      style={{
                        backgroundColor: "#F3F4F6",
                        padding: 16,
                        borderRadius: 12,
                        marginBottom: 16,
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
                        {selectedPlan.subscription_name}
                      </Text>
                      <Text style={{ fontSize: 24, fontWeight: "bold", color: "#357AFF", marginTop: 4 }}>
                        {formatCurrency(selectedPlan.price)}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                        {selectedPlan.currency || "KES"} per month
                      </Text>
                    </View>

                    <View
                      style={{
                        backgroundColor: "#EFF6FF",
                        padding: 16,
                        borderRadius: 12,
                        marginBottom: 16,
                        borderLeftWidth: 4,
                        borderLeftColor: "#3B82F6",
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#1E40AF", marginBottom: 8 }}>
                        Subscription details
                      </Text>
                      <Text style={{ fontSize: 13, color: "#1E3A8A", lineHeight: 18 }}>
                        This plan comes directly from the Tookio Subscription doctype and will be charged using the same M-Pesa STK push flow as the desktop subscription manager.
                      </Text>
                    </View>

                    <View style={{ marginBottom: 20, gap: 10 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: "#6B7280" }}>Shop limit</Text>
                        <Text style={{ fontWeight: "600", color: "#111827" }}>
                          {selectedPlan.shop_limit === 0 ? "Unlimited" : selectedPlan.shop_limit}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: "#6B7280" }}>Products limit</Text>
                        <Text style={{ fontWeight: "600", color: "#111827" }}>
                          {selectedPlan.products_limit === 0 ? "Unlimited" : selectedPlan.products_limit}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: "#6B7280" }}>Sales invoice limit</Text>
                        <Text style={{ fontWeight: "600", color: "#111827" }}>
                          {selectedPlan.sales_invoice_limit === 0 || selectedPlan.sales_invoice_limit === null || selectedPlan.sales_invoice_limit === undefined
                            ? "Unlimited"
                            : selectedPlan.sales_invoice_limit}
                        </Text>
                      </View>
                    </View>

                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6 }}>
                        M-Pesa Phone Number *
                      </Text>
                      <TextInput
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        placeholder="0712345678, 0112345678, or 2547XXXXXXXX"
                        keyboardType="phone-pad"
                        autoCapitalize="none"
                        style={{
                          backgroundColor: "#F9FAFB",
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          fontSize: 14,
                          color: "#1F2937",
                        }}
                        editable={!processing}
                      />
                    </View>

                    {paymentMessage ? (
                      <View
                        style={{
                          backgroundColor: "#F8FAFC",
                          borderRadius: 10,
                          padding: 12,
                          marginBottom: 16,
                          borderWidth: 1,
                          borderColor: "#E2E8F0",
                        }}
                      >
                        <Text style={{ color: "#334155", fontSize: 13 }}>{paymentMessage}</Text>
                      </View>
                    ) : null}

                    <Pressable
                      onPress={handleProceedToPayment}
                      disabled={processing}
                      style={({ pressed }) => ({
                        backgroundColor: processing ? "#94A3B8" : "#10B981",
                        borderRadius: 12,
                        paddingVertical: 16,
                        alignItems: "center",
                        opacity: pressed || processing ? 0.85 : 1,
                      })}
                    >
                      {processing ? (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <ActivityIndicator color="#fff" />
                          <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff", marginLeft: 10 }}>
                            Processing...
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
                          Send STK Push
                        </Text>
                      )}
                    </Pressable>

                    <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center" }}>
                      <Check size={16} color="#10B981" />
                      <Text style={{ fontSize: 12, color: "#6B7280", marginLeft: 8, flex: 1 }}>
                        You will receive a prompt on your phone to complete the payment.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
