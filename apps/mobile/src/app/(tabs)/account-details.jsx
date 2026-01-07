import { View, Text, ScrollView, Pressable, Alert, TextInput, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, handleApiError } from "@/utils/auth/useAuth";
import { AdBanner } from "@/components/AdBanner";
import useUser from "@/utils/auth/useUser";
import {
  User,
  Mail,
  Lock,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
} from "lucide-react-native";
import { router } from "expo-router";
import { useState, useCallback } from "react";
import { updateUserProfile, refreshUserDetails } from "@/utils/frappeApi";
import * as SecureStore from "expo-secure-store";
import { authKey } from "@/utils/auth/store";
import { Linking } from "react-native";

export default function AccountDetails() {
  const insets = useSafeAreaInsets();
  const { signOut, setAuth } = useAuth();
  const { data: user, loading } = useUser();

  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [updating, setUpdating] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Update profile information
  const handleUpdateProfile = useCallback(async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Full name is required");
      return;
    }

    try {
      setUpdating(true);

      const result = await updateUserProfile({
        first_name: fullName.trim(),
      });

      if (result.success) {
        // Refresh user details
        const updatedUser = await refreshUserDetails();

        // Update stored auth data
        const authData = await SecureStore.getItemAsync(authKey);
        if (authData) {
          const auth = JSON.parse(authData);
          const updatedAuth = {
            ...auth,
            user: {
              ...auth.user,
              ...updatedUser,
            },
          };
          await SecureStore.setItemAsync(authKey, JSON.stringify(updatedAuth));
          setAuth(updatedAuth);
        }

        Alert.alert("Success", "Profile updated successfully");
      } else {
        Alert.alert("Error", result.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      if (!handleApiError(error, signOut)) {
        Alert.alert("Error", "Failed to update profile");
      }
    } finally {
      setUpdating(false);
    }
  }, [fullName, setAuth, signOut]);

  // Change password
  const handleChangePassword = useCallback(async () => {
    if (!currentPassword) {
      Alert.alert("Error", "Current password is required");
      return;
    }

    if (!newPassword) {
      Alert.alert("Error", "New password is required");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    try {
      setChangingPassword(true);

      const result = await updateUserProfile({
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (result.success) {
        Alert.alert("Success", "Password changed successfully", [
          {
            text: "OK",
            onPress: () => {
              // Clear password fields
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            },
          },
        ]);
      } else {
        Alert.alert("Error", result.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      if (!handleApiError(error, signOut)) {
        Alert.alert("Error", "Failed to change password");
      }
    } finally {
      setChangingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword, signOut]);

  // Handle delete account
  const handleDeleteAccount = useCallback(() => {
    // Open the account deletion request web form
    const deletionUrl = "https://shop.tookio.co.ke/account-deletion-request";
    Linking.openURL(deletionUrl).catch((err) => {
      Alert.alert("Error", "Could not open account deletion page");
    });
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FAFAFA",
          paddingTop: insets.top,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ fontSize: 16, color: "#64748B", marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

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
          <ArrowLeft size={22} color="#0F172A" />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0F172A", letterSpacing: -0.5 }}>
          Account Details
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Information */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: "#F1F5F9",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 20,
                letterSpacing: -0.3,
              }}
            >
              Profile Information
            </Text>

            {/* Full Name */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 8,
                  letterSpacing: -0.1,
                }}
              >
                Full Name
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <User size={20} color="#9CA3AF" />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: "#111827",
                    marginLeft: 12,
                  }}
                  placeholder="Enter your full name"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email (Read-only) */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 8,
                  letterSpacing: -0.1,
                }}
              >
                Email Address
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: "#F9FAFB",
                }}
              >
                <Mail size={20} color="#9CA3AF" />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: "#6B7280",
                    marginLeft: 12,
                  }}
                >
                  {email}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                Email cannot be changed
              </Text>
            </View>

            {/* Update Profile Button */}
            <Pressable
              onPress={handleUpdateProfile}
              disabled={updating}
              style={({ pressed }) => ({
                backgroundColor: updating ? "#9CA3AF" : "#10B981",
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed && !updating ? 0.9 : 1,
              })}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Check size={20} color="#FFFFFF" />
              )}
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#FFFFFF",
                  marginLeft: 8,
                  letterSpacing: -0.3,
                }}
              >
                {updating ? "Updating..." : "Update Profile"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Password Change */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: "#F1F5F9",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 20,
                letterSpacing: -0.3,
              }}
            >
              Change Password
            </Text>

            {/* Current Password */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 8,
                  letterSpacing: -0.1,
                }}
              >
                Current Password
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Lock size={20} color="#9CA3AF" />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: "#111827",
                    marginLeft: 12,
                  }}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={{ padding: 4 }}
                >
                  {showCurrentPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* New Password */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 8,
                  letterSpacing: -0.1,
                }}
              >
                New Password
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Lock size={20} color="#9CA3AF" />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: "#111827",
                    marginLeft: 12,
                  }}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={{ padding: 4 }}
                >
                  {showNewPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Confirm New Password */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 8,
                  letterSpacing: -0.1,
                }}
              >
                Confirm New Password
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Lock size={20} color="#9CA3AF" />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: "#111827",
                    marginLeft: 12,
                  }}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ padding: 4 }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Change Password Button */}
            <Pressable
              onPress={handleChangePassword}
              disabled={changingPassword}
              style={({ pressed }) => ({
                backgroundColor: changingPassword ? "#9CA3AF" : "#3B82F6",
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed && !changingPassword ? 0.9 : 1,
              })}
            >
              {changingPassword ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Lock size={20} color="#FFFFFF" />
              )}
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#FFFFFF",
                  marginLeft: 8,
                  letterSpacing: -0.3,
                }}
              >
                {changingPassword ? "Changing..." : "Change Password"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Delete Account */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: "#F1F5F9",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 12,
                letterSpacing: -0.3,
              }}
            >
              Account Deletion
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#6B7280",
                marginBottom: 20,
                lineHeight: 20,
              }}
            >
              Request to delete your account and all associated data. This action cannot be undone.
            </Text>

            <Pressable
              onPress={handleDeleteAccount}
              style={({ pressed }) => ({
                backgroundColor: "#EF4444",
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <AlertTriangle size={20} color="#FFFFFF" />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#FFFFFF",
                  marginLeft: 8,
                  letterSpacing: -0.3,
                }}
              >
                Request Account Deletion
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Slim Ad Banner */}
      <AdBanner variant="slim" />
    </View>
  );
}