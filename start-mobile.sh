#!/bin/bash
# Tookio Shop Mobile Starter

echo "📱 Starting Tookio Shop Mobile..."
echo ""

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node 20
nvm use 20 > /dev/null 2>&1

# Navigate to mobile directory
cd "$(dirname "$0")/apps/mobile"

echo "✅ Starting mobile app"
echo "   Press 'w' for web browser"
echo "   Press 'a' for Android emulator"
echo "   Press 'i' for iOS simulator"
echo "   Scan QR code with Expo Go app"
echo ""

# Start Expo (offline mode to skip version checks)
npx expo start --offline
