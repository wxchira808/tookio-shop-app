/**
 * Storage Helper for Tookio Shop
 * Manages local storage for app preferences
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_SHOP_KEY = 'tookio-active-shop';

/**
 * Save the active shop ID
 * @param {number} shopId - Shop ID to set as active
 */
export async function setActiveShop(shopId) {
  try {
    await AsyncStorage.setItem(ACTIVE_SHOP_KEY, shopId.toString());
  } catch (error) {
    console.error('Error saving active shop:', error);
  }
}

/**
 * Get the active shop ID
 * @returns {Promise<number|null>} Active shop ID or null
 */
export async function getActiveShop() {
  try {
    const shopId = await AsyncStorage.getItem(ACTIVE_SHOP_KEY);
    return shopId ? parseInt(shopId) : null;
  } catch (error) {
    console.error('Error getting active shop:', error);
    return null;
  }
}

/**
 * Clear the active shop
 */
export async function clearActiveShop() {
  try {
    await AsyncStorage.removeItem(ACTIVE_SHOP_KEY);
  } catch (error) {
    console.error('Error clearing active shop:', error);
  }
}
