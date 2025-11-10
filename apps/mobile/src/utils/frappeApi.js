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
async function frappeRequest(endpoint, options = {}, skipSessionCheck = false) {
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

    if (!response.ok) {
      // Handle session expiry (401 Unauthorized or 403 Forbidden)
      // BUT NOT during login/signup flows
      if ((response.status === 401 || response.status === 403) && !skipSessionCheck) {
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
        throw new Error(parsedError);
      }
      throw new Error(data.message || `Error: ${response.status}`);
    }

    console.log('✅ Success');
    return data;
  } catch (error) {
    console.error(`❌ Error [${endpoint}]:`, error.message);
    throw error;
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

    // Try to get API keys for token auth
    let apiKeys = null;
    try {
      const keysResponse = await frappeRequest('/api/method/frappe.core.doctype.user.user.generate_keys', {
        method: 'POST',
        body: JSON.stringify({ user: userInfo.message }),
      }, true);  // skipSessionCheck = true
      apiKeys = keysResponse.message;
    } catch (e) {
      console.log('Could not get API keys, using session auth');
    }

    await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify({
      user: userInfo.message,
      logged_in: true,
      api_key: apiKeys?.api_key,
      api_secret: apiKeys?.api_secret,
    }));

    return { success: true, user: userInfo.message };
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

// ==================== SHOP DOCTYPE ====================

export async function getShops() {
  const response = await frappeRequest('/api/resource/Shop?fields=["*"]&limit_page_length=999');

  // Get all items to calculate counts and values per shop
  const itemsResponse = await frappeRequest('/api/resource/Product?fields=["shop","unit_price","current_stock"]&limit_page_length=999');
  const items = itemsResponse.data || [];

  const shops = (response.data || []).map(shop => {
    const shopItems = items.filter(item => item.shop === shop.name);
    const totalValue = shopItems.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.current_stock || 0)), 0);

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
    };
  });

  return { shops };
}

export async function createShop(shopData) {
  const frappeData = {
    shop_name: shopData.shop_name,
    location: shopData.description || 'Main Location',
    address: shopData.address || '',
    mobile_number: shopData.mobile_number || '0700000000',
    email_address: shopData.email_address || 'shop@example.com',
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

  const response = await frappeRequest(`/api/resource/Shop/${shopId}`, {
    method: 'PUT',
    body: JSON.stringify(frappeData),
  });

  return {
    shop: {
      id: response.data.name,
      shop_name: response.data.shop_name,
      description: response.data.location,
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
  const response = await frappeRequest('/api/resource/Product?fields=["*"]&limit_page_length=999');

  const items = (response.data || []).map(item => ({
    id: item.name,
    item_name: item.item_name,
    description: item.description || '',
    sku: item.name, // Use Frappe's auto-generated name as SKU
    unit_price: item.selling_price || 0,
    cost_price: item.price || 0,
    current_stock: item.stock_quantity || 0,
    shop_id: item.shop,
    shop_name: item.shop_name,
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
    uom: 'Pcs',
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
      current_stock: response.data.stock_quantity || 0,
      shop_id: response.data.shop,
    }
  };
}

export async function updateItem(itemId, itemData) {
  const frappeData = {
    item_name: itemData.item_name,
    price: itemData.cost_price,
    selling_price: itemData.unit_price,
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

  const sales = (response.data || []).map(sale => ({
    id: sale.name,
    total_amount: sale.total || 0,
    sale_date: sale.posting_date,
    notes: sale.delivery_location || '',
    shop_name: sale.shop,
    shop_id: sale.shop,
    items_count: sale.items?.length || 0,
    created_at: sale.creation,
    updated_at: sale.modified,
  }));

  return { sales };
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
    posting_date: saleData.sale_date || new Date().toISOString().split('T')[0],
    customer_name: saleData.customer_name || 'Walk-in Customer',
    customer_mobile_number: saleData.customer_mobile_number || '',
    payment_method: saleData.payment_method || 'cash',
    delivery_location: saleData.delivery_location || '',
    notes: saleData.notes || '',
    items: items,
  };

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

// ==================== PRODUCT STOCK DOCTYPE ====================

export async function getStockTransactions() {
  const response = await frappeRequest('/api/resource/Product Stock?fields=["*"]&limit_page_length=999&order_by=creation desc');

  const transactions = (response.data || []).map(trans => ({
    id: trans.name,
    transaction_type: trans.purpose === 'Add Stock' ? 'in' : 'out',
    quantity: 0, // Will need to sum from child table
    reason: trans.purpose,
    created_at: trans.creation,
    shop_id: trans.shop,
    shop_name: trans.shop,
  }));

  return { transactions };
}

export async function createStockTransaction(transactionData) {
  const purpose = transactionData.transaction_type === 'in' ? 'Add Stock' : 'Remove Stock';

  const frappeData = {
    doctype: 'Product Stock',
    shop: transactionData.shop_id,
    date: new Date().toISOString().split('T')[0],
    purpose: purpose,
    products: [{
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
