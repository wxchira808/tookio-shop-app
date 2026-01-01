// Your AdMob IDs (ready for when you integrate the SDK)
export const ADMOB_APP_ID = 'ca-app-pub-2653266687589484~7788238441';
export const ADMOB_BANNER_AD_UNIT_ID = 'ca-app-pub-2653266687589484/2148898954';

// Test ad IDs (for development/testing)
export const TEST_BANNER_AD_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111'; // Google test ad

// Initialize Mobile Ads (placeholder - will work when SDK is properly installed)
export const initializeMobileAds = async () => {
  try {
    console.log('📱 Mobile Ads ready with AdMob App ID:', ADMOB_APP_ID);
    console.log('💰 Banner Ad Unit ID:', ADMOB_BANNER_AD_UNIT_ID);
    // TODO: Initialize when react-native-google-mobile-ads is properly installed
  } catch (error) {
    console.error('❌ Failed to initialize Mobile Ads:', error);
  }
};
