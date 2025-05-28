#!/bin/bash

# Database Connection Diagnostic Script
# This script helps diagnose P1001 database connection errors

echo "🔍 Database Connection Diagnostics"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

echo ""
echo "📋 Environment Variables Check:"
echo "------------------------------"

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL: Not set"
    echo "   Set this to: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
else
    echo "✅ DATABASE_URL: Set"
    # Mask password for security
    MASKED_URL=$(echo "$DATABASE_URL" | sed 's/:\/\/[^:]*:[^@]*@/:\/\/postgres:***@/')
    echo "   Value: $MASKED_URL"
fi

# Check NEXT_PUBLIC_SUPABASE_URL
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL: Not set"
else
    echo "✅ NEXT_PUBLIC_SUPABASE_URL: Set"
    echo "   Value: $NEXT_PUBLIC_SUPABASE_URL"
fi

# Check SUPABASE_SERVICE_ROLE_KEY
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY: Not set"
else
    echo "✅ SUPABASE_SERVICE_ROLE_KEY: Set"
    echo "   Value: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
fi

echo ""
echo "🔧 Prisma Client Check:"
echo "----------------------"

# Check if Prisma client exists
if [ -d "src/generated/prisma" ]; then
    echo "✅ Prisma client directory exists"
else
    echo "❌ Prisma client not found"
    echo "   Run: npx prisma generate"
fi

# Check if Prisma client files exist
if [ -f "src/generated/prisma/index.js" ] || [ -f "src/generated/prisma/index.d.ts" ]; then
    echo "✅ Prisma client files exist"
else
    echo "❌ Prisma client files missing"
    echo "   Run: npx prisma generate"
fi

echo ""
echo "🌐 Network Connectivity Test:"
echo "-----------------------------"

if [ ! -z "$DATABASE_URL" ]; then
    # Extract hostname from DATABASE_URL
    HOSTNAME=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    
    if [ ! -z "$HOSTNAME" ]; then
        echo "Testing connection to: $HOSTNAME"
        
        # Test if hostname resolves
        if nslookup "$HOSTNAME" > /dev/null 2>&1; then
            echo "✅ DNS resolution successful"
        else
            echo "❌ DNS resolution failed"
            echo "   Check if Supabase project is active"
        fi
        
        # Test if port 5432 is reachable (if nc is available)
        if command -v nc > /dev/null 2>&1; then
            if nc -z "$HOSTNAME" 5432 2>/dev/null; then
                echo "✅ Port 5432 is reachable"
            else
                echo "❌ Port 5432 is not reachable"
                echo "   Check if Supabase project is paused"
            fi
        else
            echo "⚠️  Cannot test port connectivity (nc not available)"
        fi
    else
        echo "❌ Cannot extract hostname from DATABASE_URL"
    fi
else
    echo "⚠️  Cannot test connectivity - DATABASE_URL not set"
fi

echo ""
echo "🗄️  Database Connection Test:"
echo "-----------------------------"

if [ ! -z "$DATABASE_URL" ] && [ -f "src/generated/prisma/index.js" ]; then
    echo "Testing Prisma connection..."
    
    # Create a temporary test script
    cat > /tmp/test-db-connection.js << 'EOF'
const { PrismaClient } = require('./src/generated/prisma');

async function testConnection() {
    const prisma = new PrismaClient();
    
    try {
        console.log('Attempting to connect...');
        await prisma.$connect();
        console.log('✅ Database connection successful');
        
        console.log('Testing query...');
        const count = await prisma.completedIntent.count();
        console.log(`✅ Query successful - Found ${count} completed intents`);
        
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'P1001') {
            console.error('');
            console.error('P1001 Error Solutions:');
            console.error('1. Check if Supabase project is paused');
            console.error('2. Verify DATABASE_URL format');
            console.error('3. Check environment variables');
        }
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
EOF
    
    # Run the test
    node /tmp/test-db-connection.js
    
    # Clean up
    rm -f /tmp/test-db-connection.js
else
    echo "⚠️  Cannot test database connection"
    if [ -z "$DATABASE_URL" ]; then
        echo "   Reason: DATABASE_URL not set"
    fi
    if [ ! -f "src/generated/prisma/index.js" ]; then
        echo "   Reason: Prisma client not generated"
    fi
fi

echo ""
echo "📝 Recommendations:"
echo "------------------"

if [ -z "$DATABASE_URL" ]; then
    echo "1. Set DATABASE_URL environment variable"
fi

if [ ! -d "src/generated/prisma" ]; then
    echo "2. Generate Prisma client: npx prisma generate"
fi

echo "3. Check Supabase dashboard for project status"
echo "4. Verify all environment variables in deployment platform"
echo "5. Run deployment script: ./scripts/deploy-production.sh"

echo ""
echo "🔗 Useful Links:"
echo "---------------"
echo "- Supabase Dashboard: https://supabase.com/dashboard"
echo "- Troubleshooting Guide: ./TROUBLESHOOTING.md"
echo "- Production Setup: ./PRODUCTION_SETUP.md"

echo ""
echo "Diagnostics complete!" 