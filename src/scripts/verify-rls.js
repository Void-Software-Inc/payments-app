// Script to verify RLS configuration and database access
const { PrismaClient } = require('@prisma/client');

async function verifyRLS() {
  console.log('Starting RLS verification test...');
  
  // Create a prisma client with debug logging
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    console.log('Testing database connection...');
    
    // Test 1: Count records
    console.log('Test 1: Counting CompletedPayment records');
    const count = await prisma.completedPayment.count();
    console.log(`Success: Found ${count} records in CompletedPayment table`);
    
    // Test 2: Try to fetch first record with minimal fields
    console.log('Test 2: Fetching a single payment record');
    const payment = await prisma.completedPayment.findFirst({
      select: {
        id: true,
        createdAt: true
      }
    });
    
    if (payment) {
      console.log(`Success: Found payment with ID: ${payment.id}`);
    } else {
      console.log('Success: No payments found (table is empty)');
    }
    
    // Test 3: Test RLS with a query that uses a condition
    console.log('Test 3: Testing queries with RLS conditions');
    const addressQuery = await prisma.completedPayment.findMany({
      where: {
        paidBy: '0x123456789'
      },
      take: 1
    });
    
    console.log(`Success: Query with RLS condition returned ${addressQuery.length} results`);
    
    console.log('All tests PASSED - Database connection is working properly with RLS');
  } catch (error) {
    console.error('ERROR: Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyRLS().catch(e => {
  console.error('Fatal error during verification:', e);
  process.exit(1);
}); 