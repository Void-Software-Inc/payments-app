#!/bin/bash

# Local testing script - loads environment variables and runs deployment script
# Usage: ./scripts/test-local.sh

set -e

echo "🧪 Testing deployment script locally..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ ERROR: .env.local file not found"
    echo "📝 Create .env.local with your environment variables:"
    echo ""
    echo "DATABASE_URL=\"postgresql://postgres:your_password@your-supabase-url:5432/postgres\""
    echo "NEXT_PUBLIC_SUPABASE_URL=\"https://your-project-ref.supabase.co\""
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=\"your_anon_key_here\""
    echo "SUPABASE_SERVICE_ROLE_KEY=\"your_service_role_key_here\""
    echo ""
    exit 1
fi

# Load environment variables from .env.local
echo "📦 Loading environment variables from .env.local..."
export $(grep -v '^#' .env.local | xargs)

# Run the deployment script
echo "🚀 Running deployment script..."
./scripts/deploy-production.sh 