/**
 * Frappe API Helper for Tookio Shop Mobile App
 *
 * This helper handles all API calls to the Frappe backend.
 * It includes automatic session timeout detection and redirect to login.
 */

import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from './auth/store';

// Frappe backend URL
const FRAPPE_URL = process.env.EXPO_PUBLIC_FRAPPE_URL || 'https://shop.tookio.co.ke';
const AUTH_KEY = 'tookio-shop-auth';

/**
 * Check if user is a Guest (session timed out)
 */
function isGuestUser(response) {
  if (!response) return false;

  // Check for Guest user in error messages
  if (response.exception && response.exception.includes('Guest')) {
    return true;
  }

  // Check for error message containing Guest
  if (response._server_messages) {
    try {
      const messages = JSON.parse(response._server_messages);
      if (Array.isArray(messages)) {
        return messages.some(msg => {
          const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
          return parsed.message && parsed.message.includes('Guest');
        });
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  return false;
}

/**
 * Handle session timeout by clearing auth and redirecting to login
 */
async function handleSessionTimeout() {
  console.log('⏱️ Session timeout detected. Redirecting to login...');

  // Clear auth store
  useAuthStore.setState({ auth: null });

  // Clear secure storage
  try {
    await SecureStore.deleteItemAsync(AUTH_KEY);
  } catch (e) {
    console.error('Error clearing auth:', e);
  }

  // Redirect to login (show auth modal)
  // The useRequireAuth hook will automatically show login modal
  // when auth is null
}

/**
 * Make a Frappe API request
 * @param {string} endpoint - API endpoint (e.g., '/api/resource/Product')
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - API response data
 */
export async function frappeRequest(endpoint, options = {}) {
  try {
    // Build headers
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Make the request
    const url = `${FRAPPE_URL}${endpoint}`;
    console.log(`📡 Frappe Request: ${options.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Important for cookies
    });

    // Parse response
    let data;
    try {
      data = await response.json();
    } catch (e) {
      // If response is not JSON, create error object
      data = { exc: await response.text() };
    }

    // Check for Guest user (session timeout)
    if (isGuestUser(data)) {
      console.log('❌ Error [' + endpoint + ']: User is Guest (session timeout)');
      await handleSessionTimeout();
      throw new Error('Session timeout. Please login again.');
    }

    // Handle Frappe errors
    if (data.exc || data.exception || !response.ok) {
      // Extract error message
      let errorMessage = 'Unknown error';

      if (data._server_messages) {
        try {
          const messages = JSON.parse(data._server_messages);
          if (Array.isArray(messages) && messages.length > 0) {
            const firstMessage = typeof messages[0] === 'string'
              ? JSON.parse(messages[0])
              : messages[0];
            errorMessage = firstMessage.message || firstMessage;

            // Remove HTML tags
            errorMessage = errorMessage.replace(/<[^>]*>/g, '');
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      if (data.exception) {
        errorMessage = data.exception;
      }

      console.log(`❌ Error [${endpoint}]: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    console.log(`✅ Success`);
    return data;
  } catch (error) {
    console.error(`API Request Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Get current logged in user
 */
export async function getLoggedUser() {
  const response = await frappeRequest('/api/method/frappe.auth.get_logged_user');
  return response.message;
}

/**
 * Get user details including subscription info
 */
export async function getUserDetails(email) {
  console.log('🔄 Refreshing user details...');

  try {
    // Get logged user first
    const loggedUser = await getLoggedUser();

    // Get user doc
    const userDoc = await frappeRequest(
      `/api/resource/User/${encodeURIComponent(loggedUser)}?fields=["email","full_name","name"]`
    );

    const user = userDoc.data;

    // Get subscription data using the portal user approach
    // This is the same approach used in the www/subscriptions page
    const subscriptionData = await getSubscriptionData(loggedUser);

    console.log('✅ User details refreshed:', {
      email: user.email,
      name: user.full_name,
      username: user.name,
      subscription_tier: subscriptionData.plan_name || 'free',
      subscription_expiry: subscriptionData.expiry_date || null,
    });

    return {
      email: user.email,
      name: user.full_name,
      username: user.name,
      subscription_tier: subscriptionData.plan_name || 'free',
      subscription_expiry: subscriptionData.expiry_date || null,
      subscription_status: subscriptionData.status || 'active',
      items_allowed: subscriptionData.items_allowed || 10,
      shops_allowed: subscriptionData.shops_allowed || 1,
    };
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw error;
  }
}

/**
 * Get subscription data using Frappe method
 * This fetches subscription info the same way the portal page does
 */
export async function getSubscriptionData(userEmail) {
  try {
    // First, get the portal user to find associated customer
    const portalUser = await frappeRequest(
      `/api/method/frappe.client.get_value?doctype=Portal User&filters={"user":"${userEmail}"}&fieldname=["name","customer"]`
    );

    if (!portalUser.message || !portalUser.message.customer) {
      // No customer associated, return free tier defaults
      return {
        plan_name: 'free',
        status: 'active',
        items_allowed: 10,
        shops_allowed: 1,
      };
    }

    const customer = portalUser.message.customer;

    // Get active subscription for this customer
    const subscriptions = await frappeRequest(
      `/api/method/frappe.client.get_list?doctype=Subscription&filters={"party":"${customer}","docstatus":1,"status":["in",["Active","Past Due Date"]]}&fields=["name","status","current_invoice_end","plans"]&limit=1`
    );

    if (!subscriptions.message || subscriptions.message.length === 0) {
      // No active subscription, return free tier
      return {
        plan_name: 'free',
        status: 'active',
        items_allowed: 10,
        shops_allowed: 1,
      };
    }

    const subscription = subscriptions.message[0];

    // Get the subscription plan details
    if (subscription.plans && subscription.plans.length > 0) {
      const planName = subscription.plans[0].plan;
      const planDetails = await frappeRequest(
        `/api/resource/Subscription Plan/${encodeURIComponent(planName)}?fields=["name","plan_name","items_allowed","shops_allowed","cost"]`
      );

      if (planDetails.data) {
        return {
          plan_name: planDetails.data.plan_name || planName,
          status: subscription.status,
          expiry_date: subscription.current_invoice_end,
          items_allowed: planDetails.data.items_allowed || 10,
          shops_allowed: planDetails.data.shops_allowed || 1,
          cost: planDetails.data.cost || 0,
        };
      }
    }

    return {
      plan_name: 'active',
      status: subscription.status,
      expiry_date: subscription.current_invoice_end,
      items_allowed: 10,
      shops_allowed: 1,
    };
  } catch (error) {
    console.error('Error fetching subscription data:', error);
    // Return free tier on error
    return {
      plan_name: 'free',
      status: 'active',
      items_allowed: 10,
      shops_allowed: 1,
    };
  }
}

/**
 * Get all shops for the current user
 */
export async function getShops() {
  const response = await frappeRequest(
    '/api/resource/Shop?fields=["*"]&limit_page_length=999'
  );
  return response.data || [];
}

/**
 * Create a new shop
 */
export async function createShop(shopData) {
  const response = await frappeRequest('/api/resource/Shop', {
    method: 'POST',
    body: JSON.stringify({
      shop_name: shopData.shop_name,
      description: shopData.description,
    }),
  });
  return response.data;
}

/**
 * Update a shop
 */
export async function updateShop(shopId, shopData) {
  const response = await frappeRequest(`/api/resource/Shop/${shopId}`, {
    method: 'PUT',
    body: JSON.stringify(shopData),
  });
  return response.data;
}

/**
 * Delete a shop
 */
export async function deleteShop(shopId) {
  await frappeRequest(`/api/resource/Shop/${shopId}`, {
    method: 'DELETE',
  });
  return { success: true };
}

/**
 * Get all products (items)
 */
export async function getProducts() {
  const response = await frappeRequest(
    '/api/resource/Product?fields=["*"]&limit_page_length=999'
  );
  return response.data || [];
}

/**
 * Create a new product
 */
export async function createProduct(productData) {
  const response = await frappeRequest('/api/resource/Product', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
  return response.data;
}

/**
 * Update a product
 */
export async function updateProduct(productId, productData) {
  const response = await frappeRequest(`/api/resource/Product/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  });
  return response.data;
}

/**
 * Delete a product
 */
export async function deleteProduct(productName) {
  await frappeRequest(`/api/resource/Product/${productName}`, {
    method: 'DELETE',
  });
  return { success: true };
}

/**
 * Get product stock
 */
export async function getProductStock() {
  const response = await frappeRequest(
    '/api/resource/Product Stock?fields=["*"]&limit_page_length=999&order_by=creation desc'
  );
  return response.data || [];
}

/**
 * Create stock transaction
 */
export async function createStockTransaction(transactionData) {
  const response = await frappeRequest('/api/resource/Product Stock', {
    method: 'POST',
    body: JSON.stringify(transactionData),
  });
  return response.data;
}

/**
 * Delete a stock transaction
 */
export async function deleteStockTransaction(transactionName) {
  await frappeRequest(`/api/resource/Product Stock/${transactionName}`, {
    method: 'DELETE',
  });
  return { success: true };
}

/**
 * Get sales transactions
 */
export async function getSales() {
  const response = await frappeRequest(
    '/api/resource/Sales Transaction?fields=["*"]&limit_page_length=999&order_by=creation desc'
  );
  return response.data || [];
}

/**
 * Create sales transaction
 */
export async function createSale(saleData) {
  const response = await frappeRequest('/api/resource/Sales Transaction', {
    method: 'POST',
    body: JSON.stringify(saleData),
  });
  return response.data;
}

/**
 * Delete a sales transaction
 */
export async function deleteSalesTransaction(transactionName) {
  await frappeRequest(`/api/resource/Sales Transaction/${transactionName}`, {
    method: 'DELETE',
  });
  return { success: true };
}

/**
 * Get purchase transactions
 */
export async function getPurchases() {
  const response = await frappeRequest(
    '/api/resource/Purchase Transaction?fields=["*"]&limit_page_length=999&order_by=creation desc'
  );
  return response.data || [];
}

/**
 * Create purchase transaction
 */
export async function createPurchase(purchaseData) {
  const response = await frappeRequest('/api/resource/Purchase Transaction', {
    method: 'POST',
    body: JSON.stringify(purchaseData),
  });
  return response.data;
}

/**
 * Delete a purchase transaction
 */
export async function deletePurchaseTransaction(transactionName) {
  await frappeRequest(`/api/resource/Purchase Transaction/${transactionName}`, {
    method: 'DELETE',
  });
  return { success: true };
}

/**
 * Login to Frappe
 */
export async function login(username, password) {
  const response = await frappeRequest('/api/method/login', {
    method: 'POST',
    body: JSON.stringify({
      usr: username,
      pwd: password,
    }),
  });

  if (response.message && response.message !== 'Logged In') {
    throw new Error('Invalid credentials');
  }

  // Get user details after login
  const userDetails = await getUserDetails(username);

  return {
    user: userDetails,
    sessionToken: 'frappe-session', // Frappe uses cookies, no token needed
  };
}

/**
 * Logout from Frappe
 */
export async function logout() {
  try {
    await frappeRequest('/api/method/logout', {
      method: 'POST',
    });
  } catch (error) {
    console.error('Error logging out:', error);
  }

  // Clear local auth
  await handleSessionTimeout();
}
