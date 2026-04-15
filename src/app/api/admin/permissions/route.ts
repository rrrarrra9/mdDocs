import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { folderId, userId, canRead, canWrite, canDelete } = await request.json();

  const permission = await prisma.permission.upsert({
    where: {
      userId_folderId: { userId, folderId },
    },
    create: { userId, folderId, canRead, canWrite, canDelete },
    update: { canRead, canWrite, canDelete },
    include: {
      user: { select: { id: true, name: true, email: true } },
      folder: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(permission);
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { permissionId } = await request.json();

  await prisma.permission.delete({ where: { id: permissionId } });

  return NextResponse.json({ success: true });
}
