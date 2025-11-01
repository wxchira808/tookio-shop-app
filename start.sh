#!/bin/bash
# Tookio Shop Starter - Like "bench start" for Frappe

echo "🏪 Starting Tookio Shop..."
echo ""

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node 20
nvm use 20 > /dev/null 2>&1

# Navigate to web directory
cd "$(dirname "$0")/apps/web"

echo "✅ Starting web server on http://localhost:4000"
echo "   Press Ctrl+C to stop"
echo ""

# Start the server
npm run dev
