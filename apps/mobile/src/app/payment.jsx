import { View, Text, ScrollView, Pressable, Alert, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Heart, CreditCard, Copy, Smartphone } from "lucide-react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Clipboard from 'expo-clipboard';

export default function DonateScreen() {
  const insets = useSafeAreaInsets();

  const handleDonate = async () => {
    try {
      // Open PayPal donation page
      await WebBrowser.openBrowserAsync('https://www.paypal.com/donate?hosted_button_id=642Y6XCHLBJFE');
    } catch (error) {
      Alert.alert("Error", "Unable to open PayPal. Please try again.");
    }
  };

  const handleCopyMpesaNumber = async () => {
    try {
      await Clipboard.setStringAsync('0743169908');
      Alert.alert("Copied!", "M-Pesa number copied to clipboard");
    } catch (error) {
      Alert.alert("Error", "Failed to copy number");
    }
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: "#FAFAFA", paddingTop: insets.top }}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: "#FFFFFF",
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: "#F1F5F9",
        }}
      >
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
          <ArrowLeft size={22} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <Image
          source={require('@/assets/images/icon.png')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            marginRight: 12,
          }}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#0F172A", letterSpacing: -0.5 }}>
            Support
          </Text>
          <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
            Help us keep the app free and awesome
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Content */}
        <View style={{ paddingHorizontal: 20, paddingTop: 40, alignItems: "center" }}>
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: "#FEF2F2",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Heart size={60} color="#EF4444" strokeWidth={2} />
          </View>

          <Text style={{ fontSize: 24, fontWeight: "800", color: "#0F172A", textAlign: "center", marginBottom: 12 }}>
            Tookio Shop is Free! 🎉
          </Text>

          <Text style={{ fontSize: 16, color: "#64748B", textAlign: "center", lineHeight: 24, marginBottom: 32 }}>
            We're committed to keeping Tookio Shop completely free for everyone. No subscriptions, no hidden fees, no premium features.
          </Text>

          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A", textAlign: "center", marginBottom: 16 }}>
            Enjoy the full experience!
          </Text>

          <Text style={{ fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 20, marginBottom: 40 }}>
            • Unlimited shops and products{'\n'}
            • Full inventory management{'\n'}
            • Sales tracking and analytics{'\n'}
            • Customer management{'\n'}
            • Export and reporting features
          </Text>

          <Pressable
            onPress={handleDonate}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#DC2626" : "#EF4444",
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 32,
              alignItems: "center",
              marginBottom: 16,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
              ❤️ Donate with PayPal
            </Text>
          </Pressable>

          <Pressable
            onPress={handleCopyMpesaNumber}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#16A34A" : "#22C55E",
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 32,
              alignItems: "center",
              marginBottom: 16,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
              💚 Donate with M-Pesa
            </Text>
          </Pressable>

          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginBottom: 8 }}>
              Secure donations powered by PayPal
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <CreditCard size={16} color="#0070BA" strokeWidth={2} />
              <Text style={{ fontSize: 12, color: "#0070BA", marginLeft: 6, fontWeight: "600" }}>
                PayPal
              </Text>
            </View>
          </View>

          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <Text style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginBottom: 8 }}>
              Send directly to M-Pesa number
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Smartphone size={16} color="#22C55E" strokeWidth={2} />
              <Text style={{ fontSize: 14, color: "#0F172A", marginLeft: 6, fontWeight: "600", fontFamily: "monospace" }}>
                0743169908
              </Text>
              <Pressable
                onPress={handleCopyMpesaNumber}
                style={{ marginLeft: 8, padding: 4 }}
              >
                <Copy size={14} color="#64748B" strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          <Text style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", lineHeight: 18 }}>
            Your support helps us maintain and improve Tookio Shop.{'\n'}
            Every contribution makes a difference! 🙏{'\n'}
            Donations are processed securely through PayPal or M-Pesa.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/*
================================================================================
ARCHIVED PAYMENT CODE - Keeping for future reference if needed
================================================================================

Old PaymentScreen with Pesapal, M-Pesa, and Card payment integrations.
If you need to implement paid subscriptions in the future, reference this code.

Key archived functions:
- handleCardPayment() - Stripe integration (requires Stripe API key)
- handleMpesaPayment() - M-Pesa STK Push (Kenya mobile money)
- handlePesapalPayment() - Pesapal multi-payment gateway (cards, mobile money, bank transfer)

Old PaymentScreen UI included:
- Order summary with plan name and price
- Payment method selection (Card, M-Pesa, Pesapal)
- Security information section
- Processing overlay with loading state

To restore paid subscriptions:
1. Uncomment archived subscription plans in subscription.jsx
2. Restore payment handlers in payment.jsx
3. Re-enable payment API integration with subscriptionApi.js
4. Test with your preferred payment processor

IMPORTANT: Tookio Shop is now 100% FREE with optional PayPal donations!

================================================================================
*/
