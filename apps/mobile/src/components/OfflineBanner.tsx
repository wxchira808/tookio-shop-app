import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useOnlineStatus } from '../utils/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useOnlineStatus();
  if (isOnline) return null;
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.banner}>
        <Text style={styles.text}>You're offline</Text>
        <Text style={styles.subtext}>Check your internet connection</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  banner: {
    backgroundColor: '#111827',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#374151',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
  },
  subtext: {
    marginTop: 4,
    color: '#CBD5F5',
    fontSize: 12,
    fontWeight: '500',
  },
});
