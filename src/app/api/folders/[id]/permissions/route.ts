import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  const folder = await prisma.folder.findFirst({
    where: {
      id,
      OR: [
        { userId: session.user.id },
        { permissions: { some: { userId: session.user.id, canRead: true } } },
      ],
    },
  });

  if (!folder) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  const permissions = await prisma.permission.findMany({
    where: { folderId: id },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json(permissions);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const { email, canRead, canWrite, canDelete } = await request.json();

  const folder = await prisma.folder.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!folder) {
    return NextResponse.json({ error: 'No eres propietario' }, { status: 403 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const permission = await prisma.permission.upsert({
    where: {
      userId_folderId: {
        userId: targetUser.id,
        folderId: id,
      },
    },
    create: {
      userId: targetUser.id,
      folderId: id,
      canRead,
      canWrite,
      canDelete,
    },
    update: {
      canRead,
      canWrite,
      canDelete,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json(permission);
}
