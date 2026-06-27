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
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 56,
  },
  banner: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#111827',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#374151',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  text: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '700',
  },
  subtext: {
    marginTop: 4,
    color: '#CBD5F5',
    fontSize: 11,
    fontWeight: '500',
  },
});
