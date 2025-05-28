import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('DATABASE_URL format:', process.env.DATABASE_URL?.substring(0, 50) + '...');
    
    // Test database connection
    console.log('Attempting to connect...');
    await prisma.$connect();
    console.log('Connection successful!');
    
    // Test a simple query
    console.log('Testing query...');
    const count = await prisma.completedIntent.count();
    console.log('Query successful, count:', count);
    
    await prisma.$disconnect();
    console.log('Disconnected successfully');

    return NextResponse.json(
      { 
        status: 'SUCCESS', 
        message: 'Database connection successful',
        completedIntentsCount: count,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Database connection failed:', error);
    
    const errorInfo = {
      status: 'ERROR',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      error: {
        code: (error as any)?.code,
        message: error instanceof Error ? error.message : 'Unknown error',
        name: (error as any)?.name,
        clientVersion: (error as any)?.clientVersion
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL_SET: !!process.env.DATABASE_URL,
        DATABASE_URL_PREFIX: process.env.DATABASE_URL?.substring(0, 30) + '...'
      }
    };
    
    return NextResponse.json(errorInfo, { status: 500 });
  }
} 