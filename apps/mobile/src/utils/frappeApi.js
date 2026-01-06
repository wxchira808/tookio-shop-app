/**
 * Frappe API Helper for Tookio Shop Mobile App
 *
 * Connects to your Frappe backend at https://shop.tookio.co.ke
 * Handles authentication, CRUD operations, and field mapping between
 * mobile app format and Frappe DocType format.
 */

import * as SecureStore from 'expo-secure-store';

// Frappe site URL
const FRAPPE_URL = 'https://shop.tookio.co.ke';
const AUTH_KEY = 'tookio-frappe-auth';

/**
 * Make an authenticated API request to Frappe
 * @param {boolean} skipSessionCheck - Skip session expiry handling (for login/signup)
 */
export async function frappeRequest(endpoint, options = {}, skipSessionCheck = false) {
  try {
    const authData = await SecureStore.getItemAsync(AUTH_KEY);
    const auth = authData ? JSON.parse(authData) : null;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    if (auth && auth.api_key && auth.api_secret) {
      headers['Authorization'] = `token ${auth.api_key}:${auth.api_secret}`;
    }

    const url = `${FRAPPE_URL}${endpoint}`;
    console.log('📡 Frappe Request:', options.method || 'GET', url);

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    console.log(`📊 Response status: ${response.status}, ok: ${response.ok}`);

    if (!response.ok) {
      // Handle session expiry ONLY on 401 Unauthorized
      // Don't treat 403 (Forbidden/Permission Denied) as session expiry
      if (response.status === 401 && !skipSessionCheck) {
        console.log('🔒 Session expired, logging out...');
        await SecureStore.deleteItemAsync(AUTH_KEY);

        // Throw a special error to indicate session expiry
        const sessionError = new Error('Your session has expired. Please login again.');
        sessionError.sessionExpired = true;
        throw sessionError;
      }

      if (data.exception || data._server_messages) {
        const errorMsg = data.exception || data._server_messages;
        let parsedError = errorMsg;
        try {
          if (typeof errorMsg === 'string' && errorMsg.includes('{')) {
            const msgs = JSON.parse(errorMsg);
            if (Array.isArray(msgs)) {
              const firstMsg = JSON.parse(msgs[0]);
              parsedError = firstMsg.message || firstMsg;
            }
          }
        } catch (e) {
          // Use original error
        }

        // Check if error indicates Guest user or session expired
        if (!skipSessionCheck && (
          parsedError.includes('User <strong>Guest</strong>') ||
          (parsedError.includes('Guest') && parsedError.includes('does not have')) ||
          parsedError.includes('Not implemented') ||
          parsedError.includes('not implemented')
        )) {
          console.log('🔒 Session expired (Guest user/Not implemented detected), logging out...');
          await SecureStore.deleteItemAsync(AUTH_KEY);

          const sessionError = new Error('Your session has expired. Please login again.');
          sessionError.sessionExpired = true;
          throw sessionError;
        }

        throw new Error(parsedError);
      }

      // Check message field for "Not implemented" error
      if (data.message && !skipSessionCheck && (
        data.message.includes('Not implemented') ||
        data.message.includes('not implemented')
      )) {
        console.log('🔒 Session expired (Not implemented in message), logging out...');
        await SecureStore.deleteItemAsync(AUTH_KEY);

        const sessionError = new Error('Your session has expired. Please login again.');
        sessionError.sessionExpired = true;
        throw sessionError;
      }

      throw new Error(data.message || `Error: ${response.status}`);
    }

    // Check for "Not implemented" even in successful responses (session timeout with 200 status)
    if (data && !skipSessionCheck) {
      const checkMessage = (msg) => {
        if (typeof msg === 'string') {
          return msg.includes('Not implemented') || msg.includes('not implemented');
        }
        return false;
      };

      // Also check if data itself is a string containing "Not implemented"
      const dataIsNotImplemented = typeof data === 'string' &&
        (data.includes('Not implemented') || data.includes('not implemented'));

      if (dataIsNotImplemented || checkMessage(data.message) || checkMessage(data.exception) || checkMessage(data._server_messages)) {
        console.log('🔒 Session expired (Not implemented detected), logging out...');
        console.log('🔍 Data type:', typeof data, 'Data:', data);
        await SecureStore.deleteItemAsync(AUTH_KEY);

        const sessionError = new Error('Your session has expired. Please login again.');
        sessionError.sessionExpired = true;
        throw sessionError;
      }
    }

    console.log('✅ Success');
    return data;
  } catch (error) {
    console.error(`❌ Error [${endpoint}]:`, error.message);
    throw error;
  }
}

