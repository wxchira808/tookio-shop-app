import { ActivityIndicator, Alert, Linking, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, handleApiError } from "@/utils/auth/useAuth";
import { AdBanner } from "@/components/AdBanner";
import useUser from "@/utils/auth/useUser";
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  User,
} from "lucide-react-native";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { refreshUserDetails, updateUserProfile } from "@/utils/frappeApi";
import { getStorageItem, setJsonStorageItem } from "@/utils/authStorage";
import { authKey } from "@/utils/auth/store";
import {
  AppButton,
  Card,
  FormField,
  IconButton,
  PageHeader,
  Screen,
  Section,
} from "@/components/frappe-ui";
import { colors, spacing, type } from "@/theme/frappeTheme";

export default function AccountDetails() {
  const insets = useSafeAreaInsets();
  const { signOut, setAuth } = useAuth();
  const { data: user, loading } = useUser();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setFullName(user?.name || "");
    setEmail(user?.email || "");
  }, [user?.email, user?.name]);

  const persistRefreshedAuth = useCallback(async () => {
    const updatedUser = await refreshUserDetails();
    const authData = await getStorageItem(authKey);

    if (!authData) {
      return;
    }

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
  }, [setAuth]);

  const handleUpdateProfile = useCallback(async () => {
    if (!fullName.trim()) {
      Alert.alert("Missing name", "Enter your full name first.");
      return;
    }

    try {
      setUpdating(true);
      const result = await updateUserProfile({ first_name: fullName.trim() });

      if (!result.success) {
        Alert.alert("Could not update profile", result.error || "Please try again.");
        return;
      }

      await persistRefreshedAuth();
      Alert.alert("Profile updated", "Your account details have been saved.");
    } catch (error) {
      console.error("Error updating profile:", error);
      if (!handleApiError(error, signOut)) {
        Alert.alert("Could not update profile", "Please try again.");
      }
    } finally {
      setUpdating(false);
    }
  }, [fullName, persistRefreshedAuth, signOut]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword) {
      Alert.alert("Missing password", "Enter your current password.");
      return;
    }

    if (!newPassword) {
      Alert.alert("Missing password", "Enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Weak password", "Your new password should be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords don't match", "Please confirm the same new password.");
      return;
    }

    try {
      setChangingPassword(true);
      const result = await updateUserProfile({
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (!result.success) {
        Alert.alert("Could not change password", result.error || "Please try again.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Password updated", "Your password has been changed.");
    } catch (error) {
      console.error("Error changing password:", error);
      if (!handleApiError(error, signOut)) {
        Alert.alert("Could not change password", "Please try again.");
      }
    } finally {
      setChangingPassword(false);
    }
  }, [confirmPassword, currentPassword, newPassword, signOut]);

  const handleDeleteAccount = useCallback(() => {
    Linking.openURL("https://shop.tookio.co.ke/account-deletion-request").catch(() => {
      Alert.alert("Could not open page", "Please try again in a moment.");
    });
  }, []);

  const passwordToggle = (visible, toggle) => (
    <IconButton
      icon={visible ? EyeOff : Eye}
      onPress={toggle}
    />
  );

  if (loading) {
    return (
      <Screen insets={insets}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md }}>
          <ActivityIndicator size="large" color={colors.inkGray6} />
          <Text style={type.bodyMuted}>Loading account settings...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      insets={insets}
      contentStyle={{ paddingBottom: 24 }}
    >
      <StatusBar style="dark" />
      <PageHeader
        title="Account settings"
        left={
          <IconButton
            icon={ArrowLeft}
            onPress={() => router.replace("/(tabs)/profile")}
          />
        }
      />

      <Section label="Profile">
        <Card style={{ padding: spacing.xl }}>
          <FormField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            autoCapitalize="words"
          />
          <FormField
            label="Email"
            value={email}
            editable={false}
            helperText="Email address can't be changed from the app."
          />
          <AppButton
            label={updating ? "Saving..." : "Save profile"}
            onPress={handleUpdateProfile}
            disabled={updating}
            icon={User}
            style={{ marginTop: spacing.sm }}
          />
        </Card>
      </Section>

      <Section label="Password">
        <Card style={{ padding: spacing.xl }}>
          <FormField
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            secureTextEntry={!showCurrentPassword}
            autoCapitalize="none"
            right={passwordToggle(showCurrentPassword, () => setShowCurrentPassword((value) => !value))}
          />
          <FormField
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            secureTextEntry={!showNewPassword}
            autoCapitalize="none"
            helperText="Use at least 6 characters."
            right={passwordToggle(showNewPassword, () => setShowNewPassword((value) => !value))}
          />
          <FormField
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            right={passwordToggle(showConfirmPassword, () => setShowConfirmPassword((value) => !value))}
          />
          <AppButton
            label={changingPassword ? "Updating..." : "Change password"}
            onPress={handleChangePassword}
            disabled={changingPassword}
            icon={Lock}
            style={{ marginTop: spacing.sm }}
          />
        </Card>
      </Section>

      <Section label="Danger zone">
        <Card style={{ padding: spacing.xl, gap: spacing.md }}>
          <Text style={type.body}>
            Send an account deletion request if you want your Tookio Shop data removed permanently.
          </Text>
          <AppButton
            label="Request account deletion"
            onPress={handleDeleteAccount}
            variant="outline"
            theme="red"
            icon={AlertTriangle}
          />
        </Card>
      </Section>

      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xl }}>
        <AdBanner variant="slim" context="profile" />
      </View>
    </Screen>
  );
}
