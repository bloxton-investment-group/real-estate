#!/bin/bash

# Deployment script for Bloxton Investment Group Real Estate App

echo "🏢 Bloxton Investment Group - Real Estate App Deployment"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📋 Pre-deployment checks..."

# Check if build passes
echo "🔨 Testing build process..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Check if Convex is deployed
echo "☁️  Checking Convex deployment..."
npx convex deploy -y --dry-run > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Convex deployment ready"
else
    echo "⚠️  Convex deployment may need updates"
fi

echo ""
echo "🚀 Ready for Vercel deployment!"
echo ""
echo "Next steps:"
echo "1. Create Clerk production app at https://clerk.com"
echo "2. Connect this repo to Vercel at https://vercel.com"
echo "3. Set environment variables in Vercel dashboard:"
echo "   - NEXT_PUBLIC_CONVEX_URL=https://affable-gazelle-170.convex.cloud"
echo "   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=(from Clerk production app)"
echo "   - CLERK_SECRET_KEY=(from Clerk production app)"
echo "   - CLERK_WEBHOOK_SECRET=(from Clerk webhook config)"
echo ""
echo "📚 See DEPLOYMENT.md for detailed instructions"