/**
 * Check if the current session is valid
 * @returns {Promise<boolean>} - True if session is valid, throws error if invalid
 */
export async function checkSession() {
  try {
    // Try to make a simple authenticated request to check session
    // Use a more reliable endpoint that doesn't return "Not implemented"
    await frappeRequest('/api/method/frappe.auth.get_logged_user', {}, true); // skipSessionCheck = true
    return true;
  } catch (error) {
    // Handle "Not implemented" error - this doesn't necessarily mean session is invalid
    if (error.message && error.message.includes('Not implemented')) {
      console.log('get_logged_user returned Not implemented, assuming session is still valid');
      return true; // Don't treat as session expiry
    }

    // Check for actual session expiry indicators
    if (error.sessionExpired ||
        (error.message && (
          error.message.includes('session has expired') ||
          error.message.includes('Session expired') ||
          error.message.includes('Invalid login') ||
          error.message.includes('Authentication failed')
        ))) {
      console.log('🔒 Actual session expiry detected');
      await SecureStore.deleteItemAsync(AUTH_KEY);
      const sessionError = new Error('Your session has expired. Please login again.');
      sessionError.sessionExpired = true;
      throw sessionError;
    }

    // For other errors, assume session is still valid to avoid false logouts
    console.log('Session check failed with non-expiry error, assuming session is still valid:', error.message);
    return true;
  }
}

// ==================== AUTHENTICATION ====================

export async function login(usr, pwd) {
  const formData = new URLSearchParams();
  formData.append('usr', usr);
  formData.append('pwd', pwd);

  // Skip session check during login
  const response = await frappeRequest('/api/method/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  }, true);  // skipSessionCheck = true

  if (response.message === 'Logged In') {
    const userInfo = await getCurrentUser();
    const username = userInfo.message;

    // Fetch full user details from User doctype
    let userDetails = null;
    try {
      const userDoc = await frappeRequest(`/api/resource/User/${username}?fields=["email","full_name","name"]`, {}, true);
      userDetails = {
        email: userDoc.data.email,
        name: userDoc.data.full_name || userDoc.data.name,
        username: userDoc.data.name,
      };

      /*
      // Fetch subscription using whitelisted method
      try {
        const subscriptionData = await frappeRequest(
          '/api/method/tookio_shop.api.get_user_subscription',
          { method: 'POST' },
          true // skipSessionCheck during login
        );

        console.log('📋 Subscription API response:', JSON.stringify(subscriptionData, null, 2));

        if (subscriptionData && subscriptionData.message) {
          const subData = subscriptionData.message;

          userDetails.subscription_tier = subData.subscription_plan || 'Free Plan';
          userDetails.subscription_expiry = null;
          userDetails.customer_name = subData.customer_name;

          console.log('📋 Subscription plan:', userDetails.subscription_tier);
          console.log('📋 Customer:', userDetails.customer_name);
        } else {
          console.log('⚠️ No subscription data returned');
          userDetails.subscription_tier = 'Free Plan';
          userDetails.subscription_expiry = null;
        }
      } catch (e) {
        console.log('❌ Could not fetch subscription plan:', e.message);
        userDetails.subscription_tier = 'Free Plan';
        userDetails.subscription_expiry = null;
      }
      */

      // Tookio Shop is now completely FREE!
      userDetails.subscription_tier = 'Free Plan';
      userDetails.subscription_expiry = null;
    } catch (e) {
      console.log('Could not fetch user details, using username:', e.message);
      // Fallback: use username as both email and name
      userDetails = {
        email: username,
        name: username,
        username: username,
        subscription_tier: 'free',
      };
    }

    // Try to get API keys for token auth
    let apiKeys = null;
    try {
      const keysResponse = await frappeRequest('/api/method/frappe.core.doctype.user.user.generate_keys', {
        method: 'POST',
        body: JSON.stringify({ user: username }),
      }, true);  // skipSessionCheck = true
      apiKeys = keysResponse.message;
    } catch (e) {
      console.log('Could not get API keys, using session auth');
    }

    await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify({
      user: userDetails,
      logged_in: true,
      api_key: apiKeys?.api_key,
      api_secret: apiKeys?.api_secret,
    }));

    return { success: true, user: userDetails };
  }

  throw new Error('Login failed');
}

