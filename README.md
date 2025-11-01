# 🏪 Tookio Shop - Inventory Tracker

A full-stack cross-platform inventory management system built with React Native (mobile) and React Router (web).

## 📱 What This App Does

Tookio Shop is a complete inventory tracking system that lets you:

- **Manage Multiple Shops** - Create and manage different store locations
- **Track Products** - Add items with SKU, pricing, and stock levels
- **Record Purchases** - Log inventory purchases and auto-update stock
- **Monitor Stock** - Track all inventory movements (in/out/adjustments)
- **Process Sales** - Record customer sales and update inventory
- **User Authentication** - Secure login/signup with email & password
- **Subscription Tiers** - Free, Starter, and Pro plans with different limits

## 🏗️ Architecture

### For Frappe Developers:

This app is similar to ERPNext in structure but simpler:

```
ERPNext                  →    Tookio Shop
-------------------------     -------------------------
DocType (Item)           →    Items table
DocType (Purchase)       →    Purchases table  
DocType (Sales Invoice)  →    Sales table
Stock Ledger Entry       →    Stock Transactions table
Frappe Site              →    Web App (React Router)
Mobile App               →    Mobile App (React Native)
MariaDB                  →    PostgreSQL (Neon)
Frappe Framework         →    React + Express-like API
```

### Tech Stack:

- **Mobile**: React Native + Expo Router (iOS/Android/Web)
- **Web**: React Router 7 + Vite
- **Database**: PostgreSQL (via Neon serverless)
- **Auth**: Custom auth system with Argon2 password hashing
- **API**: File-based routing (similar to Next.js)

## 📋 Prerequisites

You need to install:

1. **Node.js** (v18 or higher)
   ```bash
   # Check if installed
   node --version
   
   # If not installed, download from: https://nodejs.org/
   ```

2. **npm** (comes with Node.js)
   ```bash
   npm --version
   ```

3. **Git** (optional, for version control)

## 🚀 Setup Instructions

### Step 1: Setup Database

