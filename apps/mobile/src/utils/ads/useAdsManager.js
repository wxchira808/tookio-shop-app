import { useCallback, useMemo, useState, useEffect } from 'react';
import { useAuthStore } from '@/utils/auth/store';
import { getUserSubscription } from '@/utils/frappeApi';

/**
 * Hook to manage ads display based on user subscription plan
 * Returns true if user is on free plan and should see ads
 */
export const useShowAds = () => {
  const { auth } = useAuthStore();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!auth) {
        setLoading(false);
        return;
      }

      try {
        const subData = await getUserSubscription();
        setSubscription(subData);
      } catch (error) {
        console.error('Error fetching subscription for ads:', error);
        // Default to showing ads if we can't fetch subscription
        setSubscription({ current_subscription: 'Free Plan' });
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [auth]);

  return useMemo(() => {
    if (!auth || loading) return false;

    // Check subscription data from API
    const currentSub = subscription?.current_subscription;

    // Show ads if user is on free plan or has no subscription
    const isFreePlan = !currentSub ||
                       currentSub.toLowerCase().includes('free') ||
                       currentSub === 'Free Plan';

    return isFreePlan;
  }, [auth, subscription, loading]);
};

/**
 * Manage ad rotations and frequency
 */
export const useAdFrequency = () => {
  const showAds = useShowAds();
  
  return {
    showAds,
    // Show ads every 3 screens/tabs
    showAdFrequency: 3,
    // Show banner ads at the bottom
    showBannerAds: true,
    // Show interstitial ads on navigation (less frequent)
    showInterstitialAds: false,
  };
};
