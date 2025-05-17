// Simple database test script
const { PrismaClient } = require('@prisma/client');
// Create a new instance with specific connection options
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?pgbouncer=true'  // Add pgbouncer flag
    }
  }
});

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  try {
    // Test prisma client
    console.log('Prisma client initialized:', !!prisma);
    
    // Test raw query
    console.log('Testing raw query...');
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Database tables:', tables);
    
    // Test CompletedPayment model
    console.log('Testing CompletedPayment model...');
    const count = await prisma.completedPayment.count();
    console.log(`Found ${count} completed payments in database`);
    
    if (count > 0) {
      console.log('Fetching latest payment...');
      const latestPayment = await prisma.completedPayment.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      console.log('Latest payment:', latestPayment);
    }
    
    console.log('Database connection test successful!');
  } catch (error) {
    console.error('Database connection test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDatabaseConnection()
  .then(() => console.log('Test completed'))
  .catch(error => console.error('Test failed:', error)); 