export async function signup(email, username, password, full_name) {
  // Use Frappe's standard signup (you mentioned you have custom code for this)
  try {
    const response = await frappeRequest('/api/method/frappe.core.doctype.user.user.sign_up', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        full_name: full_name || username,
        password: password,  // Add the password to the signup request
        redirect_to: '/',
      }),
    }, true);  // skipSessionCheck = true

    // Try to login immediately after signup
    try {
      return await login(email, password);
    } catch (loginError) {
      // User was created but auto-login failed
      console.log('User created but auto-login failed:', loginError.message);
      throw new Error('Account created successfully. Please login.');
    }
  } catch (error) {
    // Handle the false positive "Customer role" error
    if (error.message && (
      error.message.includes('Please add Customer role to user') ||
      error.message.includes('Customer role')
    )) {
      console.log('Customer role error detected - this is usually a false positive');
      console.log('Error details:', error.message);
      // Don't try to login - just inform the user to try logging in
      throw new Error('Account creation completed. Please try logging in with your credentials.');
    }

    // Re-throw other errors
    console.log('Signup failed with unhandled error:', error.message);
    throw new Error(error.message || 'Signup failed');
  }
}

export async function logout() {
  try {
    await frappeRequest('/api/method/logout', { method: 'POST' });
  } catch (error) {
    console.log('Logout error:', error);
  } finally {
    await SecureStore.deleteItemAsync(AUTH_KEY);
  }
}

export async function getCurrentUser() {
  // Skip session check when getting user during login flow
  return await frappeRequest('/api/method/frappe.auth.get_logged_user', {}, true);
}

export async function isAuthenticated() {
  try {
    const authData = await SecureStore.getItemAsync(AUTH_KEY);
    if (!authData) return false;
    const user = await getCurrentUser();
    return user && user.message !== 'Guest';
  } catch (error) {
    return false;
  }
}

/**
 * Refreshes the current user's details including subscription from whitelisted API
 */
export async function refreshUserDetails() {
  try {
    console.log('🔄 Refreshing user details...');

    const userInfo = await getCurrentUser();
    const username = userInfo.message;

    // Fetch full user details from User doctype
    const userDoc = await frappeRequest(`/api/resource/User/${username}?fields=["email","full_name","name"]`);

    let userDetails = {
      email: userDoc.data.email,
      name: userDoc.data.full_name || userDoc.data.name,
      username: userDoc.data.name,
    };

    // Fetch subscription using whitelisted method
    try {
      const subscriptionData = await frappeRequest(
        '/api/method/tookio_shop.api.get_user_subscription'
      );

      if (subscriptionData && subscriptionData.message) {
        const subData = subscriptionData.message;

        // Override with actual subscription data if user has a subscription
        if (subData.has_subscription && subData.subscription_plan !== 'Free Plan') {
          userDetails.subscription_tier = subData.subscription_plan;
          userDetails.subscription_expiry = subData.subscription_end_date;
        } else {
          userDetails.subscription_tier = 'Free Plan';
          userDetails.subscription_expiry = null;
        }

        console.log('📋 Subscription plan:', userDetails.subscription_tier);
      } else {
        userDetails.subscription_tier = 'Free Plan';
        userDetails.subscription_expiry = null;
      }
    } catch (e) {
      console.log('❌ Could not fetch subscription plan:', e.message);
      userDetails.subscription_tier = 'Free Plan';
      userDetails.subscription_expiry = null;
    }

    console.log('✅ User details refreshed:', userDetails);
    return userDetails;
  } catch (error) {
    console.log('❌ Error refreshing user details:', error);
    throw error;
  }
}

// ==================== SHOP DOCTYPE ====================

export async function getShops() {
  const response = await frappeRequest('/api/resource/Shop?fields=["*"]&limit_page_length=999');

  // Get all items to calculate counts and values per shop
  // Note: Must fetch all fields (*) due to Frappe field-level permissions
  const itemsResponse = await frappeRequest('/api/resource/Product?fields=["*"]&limit_page_length=999');
  const items = itemsResponse.data || [];

  const shops = (response.data || []).map(shop => {
    // Only count enabled items (enabled = 1 or true)
    const shopItems = items.filter(item => item.shop === shop.name && (item.enabled === 1 || item.enabled === true));

    // Debug: Log first item to see field structure
    if (shopItems.length > 0) {
      console.log('🏪 First shop item for', shop.shop_name, ':', JSON.stringify(shopItems[0], null, 2));
    }

    // Use buying price (cost_price or price field) for inventory value calculation
    const totalValue = shopItems.reduce((sum, item) => {
      const buyingPrice = item.price || item.cost_price || 0; // Use buying price (cost)
      const stock = item.stock_quantity || item.current_stock || item.stock || 0;
      return sum + (buyingPrice * stock);
    }, 0);

    console.log('🏪 Shop', shop.shop_name, '- Items:', shopItems.length, ', Total Value:', totalValue);

    return {
      id: shop.name,
      shop_name: shop.shop_name,
      location: shop.location || '',
      address: shop.address || '',
      mobile_number: shop.mobile_number || '',
      email_address: shop.email_address || '',
      created_at: shop.creation,
      updated_at: shop.modified,
      item_count: shopItems.length,
      total_value: totalValue,
      enabled: shop.enabled === 1 || shop.enabled === true ? 1 : 0, // Ensure consistent numeric 1/0 format
    };
  });

  return { shops };
}

