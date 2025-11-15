# Remaining Screens to Update

This document tracks which screens still need Frappe API integration.

## ✅ Completed
- [x] Profile page - Shows real subscription data from Frappe
- [x] Items screen - Full CRUD with Frappe API + delete
- [x] Authentication - Frappe login + session timeout redirect
- [x] useUser hook - Fetches subscription data

## 🚧 In Progress
- [ ] Sales screen - Needs Frappe API mapping + delete
- [ ] Purchases screen - Needs Frappe API mapping + delete
- [ ] Stock screen - Needs Frappe API mapping + delete
- [ ] Shops screen - Already using Frappe API from items.jsx (shared)

## 📝 Implementation Notes

### Sales Screen
**Current state**: Imports from "@/utils/api"
**Needed changes**:
- Import `getSales, createSale, deleteSalesTransaction` from "@/utils/frappeApi"
- Map Frappe response fields
- Add delete button in UI

**Field mapping**:
```javascript
// Frappe → App
{
  name: sales.name,            // Primary key
  id: sales.name,
  sale_date: sales.transaction_date,
  shop_id: sales.shop,
  shop_name: sales.shop_name,
  total_amount: sales.total_amount,
  items: sales.items,          // Array of sale items
}
```

### Purchases Screen
**Current state**: Imports from "@/utils/api"
**Needed changes**:
- Import `getPurchases, createPurchase, deletePurchaseTransaction` from "@/utils/frappeApi"
- Map Frappe response fields
- Add delete button in UI

**Field mapping**:
```javascript
// Frappe → App
{
  name: purchase.name,         // Primary key
  id: purchase.name,
  purchase_date: purchase.transaction_date,
  shop_id: purchase.shop,
  shop_name: purchase.shop_name,
  total_amount: purchase.total_amount,
  items: purchase.items,        // Array of purchase items
}
```

### Stock Screen
**Current state**: Imports from "@/utils/api"
**Needed changes**:
- Import `getProductStock, createStockTransaction, deleteStockTransaction` from "@/utils/frappeApi"
- Map Frappe response fields
- Add delete button in UI

**Field mapping**:
```javascript
// Frappe → App
{
  name: stock.name,            // Primary key
  id: stock.name,
  product_id: stock.product,
  product_name: stock.product_name,
  transaction_type: stock.transaction_type,
  quantity: stock.quantity,
  reason: stock.reason,
  transaction_date: stock.creation,
}
```

## 🎨 UI Components Needed

### Delete Button Component
Add to each list item:
```jsx
<Pressable
  onPress={() => handleDelete(item)}
  style={({ pressed }) => ({
    padding: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    opacity: pressed ? 0.7 : 1,
  })}
>
  <Trash2 size={18} color="#EF4444" />
</Pressable>
```

### Delete Handler Pattern
```jsx
const handleDelete = (item) => {
  Alert.alert(
    "Delete Confirmation",
    `Delete this ${type}?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFunction(item.name);
            Alert.alert("Success", `${type} deleted`);
            await loadData();
          } catch (error) {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]
  );
};
```

## 🚀 Next: Payment Integration

After screens are updated, add:
1. Subscription management screen
2. M-Pesa/Stripe payment integration
3. In-app subscription upgrade
