# 🚀 Quick Start Guide - Tookio Shop

Get your inventory tracker app running in 5 minutes!

## ✅ Prerequisites Check

```bash
# Check if you have Node.js (need v18+)
node --version

# Check if you have npm
npm --version
```

If you don't have Node.js, download it from: https://nodejs.org/

## 📦 Step 1: Setup Database (5 minutes)

1. Go to https://neon.tech and sign up (it's free!)
2. Click "Create Project"
3. Name it "tookio-shop" 
4. Copy the connection string (starts with `postgresql://`)
5. In their dashboard, go to "SQL Editor"
6. Copy all content from `schema.sql` and paste it in the editor
7. Click "Run" to create all tables

## ⚙️ Step 2: Configure Environment

### Web App:
```bash
cd apps/web
cp .env.example .env
```

Edit `apps/web/.env` with your text editor and add:
- Your Neon database connection string
- A random secret for AUTH_SECRET

```bash
DATABASE_URL=postgresql://your-neon-connection-string-here
AUTH_SECRET=your-random-secret-here
```

Generate a random secret:
```bash
# Linux/Mac:
openssl rand -base64 32

# Or just mash your keyboard randomly for 30+ characters
```

### Mobile App:
```bash
cd apps/mobile
cp .env.example .env
```

The defaults should work for testing in web browser.

## 📥 Step 3: Install Dependencies

### Web:
```bash
cd apps/web
npm install
```

### Mobile:
```bash
cd apps/mobile
npm install
```

## 🎬 Step 4: Run the Apps!

### Terminal 1 - Start Web Server:
```bash
cd apps/web
npm run dev
```

Wait until you see: "Server running at http://localhost:3000"

### Terminal 2 - Start Mobile App:
```bash
cd apps/mobile
npx expo start
```

Press `w` to open in web browser (easiest way to test!)

## 🎉 Step 5: Test It Out

1. Open http://localhost:3000 in your browser
2. Click "Sign Up" and create an account
3. Create your first shop
4. Add some items
5. Try recording a purchase

## 📱 Testing on Your Phone

If you want to test on your actual phone:

1. Install "Expo Go" app from App Store or Play Store
2. Find your computer's IP address:
   ```bash
   # Mac/Linux:
   ifconfig | grep "inet "
   
   # Windows:
   ipconfig
   ```
3. Update `apps/mobile/.env`:
   ```
   EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:3000
   ```
4. Restart the mobile app (`npx expo start`)
5. Scan the QR code with Expo Go

## 🐛 Common Issues

### "Database connection error"
- Check your DATABASE_URL in `apps/web/.env`
- Make sure you ran the schema.sql in Neon dashboard

### "Cannot connect to server"
- Make sure `npm run dev` is running in apps/web
- Check if http://localhost:3000 opens in browser

### Mobile app shows blank screen
- Check the console for errors
- Try pressing `r` to reload in Expo

### "Module not found"
- Run `npm install` in both apps/web and apps/mobile
- Try deleting node_modules and reinstalling

## 📚 Next Steps

Once you have it running:

1. ✅ Sign up and create your account
2. ✅ Create your first shop
3. ✅ Add some inventory items
4. ✅ Record a test purchase
5. ✅ Try making a sale
6. ✅ Check the stock transactions

## 🆘 Need Help?

Check the full README.md for detailed explanations of:
- Project structure
- How to make changes
- Database schema details
- API endpoints
- Troubleshooting

## 🎯 What's Working

- ✅ User authentication (sign up/login)
- ✅ Shops management
- ✅ Items/inventory tracking
- ✅ Purchase recording (auto-updates stock)
- ✅ Sales recording
- ✅ Stock transaction history
- ✅ Web interface
- ✅ Mobile app (works in browser/phone)

Enjoy your new inventory tracker! 🎊
