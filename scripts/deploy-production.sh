#!/bin/bash

# Production Deployment Script for Drift Payments App
# This script sets up the database schema and ensures everything is ready for production

set -e  # Exit on any error

echo "🚀 Starting production deployment..."

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ ERROR: NEXT_PUBLIC_SUPABASE_URL environment variable is not set"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
    exit 1
fi

echo "✅ Environment variables check passed"

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Push database schema (creates tables if they don't exist)
echo "🗄️ Setting up database schema..."
npx prisma db push --accept-data-loss

echo "✅ Database schema setup complete"

# Verify database connection
echo "🔍 Verifying database connection..."
node -e "
const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('✅ Database connection successful');
    return prisma.\$disconnect();
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });
"

echo "🎉 Production deployment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Ensure Row Level Security (RLS) is configured in Supabase"
echo "2. Run the RLS setup SQL from DATABASE_SETUP.md if not already done"
echo "3. Test the application endpoints" 