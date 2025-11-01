/**
 * API Helper for Tookio Shop Mobile App
 * 
 * This helper handles all API calls to the web backend.
 * It automatically includes authentication headers and handles errors.
 */

import * as SecureStore from 'expo-secure-store';

// Get the API URL from environment variables
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const AUTH_KEY = 'tookio-shop-auth'; // Key for storing auth token

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/api/shops')
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - API response data
 */
export async function apiRequest(endpoint, options = {}) {
  try {
    // Get auth token from secure storage
    const authData = await SecureStore.getItemAsync(AUTH_KEY);
    const auth = authData ? JSON.parse(authData) : null;

    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    if (auth && auth.sessionToken) {
      headers['Cookie'] = `authjs.session-token=${auth.sessionToken}`;
    }

    // Make the request
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Important for cookies
    });

    // Parse response
    const data = await response.json();

    // Handle errors
    if (!response.ok) {
      throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Request Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Get all shops for the current user
 */
export async function getShops() {
  return apiRequest('/api/shops');
}

/**
 * Create a new shop
 * @param {object} shopData - Shop data {shop_name, description}
 */
export async function createShop(shopData) {
  return apiRequest('/api/shops', {
    method: 'POST',
    body: JSON.stringify(shopData),
  });
}

/**
 * Get all items, optionally filtered by shop
 * @param {number} shopId - Optional shop ID to filter by
 */
export async function getItems(shopId = null) {
  const endpoint = shopId ? `/api/items?shop_id=${shopId}` : '/api/items';
  return apiRequest(endpoint);
}

/**
 * Create a new item
 * @param {object} itemData - Item data
 */
export async function createItem(itemData) {
  return apiRequest('/api/items', {
    method: 'POST',
    body: JSON.stringify(itemData),
  });
}

/**
 * Get all purchases, optionally filtered by shop
 * @param {number} shopId - Optional shop ID to filter by
 */
export async function getPurchases(shopId = null) {
  const endpoint = shopId
    ? `/api/purchases?shop_id=${shopId}`
    : '/api/purchases';
  return apiRequest(endpoint);
}

/**
 * Create a new purchase
 * @param {object} purchaseData - Purchase data {shop_id, items, notes}
 */
export async function createPurchase(purchaseData) {
  return apiRequest('/api/purchases', {
    method: 'POST',
    body: JSON.stringify(purchaseData),
  });
}

/**
 * Get all sales, optionally filtered by shop
 * @param {number} shopId - Optional shop ID to filter by
 */
export async function getSales(shopId = null) {
  const endpoint = shopId ? `/api/sales?shop_id=${shopId}` : '/api/sales';
  return apiRequest(endpoint);
}

/**
 * Create a new sale
 * @param {object} saleData - Sale data
 */
export async function createSale(saleData) {
  return apiRequest('/api/sales', {
    method: 'POST',
    body: JSON.stringify(saleData),
  });
}

/**
 * Get stock transactions
 */
export async function getStockTransactions() {
  return apiRequest('/api/stock/transactions');
}

/**
 * Create a stock transaction (add/remove/adjust)
 * @param {object} transactionData - Transaction data {item_id, transaction_type, quantity, reason}
 */
export async function createStockTransaction(transactionData) {
  return apiRequest('/api/stock/transactions', {
    method: 'POST',
    body: JSON.stringify(transactionData),
  });
}

/**
 * Update an existing shop
 * @param {number} shopId - Shop ID
 * @param {object} shopData - Shop data to update
 */
export async function updateShop(shopId, shopData) {
  return apiRequest(`/api/shops?id=${shopId}`, {
    method: 'PUT',
    body: JSON.stringify(shopData),
  });
}

/**
 * Delete a shop
 * @param {number} shopId - Shop ID to delete
 */
export async function deleteShop(shopId) {
  return apiRequest(`/api/shops?id=${shopId}`, {
    method: 'DELETE',
  });
}

/**
 * Update an existing item
 * @param {number} itemId - Item ID
 * @param {object} itemData - Item data to update
 */
export async function updateItem(itemId, itemData) {
  return apiRequest(`/api/items?id=${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(itemData),
  });
}

/**
 * Delete an item
 * @param {number} itemId - Item ID to delete
 */
export async function deleteItem(itemId) {
  return apiRequest(`/api/items?id=${itemId}`, {
    method: 'DELETE',
  });
}

/**
 * Save auth data to secure storage
 * @param {object} auth - Auth data from login/signup
 */
export async function saveAuth(auth) {
  await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(auth));
}

/**
 * Get saved auth data
 */
export async function getAuth() {
  const authData = await SecureStore.getItemAsync(AUTH_KEY);
  return authData ? JSON.parse(authData) : null;
}

/**
 * Clear auth data (logout)
 */
export async function clearAuth() {
  await SecureStore.deleteItemAsync(AUTH_KEY);
}
