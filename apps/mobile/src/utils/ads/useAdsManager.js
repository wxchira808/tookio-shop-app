import { useCallback, useMemo } from 'react';
import { useAuthStore } from '@/utils/auth/store';

/**
 * Hook to manage ads display based on user subscription plan
 * Returns true if user is on free plan and should see ads
 */
export const useShowAds = () => {
  const { auth } = useAuthStore();

  return useMemo(() => {
    if (!auth) return false;
    
    // Check if user has a subscription/plan field
    const userPlan = auth?.plan || auth?.subscription || auth?.tier;
    
    // Show ads if user is on free plan or has no plan
    const isFreePlan = !userPlan || 
                       userPlan.toLowerCase() === 'free' || 
                       userPlan.toLowerCase() === 'freemium' ||
                       userPlan === null;
    
    return isFreePlan;
  }, [auth]);
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
