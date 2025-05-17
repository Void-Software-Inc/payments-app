// Script to test inserting a record into PostgreSQL
const { PrismaClient } = require('@prisma/client');
// Create a new instance with specific connection options
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?pgbouncer=true'  // Add pgbouncer flag
    }
  }
});
const crypto = require('crypto');

async function testInsertRecord() {
  console.log('Testing database insert...');
  
  try {
    // Generate a random hex string for the payment ID
    const randomHex = crypto.randomBytes(32).toString('hex');
    console.log('Generated payment ID:', randomHex);
    
    // Create a test payment record
    console.log('Attempting to create test payment...');
    const newPayment = await prisma.completedPayment.create({
      data: {
        paymentId: randomHex,
        paidAmount: '0.02', // This is now properly formatted
        tipAmount: '0.001',
        issuedBy: '0xTestIssuer' + Date.now().toString().slice(-6),
        paidBy: '0xTestPayer' + Date.now().toString().slice(-6),
        coinType: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',
        description: 'Test payment with description - ' + new Date().toISOString(),
        transactionHash: 'test_tx_' + Date.now()
      }
    });
    
    console.log('Successfully inserted test payment:', newPayment);
    
    // Now retrieve all records to verify
    console.log('Fetching all payments...');
    const allPayments = await prisma.completedPayment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5 // Limit to 5 most recent
    });
    
    console.log(`Found ${allPayments.length} payments in database`);
    console.log('Recent payments:', allPayments);
    
  } catch (error) {
    console.error('Error testing database insert:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testInsertRecord()
  .then(() => console.log('Insert test completed'))
  .catch(error => console.error('Insert test failed:', error)); 