#!/bin/bash

# Manual Deployment Script for Turning Point Church Website
# Run this script to deploy your church website to Cloudflare Pages

echo "🏛️ Deploying Turning Point Church Website..."
echo "=========================================="

# Build the project
echo "📦 Building the project..."
npm run build

echo ""
echo "🎯 Manual Deployment Instructions:"
echo ""
echo "1. Go to https://dash.cloudflare.com"
echo "2. Click 'Workers & Pages' in the sidebar"
echo "3. Click 'Create application'"
echo "4. Choose 'Pages'"
echo "5. Connect to Git (GitHub)"
echo "6. Select repository: MrBATMAN119/TurningPointApp"
echo "7. Set build settings:"
echo "   - Build command: npm run build"
echo "   - Build output directory: dist"
echo "   - Framework preset: None"
echo ""
echo "8. Click 'Save and Deploy'"
echo ""
echo "🌐 Your website files are ready in the 'dist' directory!"
echo "📁 Project location: /home/user/webapp"
echo "📋 Repository: https://github.com/MrBATMAN119/TurningPointApp"
echo ""
echo "🙏 Your beautiful royal blue and gold church website will be live!"
echo "   Expected URL: https://turningpointapp.pages.dev"
echo ""