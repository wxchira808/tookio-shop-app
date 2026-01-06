import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { X } from 'lucide-react-native';
import { useShowAds } from '../utils/ads/useAdsManager';
import { router } from 'expo-router';

/**
 * Banner Ad Component
 * Shows upgrade prompts to free plan users
 * (AdMob integration temporarily disabled due to Expo compatibility issues)
 */
export const AdBanner = ({ style = {}, variant = 'default', context = 'dashboard' }) => {
  const showAds = useShowAds();
  const [dismissed, setDismissed] = React.useState(false);

  if (!showAds || dismissed) return null;

  // Context-specific upgrade prompts
  const getUpgradePromptForContext = (ctx) => {
    switch (ctx) {
      case 'shops':
        return {
          title: 'Upgrade to Pro',
          description: 'Unlock unlimited shops and advanced management',
          cta: 'Upgrade Now',
        };
      case 'items':
        return {
          title: 'Unlimited Inventory',
          description: 'Remove item limits and unlock advanced tracking',
          cta: 'Upgrade Now',
        };
      case 'sales':
        return {
          title: 'Unlimited Invoices',
          description: 'Generate unlimited sales invoices and reports',
          cta: 'Upgrade Now',
        };
      default: // dashboard
        return {
          title: 'Upgrade to Pro',
          description: 'Remove ads and unlock premium features',
          cta: 'Learn More',
        };
    }
  };

  const prompt = getUpgradePromptForContext(context);

  const handleUpgrade = () => {
    router.push('/subscription');
  };

  if (variant === 'slim') {
    return (
      <View style={[styles.slimContainer, style]}>
        <View style={styles.slimContent}>
          <View style={styles.slimTextContainer}>
            <Text style={styles.slimTitle}>{prompt.title}</Text>
          </View>
          <TouchableOpacity style={styles.slimCtaButton} onPress={handleUpgrade}>
            <Text style={styles.slimCtaText}>{prompt.cta}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDismissed(true)} style={styles.slimClose}>
            <X color="#999" size={16} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.adContent}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{prompt.title}</Text>
          <Text style={styles.description}>{prompt.description}</Text>
        </View>
        <TouchableOpacity onPress={() => setDismissed(true)}>
          <X color="#999" size={20} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.ctaButton} onPress={handleUpgrade}>
        <Text style={styles.ctaText}>{prompt.cta}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 12,
    marginTop: 10,
  },
  adContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  description: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
  },
  ctaButton: {
    marginTop: 8,
    backgroundColor: '#357AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  ctaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Slim variant styles
  slimContainer: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  slimContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  slimTextContainer: {
    flex: 1,
  },
  slimTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  slimCtaButton: {
    backgroundColor: '#357AFF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  slimCtaText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  slimClose: {
    padding: 4,
  },
});

export default AdBanner;
