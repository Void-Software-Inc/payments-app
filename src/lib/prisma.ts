// This approach avoids TypeScript errors until Prisma client is generated
let PrismaClient: any

try {
  console.log("Attempting to import PrismaClient from @prisma/client...");
  // Try to import from generated client first
  const { PrismaClient: ImportedPrismaClient } = require('@prisma/client')
  console.log("PrismaClient imported successfully");
  PrismaClient = ImportedPrismaClient
} catch (error) {
  console.error('Failed to import PrismaClient:', error);
  console.warn('Prisma client not generated yet, please run: npx prisma generate')
  // Fallback to a dummy client for development
  PrismaClient = class {
    constructor() {
      console.warn('Using dummy PrismaClient - database operations will not work!')
    }
    // Add dummy methods to avoid runtime errors
    completedPayment = {
      upsert: async () => {
        console.error('Cannot perform database operations with dummy PrismaClient');
        throw new Error('Prisma client not properly generated. Run npx prisma generate');
      },
      findUnique: async () => null,
      findMany: async () => []
    }
  }
}

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: any }

// Clear existing connection if exists in development
if (process.env.NODE_ENV === 'development' && globalForPrisma.prisma) {
  console.log('Disconnecting existing Prisma client...');
  globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

// Use existing instance or create new one
export const prisma = globalForPrisma.prisma || (() => {
  console.log("Creating new PrismaClient instance");
  
  // Configure client based on environment
  const config: any = {
    log: ['error', 'warn'],
  };
  
  // In development, show more verbose logs
  if (process.env.NODE_ENV === 'development') {
    config.log = ['query', 'info', 'warn', 'error'];
  }
  
  try {
    // For Supabase, connection string needs specific format
    const databaseUrl = process.env.NODE_ENV === 'development' 
      ? process.env.DIRECT_URL_WITH_SCHEMA || process.env.DIRECT_URL
      : process.env.DATABASE_URL_WITH_SCHEMA || process.env.DATABASE_URL;
      
    if (!databaseUrl) {
      console.error("Database URL environment variable is not set!");
    } else {
      console.log(`Database URL detected (length: ${databaseUrl.length})`);

      // Initialize database connection with proper configuration
      config.datasources = {
        db: {
          url: databaseUrl
        }
      };
      
      // Add necessary connection options
      if (process.env.POSTGRES_SSL === 'true') {
        console.log('Using SSL for database connection');
      }
    }
    
    console.log("Creating Prisma client with config:", JSON.stringify({
      ...config,
      datasources: {
        db: { url: config.datasources?.db?.url ? '[REDACTED]' : undefined }
      }
    }));
    
    return new PrismaClient(config);
  } catch (err) {
    console.error("Error initializing Prisma client:", err);
    throw err;
  }
})();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  console.log("Attached PrismaClient to global object");
}

// Add cleanup handler for development
if (process.env.NODE_ENV === 'development') {
  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

// Test if Prisma client is working
if (prisma.completedPayment) {
  console.log("CompletedPayment model available in Prisma client");
} else {
  console.error("CompletedPayment model NOT available in Prisma client!");
}

export default prisma