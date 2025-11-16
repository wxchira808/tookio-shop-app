# Frappe API Integration Guide

This guide explains how to use the mobile app with your Frappe backend instead of the PostgreSQL backend.

## Features

### ✅ What's Included

1. **Automatic Session Timeout Detection** - The app automatically detects when your Frappe session expires (when you become a "Guest" user) and redirects you to login
2. **Proper Subscription Fetching** - Subscription data is fetched using the same method as your Frappe portal's `/subscriptions` page
3. **Native Login Form** - Clean, native mobile login form (no WebView required)
4. **Delete Functionality** - Full delete support for:
   - Products/Items
   - Stock Transactions
   - Sales Transactions
   - Purchase Transactions
5. **Cookie-based Authentication** - Uses Frappe's standard cookie authentication
6. **Error Handling** - Proper error messages extracted from Frappe responses

## Setup

### 1. Configure Environment Variables

Copy the Frappe environment example file:

```bash
cd apps/mobile
cp .env.frappe.example .env
```

Edit `.env` and update the Frappe URL:

```bash
EXPO_PUBLIC_USE_FRAPPE_AUTH=true
EXPO_PUBLIC_FRAPPE_URL=https://shop.tookio.co.ke
```

For local development:
```bash
EXPO_PUBLIC_FRAPPE_URL=http://localhost:8000
```

