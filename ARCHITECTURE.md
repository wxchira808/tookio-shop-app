
# 🏗️ Tookio Shop Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     TOOKIO SHOP SYSTEM                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Mobile App     │    │     Web App      │    │   PostgreSQL     │
│  (React Native)  │    │  (React Router)  │    │  (Neon.tech)     │
│                  │    │                  │    │                  │
│  • iOS           │◄───┤  • Frontend      │◄───┤  • auth_users    │
│  • Android       │    │  • Backend API   │    │  • shops         │
│  • Web           │    │  • Auth System   │    │  • items         │
│                  │    │                  │    │  • purchases     │
└──────────────────┘    └──────────────────┘    │  • sales         │
                                                 │  • stock_trans   │
                                                 └──────────────────┘
```

## Data Flow

### 1. User Authentication
```
Mobile/Web → Login Request → Auth.js → Check Database
                                     ↓
                              Generate Session
                                     ↓
                            Return Session Token
                                     ↓
                        Store in SecureStore/Cookie
```

### 2. API Request Flow
```
User Action (e.g., "Add Item")
         ↓
Mobile App (src/utils/api.js)
         ↓
HTTP Request with Session Token
         ↓
Web Server (apps/web/src/app/api/)
         ↓
Verify Auth Session
         ↓
Database Query (PostgreSQL)
         ↓
Return JSON Response
         ↓
Update UI
```

### 3. Stock Update Flow (Purchase)
```
Record Purchase
      ↓
Create purchase record
      ↓
Create purchase_items
      ↓
Update items.current_stock (+)
      ↓
Log stock_transaction (type: 'in')
      ↓
Return success
```

### 4. Stock Update Flow (Sale)
```
Record Sale
      ↓
Check stock availability
      ↓
Create sale record
      ↓
Create sale_items
      ↓
Update items.current_stock (-)
      ↓
Log stock_transaction (type: 'out')
      ↓
Return success
```

## Database Schema Relationships

```
auth_users (id, email, password_hash)
    │
    ├─► shops (user_id FK)
    │       │
    │       ├─► items (shop_id FK)
    │       │      │
    │       │      ├─► purchase_items (item_id FK)
    │       │      ├─► sale_items (item_id FK)
    │       │      └─► stock_transactions (item_id FK)
    │       │
    │       ├─► purchases (shop_id FK)
    │       │      │
    │       │      └─► purchase_items (purchase_id FK)
    │       │
    │       └─► sales (shop_id FK)
    │              │
    │              └─► sale_items (sale_id FK)
    │
    ├─► auth_sessions (userId FK)
    └─► auth_accounts (userId FK)
```

## Mobile App Structure

```
apps/mobile/
├── App.tsx (Entry point)
├── src/
│   ├── app/
│   │   ├── _layout.jsx (Root layout)
│   │   ├── (tabs)/     (Tab navigation)
│   │   │   ├── _layout.jsx      (Tab bar config)
│   │   │   ├── index.jsx        (Dashboard)
│   │   │   ├── shops.jsx        (Shops list)
│   │   │   ├── items.jsx        (Items list)
│   │   │   ├── purchases.jsx    (Purchases)
│   │   │   ├── sales.jsx        (Sales)
│   │   │   └── stock.jsx        (Stock movements)
│   │   └── profile.jsx (User profile)
│   │
│   └── utils/
│       ├── api.js              (API helper - NEW!)
│       └── auth/
│           ├── useAuth.js      (Auth hook)
│           └── store.js        (Auth state)
```

## Web App Structure

```
apps/web/
├── src/
│   ├── auth.js (Auth configuration)
│   └── app/
│       ├── page.jsx (Home page)
│       ├── layout.jsx (Root layout)
│       │
│       └── api/ (Backend API routes)
│           ├── shops/
│           │   └── route.js
│           │       ├── GET /api/shops
│           │       └── POST /api/shops
│           │
│           ├── items/
│           │   └── route.js
│           │       ├── GET /api/items
│           │       └── POST /api/items
│           │
│           ├── purchases/
│           │   └── route.js
│           │       ├── GET /api/purchases
│           │       └── POST /api/purchases
│           │
│           ├── sales/
│           │   └── route.js
│           │       ├── GET /api/sales
│           │       └── POST /api/sales
│           │
│           └── utils/
│               └── sql.js (Database helper)
```

## Request/Response Flow

### Example: Creating a Purchase

```
1. USER ACTION
   Mobile App: User fills purchase form
   └─► { shop_id: 1, items: [{item_id: 5, quantity: 10, unit_cost: 50}] }

2. API CALL
   POST /api/purchases
   Headers: { Cookie: "session-token=xxx" }
   Body: { shop_id: 1, items: [...], notes: "..." }

