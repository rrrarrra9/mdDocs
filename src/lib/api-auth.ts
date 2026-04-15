import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const apiKey = request.headers.get('X-API-Key');
  
  if (apiKey) {
    const user = await prisma.user.findFirst({
      where: { apiKey },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
    
    if (user) {
      return user;
    }
  }

  const session = await getServerSession(authOptions);
  
  if (session?.user?.id) {
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      role: session.user.role,
    };
  }

  return null;
}
