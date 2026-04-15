import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return new Response('Socket.IO endpoint - use custom server for development', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

export const dynamic = 'force-dynamic';