export async function createShop(shopData) {
  const frappeData = {
    shop_name: shopData.shop_name,
    location: shopData.location || shopData.description || 'Main Location',
    address: shopData.address || '',
    mobile_number: shopData.mobile_number || '0700000000',
    email_address: shopData.email_address || 'shop@example.com',
    enabled: shopData.enabled ? 1 : 0, // Convert to 1/0 for Check field
  };

  const response = await frappeRequest('/api/resource/Shop', {
    method: 'POST',
    body: JSON.stringify(frappeData),
  });

  return {
    shop: {
      id: response.data.name,
      shop_name: response.data.shop_name,
      description: response.data.location,
      created_at: response.data.creation,
      enabled: response.data.enabled === 1 || response.data.enabled === true ? 1 : 0,
    }
  };
}

export async function updateShop(shopId, shopData) {
  const frappeData = {
    shop_name: shopData.shop_name,
    location: shopData.description || shopData.location,
  };

  if (shopData.address) frappeData.address = shopData.address;
  if (shopData.mobile_number) frappeData.mobile_number = shopData.mobile_number;
  if (shopData.email_address) frappeData.email_address = shopData.email_address;
  if (shopData.hasOwnProperty('enabled')) frappeData.enabled = shopData.enabled;

  const response = await frappeRequest(`/api/resource/Shop/${shopId}`, {
    method: 'PUT',
    body: JSON.stringify(frappeData),
  });

  return {
    shop: {
      id: response.data.name,
      shop_name: response.data.shop_name,
      description: response.data.location,
      enabled: response.data.enabled,
    }
  };
}

export async function deleteShop(shopId) {
  await frappeRequest(`/api/resource/Shop/${shopId}`, {
    method: 'DELETE',
  });
  return { success: true };
}

// ==================== PRODUCT DOCTYPE ====================

export async function getItems() {
  const [itemsResponse, shopsResponse] = await Promise.all([
    frappeRequest('/api/resource/Product?fields=["*"]&limit_page_length=999'),
    frappeRequest('/api/resource/Shop?fields=["name","enabled"]&limit_page_length=999'),
  ]);

  // Create a set of disabled shop IDs for quick lookup
  const disabledShops = new Set();
  (shopsResponse.data || []).forEach(shop => {
    if (shop.enabled !== 1) {
      disabledShops.add(shop.name);
    }
  });

  const items = (itemsResponse.data || [])
    .filter(item => !disabledShops.has(item.shop)) // Exclude items from disabled shops
    .map(item => ({
      id: item.name,
      item_name: item.item_name,
      description: item.description || '',
      sku: item.name, // Use Frappe's auto-generated name as SKU
      unit_price: item.selling_price || 0,
      cost_price: item.price || 0,
      current_stock: item.stock_quantity || 0,
      low_stock_threshold: item.low_stock_threshold || 5,
      shop: item.shop, // Add this for filtering in stock adjustment
      shop_id: item.shop,
      shop_name: item.shop_name,
      enabled: item.enabled === 1 || item.enabled === true, // Handle both numeric (1/0) and boolean (true/false) values from Frappe
      created_at: item.creation,
      updated_at: item.modified,
    }));

  return { items };
}

export async function createItem(itemData) {
  const frappeData = {
    item_name: itemData.item_name,
    price: itemData.cost_price || 0,
    selling_price: itemData.unit_price || 0,
    shop: itemData.shop_id,
    stock_quantity: itemData.current_stock || 0,
    low_stock_threshold: itemData.low_stock_threshold || 5,
    uom: 'Pcs',
    enabled: itemData.enabled ? 1 : 0,
  };

  const response = await frappeRequest('/api/resource/Product', {
    method: 'POST',
    body: JSON.stringify(frappeData),
  });

  return {
    item: {
      id: response.data.name,
      item_name: response.data.item_name,
      unit_price: response.data.selling_price,
      cost_price: response.data.price,
      current_stock: response.data.stock_quantity || itemData.current_stock || 0,
      low_stock_threshold: response.data.low_stock_threshold || itemData.low_stock_threshold || 5,
      shop_id: response.data.shop,
      enabled: response.data.enabled,
    }
  };
}

