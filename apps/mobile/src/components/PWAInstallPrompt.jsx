import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { X, Download } from 'lucide-react-native';
import { colors, spacing } from '@/theme/frappeTheme';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Only run on web
    if (Platform.OS !== 'web') return;

    // Check if it's already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone === true;
      
    if (isStandalone) return;

    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // iOS doesn't support beforeinstallprompt, just show instructions
      setShowPrompt(true);
    } else {
      // Listen for Android/Chrome install prompt
      const handleBeforeInstallPrompt = (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        setDeferredPrompt(e);
        setShowPrompt(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) return null;

  return (
    <View style={{
      position: 'absolute',
      bottom: spacing.xl,
      left: spacing.md,
      right: spacing.md,
      backgroundColor: colors.surfaceBase,
      borderRadius: 12,
      padding: spacing.md,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 1,
      borderColor: colors.outlineGray1,
      zIndex: 9999,
      flexDirection: 'row',
      alignItems: 'center'
    }}>
      <View style={{ width: 40, height: 40, backgroundColor: '#EFF6FF', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
        <Download size={20} color="#3B82F6" />
      </View>
      
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inkGray8 }}>Install Tookio Shop</Text>
        {isIOS ? (
          <Text style={{ fontSize: 13, color: colors.inkGray6, marginTop: 4 }}>
            Tap Share <Text style={{fontWeight: 'bold'}}>↑</Text> then "Add to Home Screen"
          </Text>
        ) : (
          <Text style={{ fontSize: 13, color: colors.inkGray6, marginTop: 4 }}>
            Install this app on your home screen for quick access.
          </Text>
        )}
      </View>

      {!isIOS && deferredPrompt && (
        <Pressable 
          onPress={handleInstall}
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#2563EB' : '#3B82F6',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: 6,
            marginLeft: spacing.sm
          })}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Install</Text>
        </Pressable>
      )}

      <Pressable onPress={() => setShowPrompt(false)} style={{ padding: spacing.sm, marginLeft: spacing.sm }}>
        <X size={20} color={colors.inkGray4} />
      </Pressable>
    </View>
  );
}
