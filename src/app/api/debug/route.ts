import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      
      // Check environment variables (without exposing sensitive data)
      envVars: {
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
      },
      
      // Check if Prisma client exists
      prismaClient: {
        generatedPath: join(process.cwd(), 'src/generated/prisma'),
        exists: existsSync(join(process.cwd(), 'src/generated/prisma')),
        indexExists: existsSync(join(process.cwd(), 'src/generated/prisma/index.js')),
        packageExists: existsSync(join(process.cwd(), 'src/generated/prisma/package.json')),
        canInstantiate: false,
      },
      
      // Check working directory
      workingDirectory: process.cwd(),
      
      // Check if we can import Prisma
      prismaImport: 'TESTING...'
    };

    // Try to import Prisma client
    try {
      const { PrismaClient } = await import('@/generated/prisma');
      debugInfo.prismaImport = 'SUCCESS';
      
      // Try to create client instance
      const prisma = new PrismaClient();
      debugInfo.prismaClient.canInstantiate = true;
      
      // Don't actually connect in debug mode, just check if we can create the client
      await prisma.$disconnect();
      
    } catch (error) {
      debugInfo.prismaImport = `FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`;
      debugInfo.prismaClient.canInstantiate = false;
    }

    return NextResponse.json(debugInfo, { status: 200 });
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Debug endpoint failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 