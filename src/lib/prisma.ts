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
  
  // Configure database connection for Supabase
  // Critical for production: Add connection pooling for Supabase
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL environment variable is not set!");
  } else {
    console.log(`Database URL detected (${url.substring(0, 20)}...)`);
  }
  
  // Add pgBouncer flag required for Supabase connection pooling
  config.datasources = {
    db: {
      url: url ? `${url}?pgbouncer=true&connection_limit=1` : undefined
    }
  };
  
  const instance = new PrismaClient(config);
  console.log("PrismaClient instance created for database");
  return instance;
})();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  console.log("Attached PrismaClient to global object");
}

// Test if Prisma client is working
if (prisma.completedPayment) {
  console.log("CompletedPayment model available in Prisma client");
} else {
  console.error("CompletedPayment model NOT available in Prisma client!");
}

export default prisma 