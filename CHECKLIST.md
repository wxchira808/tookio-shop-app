# ✅ Tookio Shop Setup Checklist

Copy this checklist and check off items as you complete them!

## 📋 Pre-Setup (5 minutes)

- [ ] Node.js v18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Read `START_HERE.md` or `QUICKSTART.md`
- [ ] Have a text editor ready (VS Code recommended)

## 🗄️ Database Setup (5-10 minutes)

- [ ] Created account at https://neon.tech
- [ ] Created new project "tookio-shop"
- [ ] Copied connection string
- [ ] Opened SQL Editor in Neon dashboard
- [ ] Copied all of `schema.sql`
- [ ] Pasted into SQL Editor and ran it
- [ ] Verified tables were created (check left sidebar)
- [ ] Saved connection string somewhere safe

## ⚙️ Environment Configuration (2-3 minutes)

### Web App
- [ ] Navigated to `apps/web/`
- [ ] Copied `.env.example` to `.env`
- [ ] Opened `.env` in text editor
- [ ] Added `DATABASE_URL` (from Neon)
- [ ] Generated random string for `AUTH_SECRET`
  - [ ] Used `openssl rand -base64 32` OR
  - [ ] Mashed keyboard for 30+ random characters
- [ ] Saved `.env` file

### Mobile App
- [ ] Navigated to `apps/mobile/`
- [ ] Copied `.env.example` to `.env`
- [ ] Kept default values (fine for web testing)
- [ ] Saved `.env` file

## 📦 Dependencies Installation (5-10 minutes)

### Web App
- [ ] Opened terminal
- [ ] Ran `cd apps/web`
- [ ] Ran `npm install`
- [ ] Waited for installation to complete
- [ ] No error messages

### Mobile App
- [ ] Opened another terminal (or same after web)
- [ ] Ran `cd apps/mobile`
- [ ] Ran `npm install`
- [ ] Waited for installation to complete
- [ ] No error messages

## 🚀 First Run (2-3 minutes)

### Web Server (Terminal 1)
- [ ] Ran `cd apps/web` (if not already there)
- [ ] Ran `npm run dev`
- [ ] Saw "Server running at http://localhost:3000"
- [ ] No error messages
- [ ] Opened http://localhost:3000 in browser
- [ ] Saw the web app interface

### Mobile App (Terminal 2)
- [ ] Ran `cd apps/mobile` (if not already there)
- [ ] Ran `npx expo start`
- [ ] Saw QR code and menu
- [ ] Pressed `w` for web
- [ ] Mobile app opened in browser
- [ ] Saw the Tookio Shop dashboard

## 🧪 Testing Basic Features (5 minutes)

### Authentication
- [ ] Clicked "Sign Up" in web or mobile
- [ ] Created account with email/password
- [ ] Logged in successfully
- [ ] Saw dashboard with "Tookio Shop" title

### Create Shop
- [ ] Clicked "Shops" tab or "Manage Shops"
- [ ] Clicked "Add Shop" or "+"
- [ ] Entered shop name (e.g., "Main Store")
- [ ] Shop created successfully
- [ ] Shop appears in list

### Add Items
- [ ] Clicked "Items" tab or "Products"
- [ ] Clicked "Add Item" or "+"
- [ ] Filled in item details:
  - [ ] Item name
  - [ ] SKU
  - [ ] Unit price
  - [ ] Cost price
  - [ ] Initial stock
- [ ] Item created successfully
- [ ] Item appears in list

### Record Purchase
- [ ] Clicked "Purchases" tab
- [ ] Clicked "+" or "New Purchase"
- [ ] Selected shop
- [ ] Added items with quantities
- [ ] Saved purchase
- [ ] Stock updated automatically

### View Stock Transactions
- [ ] Clicked "Stock" tab
- [ ] Saw transaction history
- [ ] Verified purchase appears as "Stock Added"

## 🎉 Success Verification

- [ ] Can sign up and log in
- [ ] Can create shops
- [ ] Can add items to shops
- [ ] Can record purchases
- [ ] Stock updates automatically
- [ ] Can view transaction history
- [ ] Web app works
- [ ] Mobile app works in browser

## 📱 Optional: Test on Phone

- [ ] Downloaded "Expo Go" from App Store/Play Store
- [ ] Found computer's IP address
  - [ ] Mac/Linux: `ifconfig | grep "inet "`
  - [ ] Windows: `ipconfig`
- [ ] Updated `apps/mobile/.env` with `EXPO_PUBLIC_API_URL=http://YOUR_IP:3000`
- [ ] Restarted Expo (`npx expo start`)
- [ ] Scanned QR code with Expo Go
- [ ] App loaded on phone
- [ ] Can log in and use app

## 🔨 Next Steps (Optional but Recommended)

- [ ] Read `MOBILE_API_EXAMPLE.jsx` to understand API integration
- [ ] Connect mobile screens to real API (currently use placeholder data)
- [ ] Customize UI colors/styles
- [ ] Add more features you need
- [ ] Deploy to production

## 📚 Learning Checklist

- [ ] Understand project structure (`ARCHITECTURE.md`)
- [ ] Know where API routes are (`apps/web/src/app/api/`)
- [ ] Know where mobile screens are (`apps/mobile/src/app/(tabs)/`)
- [ ] Understand database schema (`schema.sql`)
- [ ] Know how to make API calls (`MOBILE_API_EXAMPLE.jsx`)
- [ ] Comfortable with basic debugging

## 🐛 Troubleshooting Checklist

If something doesn't work:

- [ ] Checked DATABASE_URL is correct in `apps/web/.env`
- [ ] Verified schema.sql ran successfully in Neon
- [ ] Confirmed web server is running (`npm run dev`)
- [ ] Checked for error messages in terminal
- [ ] Tried clearing cache (`npx expo start -c`)
- [ ] Checked firewall isn't blocking port 3000
- [ ] Read error messages carefully
- [ ] Checked SETUP_SUMMARY.md troubleshooting section

## 📊 Status

**Current Progress:** ___ / ___ tasks completed

**Estimated Time Remaining:** ___ minutes

**Blocked on:** _______________________________

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

---

## 🎓 For Frappe Developers

If you're coming from Frappe/ERPNext:

- [ ] Understood React hooks = Python decorators concept
- [ ] Understood API routes = whitelisted methods
- [ ] Understood SQL template tags = frappe.db calls
- [ ] Understood component state = form state
- [ ] Comfortable with the differences

---

## ✅ Completion Checklist

You're ready to build when:

- [x] Database is setup and schema is loaded
- [x] Environment files are configured
- [x] Both apps are running without errors
- [x] You can create an account and log in
- [x] You can perform basic CRUD operations
- [x] You understand the project structure
- [x] You know where to find documentation

## 🎉 Congratulations!

Once all items are checked, you have a fully functional inventory management system!

**Next:** Start customizing it for your specific needs or read the API example to understand how to enhance it.

---

**Date Started:** _________________
**Date Completed:** _________________
**Total Time:** _________________
