#!/bin/bash

echo "🔄 Node Version Switcher for Tookio Shop"
echo "========================================"
echo ""
echo "Current Node: $(node --version)"
echo ""

echo "Available options:"
echo "1) Switch to Node 18 (for Frappe/ERPNext)"
echo "2) Switch to Node 20 (for mobile app building)"
echo "3) Check current version"
echo ""

read -p "Choose option (1, 2, or 3): " choice

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

case $choice in
  1)
    echo "Switching to Node 18..."
    nvm use 18
    echo "✅ Now using: $(node --version)"
    echo "   (Safe for Frappe/ERPNext)"
    ;;
  2)
    echo "Switching to Node 20..."
    nvm use 20
    echo "✅ Now using: $(node --version)"
    echo "   (Required for mobile app building)"
    ;;
  3)
    echo "Current Node version: $(node --version)"
    echo "Current npm version: $(npm --version)"
    ;;
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "💡 Tip: You can always switch back with this script!"
echo "   Run: ./switch-node.sh"