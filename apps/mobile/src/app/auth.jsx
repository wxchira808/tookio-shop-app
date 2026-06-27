import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "@/utils/auth/useAuth";
import { login, resetPassword, signup } from "@/utils/frappeApi";
import {
  AppButton,
  BottomSheet,
  Card,
  FormField,
} from "@/components/frappe-ui";
import { colors, radius, spacing, type } from "@/theme/frappeTheme";

const showAlert = (title, message, buttons) => {
  if (Platform.OS === "web") {
    alert(`${title}: ${message}`);
    if (buttons && buttons.length > 0 && typeof buttons[0].onPress === "function") {
      buttons[0].onPress();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuth();

  const handleSignIn = async () => {
    if (!email || !password) {
      showAlert("Missing details", "Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      setAuth({ user: result.user, logged_in: true });
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Login failed error:", error);
      showAlert("Login failed", error.message || "Check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !fullName) {
      showAlert("Missing details", "Enter your full name and email.");
      return;
    }

    setLoading(true);
    try {
      const result = await signup(email, fullName);
      showAlert(
        "Check your email",
        result.message || "Open the link we sent, set your password, then come back and sign in.",
        [{ text: "OK", onPress: () => setMode("signin") }]
      );
    } catch (error) {
      console.error("Signup failed error:", error);
      showAlert("Signup failed", error.message || "We could not create your account.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      showAlert("Missing email", "Enter the email for your account.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(resetEmail);
      showAlert("Reset link sent", "Check your email for the reset link.");
      setResetMode(false);
      setResetEmail("");
    } catch (error) {
      console.error("Reset password failed error:", error);
      showAlert("Reset failed", error.message || "We could not send the reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceBase }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: spacing.xl,
            justifyContent: "center",
            backgroundColor: colors.surfaceBase,
          }}
        >
          <View style={{ alignItems: "center", marginBottom: spacing.xl }}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={{ width: 180, height: 48, resizeMode: "contain", marginBottom: spacing.sm }}
            />
            <Text style={[type.bodyMuted, { fontSize: 13, textAlign: "center", paddingHorizontal: 20 }]}>
              {mode === "signin"
                ? "Sign in to manage your shops, stock, and sales."
                : "Create your account to start selling with Tookio Shop."}
            </Text>
          </View>

          <Card style={{ padding: spacing.xl, borderRadius: radius.md }}>
            {mode === "signup" ? (
              <FormField
                label="Full name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Jane Wanjiku"
              />
            ) : null}

            <FormField
              label={mode === "signin" ? "Email or username" : "Email"}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
            />

            {mode === "signin" ? (
              <FormField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                secureTextEntry={!showPassword}
                right={
                  <Pressable onPress={() => setShowPassword((current) => !current)}>
                    {showPassword ? (
                      <EyeOff size={18} color={colors.inkGray5} strokeWidth={1.8} />
                    ) : (
                      <Eye size={18} color={colors.inkGray5} strokeWidth={1.8} />
                    )}
                  </Pressable>
                }
              />
            ) : null}

            <AppButton
              label={loading ? "Please wait" : mode === "signin" ? "Sign in" : "Send verification email"}
              onPress={mode === "signin" ? handleSignIn : handleSignUp}
              theme="blue"
              disabled={loading}
              style={{ marginTop: spacing.sm }}
            />

            {loading ? (
              <View style={{ paddingTop: spacing.md }}>
                <ActivityIndicator color={colors.inkGray6} />
              </View>
            ) : null}

            {mode === "signin" ? (
              <Pressable
                onPress={() => setResetMode(true)}
                style={{ alignSelf: "flex-end", marginTop: spacing.sm }}
              >
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#64748B" }}>
                  Forgot password?
                </Text>
              </Pressable>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", marginVertical: spacing.lg }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E2E8F0" }} />
              <Text style={{ marginHorizontal: 12, fontSize: 11, fontWeight: "600", color: "#94A3B8" }}>
                OR
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E2E8F0" }} />
            </View>

            <AppButton
              label={mode === "signin" ? "Create an account" : "Sign in to your account"}
              onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
              theme="blue"
              variant="outline"
              disabled={loading}
            />
          </Card>
        </View>
      </KeyboardAvoidingView>

      <BottomSheet visible={resetMode} onClose={() => setResetMode(false)} title="Reset password">
        <View style={{ padding: spacing.xl }}>
          <FormField
            label="Email"
            value={resetEmail}
            onChangeText={setResetEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
          />
          <AppButton
            label={loading ? "Sending" : "Send reset link"}
            onPress={handleResetPassword}
            disabled={loading}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
