import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // The production version is overriding this, so keep it simple
    return NextResponse.json({ status: 'OK', message: 'Service is healthy' });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'ERROR', message: 'Service is unhealthy' },
      { status: 500 }
    );
  }
}