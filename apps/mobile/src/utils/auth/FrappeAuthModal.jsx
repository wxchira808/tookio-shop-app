import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { login, signup } from '@/utils/frappeApi';
import { useAuthStore } from './store';

export const FrappeAuthModal = ({ visible, onClose, mode = 'signin' }) => {
  const [currentMode, setCurrentMode] = useState(mode);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  // Form fields
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);

      // Store auth data
      setAuth({
        user: result.user,
        logged_in: true,
      });

      // Close modal
      onClose();

      Alert.alert('Success', 'Logged in successfully!');
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !username || !password || !fullName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await signup(email, username, password, fullName);

      // Store auth data
      setAuth({
        user: result.user,
        logged_in: true,
      });

      // Close modal
      onClose();

      Alert.alert('Success', 'Account created successfully!');
    } catch (error) {
      Alert.alert('Signup Failed', error.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setCurrentMode(currentMode === 'signin' ? 'signup' : 'signin');
    // Clear fields
    setEmail('');
    setUsername('');
    setPassword('');
    setFullName('');
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
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
              paddingBottom: 40,
            }}
          >
            <ScrollView>
              {/* Header */}
              <View
                style={{
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB',
                }}
              >
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: '#1F2937',
                    textAlign: 'center',
                  }}
                >
                  {currentMode === 'signin' ? 'Welcome Back!' : 'Create Account'}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: '#6B7280',
                    textAlign: 'center',
                    marginTop: 4,
                  }}
                >
                  {currentMode === 'signin'
                    ? 'Sign in to continue to Tookio Shop'
                    : 'Join Tookio Shop to manage your inventory'}
                </Text>
              </View>

              {/* Form */}
              <View style={{ padding: 20 }}>
                {currentMode === 'signup' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: 8,
                      }}
                    >
                      Full Name
                    </Text>
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Enter your full name"
                      placeholderTextColor="#9CA3AF"
                      style={{
                        backgroundColor: '#F9FAFB',
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        color: '#1F2937',
                      }}
                    />
                  </View>
                )}

                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
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
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{
                      backgroundColor: '#F9FAFB',
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: '#1F2937',
                    }}
                  />
                </View>

                {currentMode === 'signup' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: 8,
                      }}
                    >
                      Username
                    </Text>
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Choose a username"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="none"
                      style={{
                        backgroundColor: '#F9FAFB',
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        color: '#1F2937',
                      }}
                    />
                  </View>
                )}

                <View style={{ marginBottom: 24 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
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
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    style={{
                      backgroundColor: '#F9FAFB',
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      color: '#1F2937',
                    }}
                  />
                </View>

                {/* Submit Button */}
                <Pressable
                  onPress={currentMode === 'signin' ? handleSignIn : handleSignUp}
                  disabled={loading}
                  style={({ pressed }) => ({
                    backgroundColor: loading ? '#9CA3AF' : '#357AFF',
                    borderRadius: 12,
                    paddingVertical: 16,
                    alignItems: 'center',
                    marginBottom: 16,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: '#fff',
                      }}
                    >
                      {currentMode === 'signin' ? 'Sign In' : 'Create Account'}
                    </Text>
                  )}
                </Pressable>

                {/* Switch Mode */}
                <Pressable onPress={switchMode} style={{ paddingVertical: 8 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#357AFF',
                      textAlign: 'center',
                    }}
                  >
                    {currentMode === 'signin'
                      ? "Don't have an account? Sign Up"
                      : 'Already have an account? Sign In'}
                  </Text>
                </Pressable>

                {/* Cancel Button */}
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => ({
                    paddingVertical: 12,
                    alignItems: 'center',
                    marginTop: 8,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#6B7280',
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
