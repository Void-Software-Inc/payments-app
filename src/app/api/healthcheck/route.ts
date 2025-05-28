import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple healthcheck without database connection for now
    return NextResponse.json(
      { 
        status: 'OK', 
        message: 'Service is healthy (database check disabled)',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        // Show environment variable status without exposing values
        envCheck: {
          DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'ERROR', 
        message: 'Service is unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}