3. BACKEND PROCESSING
   ├─► Verify user session (auth middleware)
   ├─► Validate shop belongs to user
   ├─► Validate all items exist
   ├─► Calculate total amount
   └─► Start transaction:
       ├─► INSERT INTO purchases
       ├─► INSERT INTO purchase_items
       ├─► UPDATE items SET current_stock += quantity
       └─► INSERT INTO stock_transactions

4. RESPONSE
   Status: 201 Created
   Body: { purchase: { id, items, total_amount, ... } }

5. UI UPDATE
   Mobile App: Refresh purchases list, show success toast
```

## Authentication Flow

```
┌─────────────┐
│   Sign Up   │
└──────┬──────┘
       │
       ├─► Create auth_users record
       ├─► Hash password with Argon2
       ├─► Create auth_accounts record
       ├─► Create session
       └─► Return session token
       
┌─────────────┐
│   Sign In   │
└──────┬──────┘
       │
       ├─► Find user by email
       ├─► Verify password hash
       ├─► Create session
       └─► Return session token
       
┌─────────────┐
│ API Request │
└──────┬──────┘
       │
       ├─► Extract session token
       ├─► Lookup in auth_sessions
       ├─► Check expiry
       ├─► Load user from auth_users
       └─► Proceed with request
```

## Technology Stack Layers

```
┌─────────────────────────────────────────────┐
│           USER INTERFACE                    │
│  React Native (Mobile) | React (Web)        │
├─────────────────────────────────────────────┤
│           ROUTING/NAVIGATION                │
│  Expo Router (Mobile) | React Router (Web)  │
├─────────────────────────────────────────────┤
│           STATE MANAGEMENT                  │
│  React Hooks (useState, useEffect)          │
│  Zustand (Auth state)                       │
├─────────────────────────────────────────────┤
│           API LAYER                         │
│  Fetch API with custom helpers              │
│  src/utils/api.js (Mobile)                  │
├─────────────────────────────────────────────┤
│           BACKEND API                       │
│  React Router API Routes                    │
│  File-based routing                         │
├─────────────────────────────────────────────┤
│           AUTHENTICATION                    │
│  Auth.js with Credentials Provider          │
│  Argon2 password hashing                    │
├─────────────────────────────────────────────┤
│           DATABASE LAYER                    │
│  @neondatabase/serverless                   │
│  SQL template tag queries                   │
├─────────────────────────────────────────────┤
│           DATABASE                          │
│  PostgreSQL (Neon serverless)               │
└─────────────────────────────────────────────┘
```

## Development vs Production

### Development (Local)
```
Mobile App (Expo)  ──► http://localhost:3000  ──► PostgreSQL
     ↓                      ↓                       (Neon)
  Browser            React Router Dev
  or Phone              Server
```

### Production (Deployed)
```
Mobile App        ──► https://yourapp.com  ──► PostgreSQL
(App Store)              ↓                      (Neon)
                   Deployed Server
                   (Vercel/Railway)
```

## Key Design Patterns

### 1. API Helper Pattern (Mobile)
```javascript
// Centralized API functions
import { getShops } from '@/utils/api';

// In component
const [shops, setShops] = useState([]);
useEffect(() => {
  getShops().then(data => setShops(data.shops));
}, []);
```

### 2. Route Handler Pattern (Backend)
```javascript
// apps/web/src/app/api/shops/route.js
export async function GET(request) {
  const session = await auth();
  const shops = await sql`SELECT * FROM shops WHERE user_id = ${session.user.id}`;
  return Response.json({ shops });
}
```

### 3. Auth Hook Pattern (Mobile)
```javascript
// Require auth for screen
function MyScreen() {
  useRequireAuth(); // Auto-redirects if not logged in
  // ... rest of component
}
```

## Security Model

```
┌──────────────────────────────────────┐
│  User ID in Session                  │
│  ↓                                   │
│  All queries filter by user_id       │
│  ↓                                   │
│  Users can only see their own data   │
└──────────────────────────────────────┘

Row-Level Security:
- Shops: WHERE user_id = session.user.id
- Items: WHERE shop_id IN (user's shops)
- Purchases: WHERE shop_id IN (user's shops)
- Sales: WHERE shop_id IN (user's shops)
```

## Summary

This is a **full-stack serverless application** with:

✅ Cross-platform mobile app (iOS/Android/Web)
✅ Web application with backend API
✅ PostgreSQL database with proper relations
✅ Secure authentication system
✅ Real-time inventory tracking
✅ Complete CRUD operations
✅ Production-ready architecture

All you need to do is:
1. Setup database (Neon.tech)
2. Configure environment
3. Run the apps
4. Optionally connect mobile screens to API
