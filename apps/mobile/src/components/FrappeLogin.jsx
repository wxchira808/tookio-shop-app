import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, LogIn } from 'lucide-react-native';
import { login } from '@/utils/frappeApi';
import { useAuthStore } from '@/utils/auth/store';

/**
 * Frappe Login Component
 * Native login form for Frappe authentication
 */
export const FrappeLogin = ({ onClose }) => {
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      const authData = await login(email.trim(), password);

      // Save auth data to store
      setAuth(authData);

      Alert.alert('Success', 'Logged in successfully!');

      // Close the modal
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 20,
            paddingBottom: insets.bottom + 20,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingBottom: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#1F2937',
              }}
            >
              Login to Tookio Shop
            </Text>
            <Pressable
              onPress={onClose}
              style={{ padding: 4 }}
            >
              <X size={24} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            <View style={{ padding: 20, gap: 20 }}>
              {/* Email Input */}
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: 8,
                  }}
                >
                  Email
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    backgroundColor: '#fff',
                  }}
                />
              </View>

              {/* Password Input */}
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: 8,
                  }}
                >
                  Password
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    backgroundColor: '#fff',
                  }}
                />
              </View>

              {/* Login Button */}
              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => ({
                  backgroundColor: '#10B981',
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  opacity: pressed || loading ? 0.7 : 1,
                  marginTop: 8,
                })}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <LogIn size={20} color="#fff" />
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: '#fff',
                        marginLeft: 8,
                      }}
                    >
                      Login
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Info Text */}
              <Text
                style={{
                  fontSize: 14,
                  color: '#6B7280',
                  textAlign: 'center',
                  marginTop: 12,
                }}
              >
                Use your Tookio Shop credentials to login
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default FrappeLogin;