export async function updateItem(itemId, itemData) {
  const frappeData = {
    item_name: itemData.item_name,
    price: itemData.cost_price,
    selling_price: itemData.unit_price,
    shop: itemData.shop,
    stock_quantity: itemData.current_stock,
    low_stock_threshold: itemData.low_stock_threshold,
    enabled: itemData.enabled ? 1 : 0,
  };

  const response = await frappeRequest(`/api/resource/Product/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(frappeData),
  });

  return { item: response.data };
}

export async function deleteItem(itemId) {
  await frappeRequest(`/api/resource/Product/${itemId}`, {
    method: 'DELETE',
  });
  return { success: true };
}

// ==================== SALE INVOICE DOCTYPE ====================

export async function getSales() {
  const response = await frappeRequest('/api/resource/Sale Invoice?fields=["*"]&limit_page_length=999&order_by=creation desc');

  // Debug: Log first sale to see structure
  if (response.data && response.data.length > 0) {
    console.log('📊 First sale data structure:', JSON.stringify(response.data[0], null, 2));
  }

  // Try to fetch child table items separately, but fall back to parent document items if permissions denied
  let saleItemsMap = {};
  let useParentItems = false;

  try {
    const [saleItemsResponse, shopsResponse, itemsResponse] = await Promise.all([
      frappeRequest('/api/resource/Tookio Sales Invoice Item?fields=["*"]&limit_page_length=9999'),
      frappeRequest('/api/resource/Shop?fields=["name","shop_name"]&limit_page_length=999'),
      frappeRequest('/api/resource/Product?fields=["name","item_name"]&limit_page_length=999'),
    ]);

    // Create a map of sale items by parent (sale invoice)
    (saleItemsResponse.data || []).forEach(item => {
      if (!saleItemsMap[item.parent]) {
        saleItemsMap[item.parent] = [];
      }
      saleItemsMap[item.parent].push(item);
    });
  } catch (error) {
    console.log('⚠️ Could not fetch child table separately (permission denied?), using parent document items');
    useParentItems = true;
  }

  // Fetch shops and products for mapping
  const [shopsResponse, itemsResponse] = await Promise.all([
    frappeRequest('/api/resource/Shop?fields=["name","shop_name","enabled"]&limit_page_length=999'),
    frappeRequest('/api/resource/Product?fields=["name","item_name"]&limit_page_length=999'),
  ]);

  const shopsMap = {};
  const disabledShops = new Set();
  (shopsResponse.data || []).forEach(shop => {
    shopsMap[shop.name] = shop.shop_name;
    if (shop.enabled !== 1) {
      disabledShops.add(shop.name);
    }
  });

  const itemsMap = {};
  (itemsResponse.data || []).forEach(item => {
    itemsMap[item.name] = item.item_name;
  });

  const sales = (response.data || [])
    .filter(sale => !disabledShops.has(sale.shop)) // Exclude sales from disabled shops
    .map(sale => {
    // Use either separately fetched items or items from parent document
    const saleItems = useParentItems ? (sale.items || []) : (saleItemsMap[sale.name] || sale.items || []);

    return {
      id: sale.name,
      total_amount: sale.total || 0,
      sale_date: sale.posting_date,
      customer_name: sale.customer_name || '',
      customer_mobile_number: sale.customer_mobile_number || '',
      payment_method: sale.payment_method || '',
      delivery_location: sale.delivery_location || '',
      notes: sale.notes || '',
      shop_name: shopsMap[sale.shop] || sale.shop,
      shop_id: sale.shop,
      docstatus: sale.docstatus || 0, // 0=Draft, 1=Submitted, 2=Cancelled
      status: sale.docstatus === 2 ? 'Cancelled' : sale.docstatus === 1 ? 'Submitted' : 'Draft',
      items: (saleItems || []).map(item => ({
        product: item.product,
        product_name: itemsMap[item.product] || item.product,
        quantity: item.quantity || 0,
        item_price: item.item_price || 0,
      })),
      items_count: (saleItems || []).length,
      created_at: sale.creation,
      updated_at: sale.modified,
    };
  });

  console.log('📊 Mapped sales (first item):', JSON.stringify(sales[0], null, 2));

  return { sales };
}

export async function getSaleById(saleId) {
  // Fetch single sale document - this will include child tables
  const response = await frappeRequest(`/api/resource/Sale Invoice/${saleId}`);

  // Fetch product names for mapping
  const itemsResponse = await frappeRequest('/api/resource/Product?fields=["name","item_name"]&limit_page_length=999');
  const itemsMap = {};
  (itemsResponse.data || []).forEach(item => {
    itemsMap[item.name] = item.item_name;
  });

  const sale = response.data;

  // Debug: Log first item to see field structure
  if (sale.items && sale.items.length > 0) {
    console.log('📊 First sale item structure:', JSON.stringify(sale.items[0], null, 2));
  }

  return {
    id: sale.name,
    total_amount: sale.total || 0,
    sale_date: sale.posting_date,
    customer_name: sale.customer_name || '',
    customer_mobile_number: sale.customer_mobile_number || sale.customer_phone_number || '',
    payment_method: sale.payment_method || '',
    delivery_location: sale.delivery_location || '',
    notes: sale.notes || '',
    shop_id: sale.shop,
    items: (sale.items || []).map(item => ({
      product: item.product,
      product_name: itemsMap[item.product] || item.product,
      quantity: item.quantity || 0,
      item_price: item.item_price || item.price || item.rate || 0,
    })),
    items_count: (sale.items || []).length,
    created_at: sale.creation,
    updated_at: sale.modified,
  };
}

export async function createSale(saleData) {
  // Map mobile app sale items to Frappe format
  // IMPORTANT: Frappe child tables require the 'doctype' field
  const items = saleData.items.map(item => ({
    doctype: 'Tookio Sales Invoice Item',  // Required for child table
    product: item.item_id,
    quantity: parseFloat(item.quantity) || 0,
    item_price: parseFloat(item.unit_price) || 0,
  }));

  const frappeData = {
    doctype: 'Sale Invoice',
    shop: saleData.shop_id,
    posting_date: new Date().toISOString().split('T')[0],  // Format: YYYY-MM-DD
    customer_name: saleData.customer_name || 'Walk-in Customer',
    customer_mobile_number: saleData.customer_mobile_number || '',
    payment_method: saleData.payment_method || 'Cash',
    delivery_location: saleData.delivery_location || '',
    notes: saleData.notes || '',
    items: items,
  };

  console.log('📤 Creating sale with data:', JSON.stringify(frappeData, null, 2));

  const response = await frappeRequest('/api/resource/Sale Invoice', {
    method: 'POST',
    body: JSON.stringify(frappeData),
  });

  // Submit the invoice to trigger stock deduction
  try {
    await frappeRequest(`/api/resource/Sale Invoice/${response.data.name}`, {
      method: 'PUT',
      body: JSON.stringify({ docstatus: 1 }), // Submit the document
    });
  } catch (e) {
    console.log('Could not auto-submit invoice:', e.message);
  }

  return { sale: response.data };
}

export async function cancelSale(saleId) {
  // In Frappe, cancelling a submitted document sets docstatus to 2
  await frappeRequest(`/api/resource/Sale Invoice/${saleId}`, {
    method: 'PUT',
    body: JSON.stringify({ docstatus: 2 }), // 2 = Cancelled
  });
  return { success: true };
}

// ==================== PRODUCT STOCK DOCTYPE ====================

export async function getStockTransactions() {
  const response = await frappeRequest('/api/resource/Product Stock?fields=["*"]&limit_page_length=999&order_by=creation desc');

  // Debug: Log first transaction to see structure
  if (response.data && response.data.length > 0) {
    console.log('📦 First stock transaction data structure:', JSON.stringify(response.data[0], null, 2));
  }

  // Try to fetch child table items separately, but fall back to parent document items if permissions denied
  let stockItemsMap = {};
  let useParentItems = false;

  try {
    const [stockItemsResponse, shopsResponse, itemsResponse] = await Promise.all([
      frappeRequest('/api/resource/Tookio Product Stock Item?fields=["*"]&limit_page_length=9999'),
      frappeRequest('/api/resource/Shop?fields=["name","shop_name"]&limit_page_length=999'),
      frappeRequest('/api/resource/Product?fields=["name","item_name"]&limit_page_length=999'),
    ]);

    // Create a map of stock items by parent (product stock)
    (stockItemsResponse.data || []).forEach(item => {
      if (!stockItemsMap[item.parent]) {
        stockItemsMap[item.parent] = [];
      }
      stockItemsMap[item.parent].push(item);
    });
  } catch (error) {
    console.log('⚠️ Could not fetch child table separately (permission denied?), using parent document items');
    useParentItems = true;
  }

  // Fetch shops and products for mapping
  const [shopsResponse, itemsResponse] = await Promise.all([
    frappeRequest('/api/resource/Shop?fields=["name","shop_name"]&limit_page_length=999'),
    frappeRequest('/api/resource/Product?fields=["name","item_name"]&limit_page_length=999'),
  ]);

  const shopsMap = {};
  (shopsResponse.data || []).forEach(shop => {
    shopsMap[shop.name] = shop.shop_name;
  });

  const itemsMap = {};
  (itemsResponse.data || []).forEach(item => {
    itemsMap[item.name] = item.item_name;
  });

  const transactions = (response.data || []).map(trans => {
    // Use either separately fetched items or items from parent document
    // Note: Frappe has a typo in the field name - it's "prodcuts" not "products"
    const transItems = useParentItems ? (trans.prodcuts || trans.products || []) : (stockItemsMap[trans.name] || trans.prodcuts || trans.products || []);

    // Calculate total quantity from child items
    const totalQty = (transItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
    const itemsList = (transItems || []).map(item => ({
      product_id: item.product,
      product_name: itemsMap[item.product] || item.product,
      quantity: item.quantity || 0,
    }));

    return {
      id: trans.name,
      transaction_type: trans.purpose === 'Add Stock' ? 'in' : 'out',
      quantity: trans.purpose === 'Add Stock' ? totalQty : -totalQty,
      purpose: trans.purpose,
      items: itemsList,
      items_count: itemsList.length,
      date: trans.date,
      created_at: trans.creation,
      shop_id: trans.shop,
      shop_name: shopsMap[trans.shop] || trans.shop,
    };
  });

  console.log('📦 Mapped transactions (first item):', JSON.stringify(transactions[0], null, 2));

  return { transactions };
}

export async function getStockTransactionById(transactionId) {
  // Fetch single stock transaction document - this will include child tables
  const response = await frappeRequest(`/api/resource/Product Stock/${transactionId}`);

  // Fetch product names for mapping
  const itemsResponse = await frappeRequest('/api/resource/Product?fields=["name","item_name"]&limit_page_length=999');
  const itemsMap = {};
  (itemsResponse.data || []).forEach(item => {
    itemsMap[item.name] = item.item_name;
  });

  const trans = response.data;
  // Note: Backend field name has typo "prodcuts" instead of "products"
  const transItems = trans.prodcuts || trans.products || [];
  const totalQty = transItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return {
    id: trans.name,
    transaction_type: trans.purpose === 'Add Stock' ? 'in' : 'out',
    quantity: trans.purpose === 'Add Stock' ? totalQty : -totalQty,
    purpose: trans.purpose,
    items: transItems.map(item => ({
      product_id: item.product,
      product_name: itemsMap[item.product] || item.product,
      quantity: item.quantity || 0,
    })),
    items_count: transItems.length,
    date: trans.date,
    created_at: trans.creation,
    shop_id: trans.shop,
  };
}

export async function createStockTransaction(transactionData) {
  const purpose = transactionData.transaction_type === 'in' ? 'Add Stock' : 'Remove Stock';

  const frappeData = {
    doctype: 'Product Stock',
    shop: transactionData.shop_id,
    date: new Date().toISOString().split('T')[0],
    purpose: purpose,
    prodcuts: [{  // Note: Backend field name has typo "prodcuts" instead of "products"
      doctype: 'Tookio Product Stock Item',  // Required for child table
      product: transactionData.item_id,
      quantity: Math.abs(parseFloat(transactionData.quantity) || 0),
    }],
  };

  const response = await frappeRequest('/api/resource/Product Stock', {
    method: 'POST',
    body: JSON.stringify(frappeData),
  });

  // Submit to apply stock changes
  try {
    await frappeRequest(`/api/resource/Product Stock/${response.data.name}`, {
      method: 'PUT',
      body: JSON.stringify({ docstatus: 1 }),
    });
  } catch (e) {
    console.log('Could not auto-submit stock transaction:', e.message);
  }

  return response.data;
}

export async function createBulkStockAdjustment(adjustmentData) {
  // adjustmentData: { shop, purpose, items: [{ product, quantity }] }
  const frappeData = {
    doctype: 'Product Stock',
    shop: adjustmentData.shop,
    date: new Date().toISOString().split('T')[0],
    purpose: adjustmentData.purpose, // "Add Stock" or "Remove Stock"
    prodcuts: adjustmentData.items.map(item => ({
      doctype: 'Product Stock Item',  // Required for child table
      product: item.product,
      quantity: Math.abs(parseFloat(item.quantity) || 0),
    })),
  };

  const response = await frappeRequest('/api/resource/Product Stock', {
    method: 'POST',
    body: JSON.stringify(frappeData),
  });

  // Submit to apply stock changes
  try {
    await frappeRequest(`/api/resource/Product Stock/${response.data.name}`, {
      method: 'PUT',
      body: JSON.stringify({ docstatus: 1 }),
    });
  } catch (e) {
    console.log('Could not auto-submit stock adjustment:', e.message);
  }

  return response.data;
}

// ==================== NOTIFICATIONS ====================

export async function getNotifications() {
  try {
    const response = await frappeRequest('/api/resource/Tookio Notification?fields=["*"]&limit_page_length=50&order_by=date desc');

    const notifications = (response.data || []).map(notif => ({
      id: notif.name,
      date: notif.date,
      message: notif.message,
      read: notif.read || 0,
    }));

    return { notifications };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { notifications: [] };
  }
}

export async function markNotificationAsRead(notificationId) {
  try {
    await frappeRequest(`/api/resource/Tookio Notification/${notificationId}`, {
      method: 'PUT',
      body: JSON.stringify({ read: 1 }),
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

// ==================== PURCHASES ====================

export async function getPurchases() {
  try {
    const [purchasesResponse, shopsResponse] = await Promise.all([
      frappeRequest('/api/resource/Tookio Purchase?fields=["*"]&limit_page_length=999&order_by=date desc'),
      frappeRequest('/api/resource/Shop?fields=["name","enabled"]&limit_page_length=999'),
    ]);

    // Create a set of disabled shop IDs for quick lookup
    const disabledShops = new Set();
    (shopsResponse.data || []).forEach(shop => {
      if (shop.enabled !== 1) {
        disabledShops.add(shop.name);
      }
    });

    const purchases = (purchasesResponse.data || [])
      .filter(purchase => !disabledShops.has(purchase.shop)) // Exclude purchases from disabled shops
      .map(purchase => ({
        id: purchase.name,
        date: purchase.date,
        shop: purchase.shop,
        shop_name: purchase.shop_name || purchase.shop,  // Fetch shop name if available
        description: purchase.description,
        amount: purchase.amount,
        category: purchase.category,
      }));

    return { purchases };
  } catch (error) {
    console.error('Error fetching purchases:', error);
    throw error;
  }
}

export async function createPurchase(purchaseData) {
  const frappeData = {
    doctype: 'Tookio Purchase',
    date: purchaseData.date || new Date().toISOString().split('T')[0],
    shop: purchaseData.shop,
    description: purchaseData.description,
    amount: parseFloat(purchaseData.amount) || 0,
    category: purchaseData.category || 'Other',
  };

  const response = await frappeRequest('/api/resource/Tookio Purchase', {
    method: 'POST',
    body: JSON.stringify(frappeData),
  });

  return response.data;
}

export async function updatePurchase(purchaseId, purchaseData) {
  const frappeData = {
    date: purchaseData.date,
    shop: purchaseData.shop,
    description: purchaseData.description,
    amount: parseFloat(purchaseData.amount) || 0,
    category: purchaseData.category,
  };

  const response = await frappeRequest(`/api/resource/Tookio Purchase/${purchaseId}`, {
    method: 'PUT',
    body: JSON.stringify(frappeData),
  });

  return response.data;
}

export async function deletePurchase(purchaseId) {
  await frappeRequest(`/api/resource/Tookio Purchase/${purchaseId}`, {
    method: 'DELETE',
  });
  return { success: true };
}

// ==================== AUTHENTICATION FUNCTIONS ====================

export async function resetPassword(email) {
  try {
    const response = await frappeRequest('/api/method/frappe.core.doctype.user.user.reset_password', {
      method: 'POST',
      body: JSON.stringify({
        user: email,
      }),
    }, true);  // skipSessionCheck = true

    return response;
  } catch (error) {
    throw new Error(error.message || 'Failed to send reset email');
  }
}

// ==================== HELPER FUNCTIONS ====================

export async function getAuth() {
  const authData = await SecureStore.getItemAsync(AUTH_KEY);
  return authData ? JSON.parse(authData) : null;
}

export async function saveAuth(auth) {
  await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(auth));
}

export async function clearAuth() {
  await SecureStore.deleteItemAsync(AUTH_KEY);
}

// ==================== SUBSCRIPTION FUNCTIONS ====================

export async function getSubscriptionPlans() {
  const response = await frappeRequest('/api/method/tookio_shop.api.get_subscription_plans');
  return response.message;
}

export async function getUserSubscription() {
  const response = await frappeRequest('/api/method/tookio_shop.api.get_user_subscription');
  return response.message;
}

export async function submitPaymentConfirmation(subscriptionPlan, userName) {
  const response = await frappeRequest('/api/method/tookio_shop.api.submit_payment_confirmation', {
    method: 'POST',
    body: JSON.stringify({
      subscription_plan: subscriptionPlan,
      user_name: userName,
    }),
  });
  return response.message;
}

export async function switchToFreePlan() {
  const response = await frappeRequest('/api/method/tookio_shop.api.switch_to_free_plan', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return response.message;
}

export async function checkUserLimits() {
  const response = await frappeRequest('/api/method/tookio_shop.api.check_user_limits');
  return response.message;
}