For testing on a real device (use your computer's IP):
```bash
EXPO_PUBLIC_FRAPPE_URL=http://192.168.100.81:8000
```

### 2. Restart the App

After updating the `.env` file, restart your Expo development server:

```bash
npx expo start -c
```

The `-c` flag clears the cache to ensure environment variables are reloaded.

## API Usage

### Basic Example

```javascript
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/utils/frappeApi';

// Fetch all products
async function loadProducts() {
  try {
    const products = await getProducts();
    console.log('Products:', products);
  } catch (error) {
    console.error('Error:', error.message);
    // If session timed out, user will be automatically redirected to login
  }
}

// Create a new product
async function addProduct() {
  try {
    const product = await createProduct({
      product_name: 'New Product',
      description: 'Product description',
      price: 100.00,
      shop: 'SHOP-0001',
    });
    console.log('Created:', product);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Update a product
async function editProduct() {
  try {
    const updated = await updateProduct('PROD-0001', {
      product_name: 'Updated Name',
      price: 150.00,
    });
    console.log('Updated:', updated);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Delete a product
async function removeProduct() {
  try {
    await deleteProduct('PROD-0001');
    console.log('Deleted successfully');
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Available API Functions

#### Authentication
- `login(username, password)` - Login to Frappe
- `logout()` - Logout from Frappe
- `getLoggedUser()` - Get current logged in user email
- `getUserDetails(email)` - Get user details including subscription

#### Shops
- `getShops()` - Get all shops
- `createShop(shopData)` - Create a new shop
- `updateShop(shopId, shopData)` - Update a shop
- `deleteShop(shopId)` - Delete a shop

#### Products/Items
- `getProducts()` - Get all products
- `createProduct(productData)` - Create a new product
- `updateProduct(productId, productData)` - Update a product
- `deleteProduct(productName)` - Delete a product ✨ **NEW**

#### Stock
- `getProductStock()` - Get product stock
- `createStockTransaction(transactionData)` - Create stock transaction
- `deleteStockTransaction(transactionName)` - Delete stock transaction ✨ **NEW**

#### Sales
- `getSales()` - Get all sales
- `createSale(saleData)` - Create a sale
- `deleteSalesTransaction(transactionName)` - Delete sales transaction ✨ **NEW**

#### Purchases
- `getPurchases()` - Get all purchases
- `createPurchase(purchaseData)` - Create a purchase
- `deletePurchaseTransaction(transactionName)` - Delete purchase transaction ✨ **NEW**

#### Subscription Data ✨ **NEW**
- `getSubscriptionData(userEmail)` - Get subscription details using portal user approach

## Session Timeout Handling

### How It Works

The Frappe API automatically detects when your session has expired in these scenarios:

1. **User becomes "Guest"** - When Frappe returns responses indicating the user is "Guest"
2. **Permission errors** - When you get permission errors due to session timeout
3. **Server messages** - When server messages contain "Guest" user indicators

### What Happens on Timeout

When a session timeout is detected:

1. The API logs: `⏱️ Session timeout detected. Redirecting to login...`
2. Auth state is cleared from the store
3. Secure storage is cleared
4. The `useRequireAuth` hook automatically shows the login modal
5. User can login again seamlessly

### Example Error Log

Before (old behavior):
```
❌ Error [/api/resource/Product]: User Guest does not have doctype access via role permission for document Product
[App continues to throw errors on every request]
```

After (new behavior):
```
❌ Error [/api/resource/Product]: User is Guest (session timeout)
⏱️ Session timeout detected. Redirecting to login...
[Login modal appears automatically]
```

## Subscription Data

### How Subscription Is Fetched

The app now fetches subscription data the same way your Frappe portal does:

1. Get the Portal User document for the logged-in user
2. Find the associated Customer
3. Query for active Subscriptions (`Active` or `Past Due Date` status)
4. Get the Subscription Plan details
5. Extract plan limits (items_allowed, shops_allowed, etc.)

### Subscription Fields

When you call `getUserDetails()`, you get:

```javascript
{
  email: 'user@example.com',
  name: 'User Name',
  username: 'user@example.com',
  subscription_tier: 'Premium',      // Plan name
  subscription_expiry: '2025-12-31', // Expiry date
  subscription_status: 'Active',     // Status
  items_allowed: 100,                // From plan
  shops_allowed: 5,                  // From plan
}
```

### Free Tier Handling

If no subscription is found or the user is not associated with a customer, the app defaults to:

```javascript
{
  plan_name: 'free',
  status: 'active',
  items_allowed: 10,
  shops_allowed: 1,
}
```

## Migrating from PostgreSQL Backend

If you're currently using the PostgreSQL backend and want to switch to Frappe:

### 1. Update Environment Variables

Change from:
```bash
EXPO_PUBLIC_API_URL=http://localhost:4000
```

To:
```bash
EXPO_PUBLIC_USE_FRAPPE_AUTH=true
EXPO_PUBLIC_FRAPPE_URL=https://shop.tookio.co.ke
```

### 2. Update Imports

Change from:
```javascript
import { getItems, createItem } from '@/utils/api';
```

To:
```javascript
import { getProducts, createProduct } from '@/utils/frappeApi';
```

### 3. Update Field Names

Frappe uses different field names than the PostgreSQL backend:

| PostgreSQL | Frappe |
|------------|--------|
| `items` | `products` (Product doctype) |
| `item_name` | `product_name` |
| `shop_id` | `shop` (link field) |
| `id` | `name` (Frappe's primary key) |

### 4. Update Delete Operations

Old way (may not exist):
```javascript
await deleteItem(itemId);  // By ID
```

New way (Frappe):
```javascript
await deleteProduct('PROD-0001');  // By name
```

## Troubleshooting

### "Session timeout" on every request

**Cause**: You're not logged in or cookies aren't being saved.

**Solution**:
1. Make sure you're using `credentials: 'include'` (already done in frappeApi.js)
2. Check that your Frappe site allows cookies from your app's origin
3. Try logging in again

### "Module not found: @/utils/frappeApi"

**Cause**: The file path isn't resolved correctly.

**Solution**:
1. Make sure `frappeApi.js` exists in `apps/mobile/src/utils/`
2. Restart your development server with `npx expo start -c`

### Environment variables not updating

**Cause**: Expo caches environment variables.

**Solution**:
```bash
npx expo start -c
```

The `-c` flag clears the cache.

### CORS errors when testing on device

**Cause**: Your Frappe site doesn't allow requests from your app's origin.

**Solution**:
1. In Frappe, go to: Settings > System Settings
2. Add your app's origin to allowed origins
3. For development, you might need to add `http://192.168.x.x:8081`

## Example: Complete Screen Migration

Here's an example of migrating the items screen to use Frappe API:

```javascript
// apps/mobile/src/app/(tabs)/items.jsx

import { useState, useEffect } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/utils/frappeApi';

export default function ItemsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      // Session timeout is handled automatically
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(product) {
    Alert.alert(
      'Delete Product',
      `Delete ${product.product_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.name);
              await loadProducts(); // Reload list
              Alert.alert('Success', 'Product deleted');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }

  return (
    <View>
      <FlatList
        data={products}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onDelete={() => handleDelete(item)}
          />
        )}
        onRefresh={loadProducts}
        refreshing={loading}
      />
    </View>
  );
}
```

## Benefits of Frappe Integration

1. **✅ Single Source of Truth** - Your mobile app and web portal use the same Frappe backend
2. **✅ Automatic Session Management** - No more confusing "Guest" errors
3. **✅ Consistent Subscription Data** - Same data shown on web and mobile
4. **✅ Native Experience** - No WebView required for login
5. **✅ Better Error Messages** - Clean error messages without HTML tags
6. **✅ Delete Support** - Full CRUD operations on all doctypes

## Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify your Frappe URL is correct
3. Ensure your Frappe site is accessible from your device/emulator
4. Check that CORS is configured correctly on your Frappe site
5. Make sure you have the required permissions for the doctypes you're accessing

---

**Happy coding! 🚀**