1. Go to [Neon.tech](https://neon.tech) and create a free account
2. Create a new PostgreSQL database
3. Copy the connection string (looks like: `postgresql://user:pass@host.neon.tech/dbname`)
4. Run the schema:
   ```bash
   # They provide a SQL editor in their dashboard
   # Just copy/paste the contents of schema.sql into their SQL Editor and click Run
   # Or use psql command if you have it:
   psql "your-connection-string-here" < schema.sql
   ```

### Step 2: Configure Environment Variables

#### For Web App:
```bash
cd apps/web
cp .env.example .env
```

Edit `apps/web/.env` and add:
```bash
DATABASE_URL=your-neon-connection-string-here
AUTH_SECRET=generate-random-string-here
AUTH_URL=http://localhost:3000
PUBLIC_URL=http://localhost:3000
```

To generate AUTH_SECRET:
```bash
# On Linux/Mac:
openssl rand -base64 32

# Or just use any long random string
```

#### For Mobile App:
```bash
cd apps/mobile
cp .env.example .env
```

Edit `apps/mobile/.env`:
```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### Step 3: Install Dependencies

#### Web App:
```bash
cd apps/web
npm install
```

#### Mobile App:
```bash
cd apps/mobile
npm install
```

### Step 4: Run the Apps

#### Start Web Server (Backend + Frontend):
```bash
cd apps/web
npm run dev
```

The web app will be available at: `http://localhost:3000`

#### Start Mobile App:
```bash
cd apps/mobile
npx expo start
```

You'll see a QR code. You have 3 options:

1. **Test in Web Browser**: Press `w` (easiest for testing)
2. **Test on Your Phone**: 
   - Install "Expo Go" app from App Store/Play Store
   - Scan the QR code
3. **Test in Simulator**:
   - Press `i` for iOS simulator (Mac only)
   - Press `a` for Android emulator

**Important for Phone Testing:**
If testing on your actual phone, you need to update the API URL:

```bash
# In apps/mobile/.env
# Replace localhost with your computer's local IP address
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000

# Find your IP:
# Mac/Linux: ifconfig | grep inet
# Windows: ipconfig
```

## 📱 How to Use

### First Time Setup:

1. Open the web app: `http://localhost:3000`
2. Click "Sign Up" and create an account
3. Open mobile app and sign in with same credentials

### Using the App:

1. **Create a Shop** - Start by creating your first shop/store
2. **Add Items** - Add products to your inventory
3. **Record Purchases** - When you buy stock, record it (auto-updates inventory)
4. **Make Sales** - Record customer sales
5. **Check Stock** - View all inventory movements

## 📂 Project Structure

```
create-anything/
├── schema.sql                    # Database schema
├── apps/
│   ├── web/                      # Web application
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── api/          # API routes (like Frappe's @frappe.whitelist())
│   │   │   │   │   ├── shops/route.js
│   │   │   │   │   ├── items/route.js
│   │   │   │   │   ├── purchases/route.js
│   │   │   │   │   └── sales/route.js
│   │   │   │   └── page.jsx      # Frontend pages
│   │   │   └── auth.js            # Authentication logic
│   │   └── package.json
│   │
│   └── mobile/                    # Mobile application
│       ├── src/
│       │   ├── app/
│       │   │   └── (tabs)/        # Bottom tab screens
│       │   │       ├── index.jsx      # Dashboard
│       │   │       ├── shops.jsx      # Shops list
│       │   │       ├── items.jsx      # Items list
│       │   │       ├── purchases.jsx  # Purchases
│       │   │       ├── stock.jsx      # Stock movements
│       │   │       └── sales.jsx      # Sales (to be completed)
│       │   └── utils/
│       │       └── auth/          # Authentication hooks
│       └── package.json
```

## 🔐 Authentication

The app has built-in authentication:

- **Sign Up**: Create new account with email/password
- **Sign In**: Login with credentials
- **Sessions**: Secure session management
- **Password Security**: Argon2 hashing (like Frappe's pbkdf2)

## 💾 Database Tables

Similar to Frappe DocTypes:

| Table | Purpose | Like ERPNext |
|-------|---------|--------------|
| `auth_users` | User accounts | User DocType |
| `shops` | Store locations | Warehouse |
| `items` | Products | Item DocType |
| `purchases` | Purchase orders | Purchase Invoice |
| `purchase_items` | Purchase line items | Purchase Invoice Item |
| `sales` | Customer sales | Sales Invoice |
| `sale_items` | Sale line items | Sales Invoice Item |
| `stock_transactions` | Stock movements | Stock Ledger Entry |

## 🛠️ Development Tips

### Making API Changes (like Frappe whitelisted methods):

1. API files are in `apps/web/src/app/api/`
2. Each folder is a route (e.g., `api/shops/route.js` → `/api/shops`)
3. Export functions: `GET`, `POST`, `PUT`, `DELETE`

Example:
```javascript
// apps/web/src/app/api/items/route.js
export async function GET(request) {
  // Like @frappe.whitelist()
  const session = await auth();
  const items = await sql`SELECT * FROM items`;
  return Response.json({ items });
}
```

### Adding Mobile Screens:

1. Create new file in `apps/mobile/src/app/(tabs)/`
2. Update `_layout.jsx` to add tab icon
3. Use the same patterns as existing screens

### Database Queries:

Instead of `frappe.db.get_all()`, use:
```javascript
import sql from "@/app/api/utils/sql";

// Get records
const items = await sql`SELECT * FROM items WHERE shop_id = ${shopId}`;

// Insert
await sql`INSERT INTO items (shop_id, item_name) VALUES (${shopId}, ${name})`;
```

## 🐛 Troubleshooting

### "Database connection error"
- Check your `DATABASE_URL` in `.env`
- Make sure schema is loaded in Neon dashboard

### "Cannot connect to localhost"
- Web app: Check if `npm run dev` is running
- Mobile app: Use your computer's IP address, not localhost

### Mobile app not connecting to API
- Update `EXPO_PUBLIC_API_URL` to your computer's local IP
- Make sure web server is running
- Check firewall isn't blocking port 3000

### "Module not found" errors
- Run `npm install` in both `apps/web` and `apps/mobile`
- Delete `node_modules` and reinstall if issues persist

## 📝 What Needs to be Completed

The AI generated most of the app, but here's what's missing:

1. ✅ **Database Schema** - Now created in `schema.sql`
2. ✅ **Environment Files** - Created `.env.example` files
3. 🔨 **Sales Feature** - Needs completion on mobile side
4. 🔨 **API Integration** - Mobile app uses placeholder data, needs to connect to real API
5. 🔨 **Auth UI** - Basic auth exists but needs polishing

## 🎯 Next Steps

1. ✅ Setup database (Neon.tech)
2. ✅ Configure environment variables
3. ✅ Install dependencies
4. ✅ Run web server
5. ✅ Run mobile app
6. 🔨 Connect mobile to API (I'll help with this)
7. 🔨 Complete sales feature
8. 🔨 Test and deploy

## 🤝 Need Help?

Since you're a Frappe developer, think of it like this:

- **Frappe App** = This entire `create-anything` folder
- **Site** = Your web app instance
- **Bench Commands** = npm scripts
- **Frappe CLI** = Expo CLI
- **DocTypes** = Database tables
- **Hooks** = React hooks (useAuth, useEffect, etc.)

Feel free to ask questions about any part of the setup!

## 📄 License

Generated by Anything.world AI - customize as needed for your use case.
