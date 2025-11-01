#!/bin/bash

# Tookio Shop - Quick Setup Script
# This script helps you get started quickly

echo "🏪 Tookio Shop - Setup Helper"
echo "=============================="
echo ""

# Check Node.js
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version is too old (need v18+)"
    echo "   Current: $(node -v)"
    echo "   Download latest from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) installed"
echo "✅ npm $(npm -v) installed"
echo ""

# Check if .env files exist
echo "Checking environment configuration..."

if [ ! -f "apps/web/.env" ]; then
    echo "⚠️  Web app .env not found"
    if [ -f "apps/web/.env.example" ]; then
        cp apps/web/.env.example apps/web/.env
        echo "✅ Created apps/web/.env from example"
        echo "   ⚠️  You need to edit it and add your DATABASE_URL!"
    fi
else
    echo "✅ Web app .env exists"
fi

if [ ! -f "apps/mobile/.env" ]; then
    echo "⚠️  Mobile app .env not found"
    if [ -f "apps/mobile/.env.example" ]; then
        cp apps/mobile/.env.example apps/mobile/.env
        echo "✅ Created apps/mobile/.env from example"
    fi
else
    echo "✅ Mobile app .env exists"
fi

echo ""
echo "Next steps:"
echo "==========="
echo ""
echo "1. Setup Database (5 min):"
echo "   - Go to https://neon.tech and create account"
echo "   - Create new project"
echo "   - Copy connection string"
echo "   - Run schema.sql in their SQL editor"
echo ""
echo "2. Configure apps/web/.env:"
echo "   - Add your DATABASE_URL from Neon"
echo "   - Add a random AUTH_SECRET (run: openssl rand -base64 32)"
echo ""
echo "3. Install dependencies:"
echo "   cd apps/web && npm install"
echo "   cd apps/mobile && npm install"
echo ""
echo "4. Start the apps:"
echo "   Terminal 1: cd apps/web && npm run dev"
echo "   Terminal 2: cd apps/mobile && npx expo start"
echo ""
echo "Read QUICKSTART.md for detailed instructions!"
echo ""
