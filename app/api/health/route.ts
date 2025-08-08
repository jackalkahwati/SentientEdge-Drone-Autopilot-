import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown'
  });
}


