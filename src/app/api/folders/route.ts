import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const folders = await prisma.folder.findMany({
    where: {
      OR: [
        { userId: user.id },
        { permissions: { some: { userId: user.id, canRead: true } } },
      ],
    },
    select: {
      id: true,
      name: true,
      parentId: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
      permissions: {
        where: { userId: user.id },
        select: {
          canRead: true,
          canWrite: true,
          canDelete: true,
        },
      },
    },
  });

  const foldersWithPerms = folders.map((f) => ({
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    userId: f.userId,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    isOwner: f.userId === user.id,
    canRead: f.permissions[0]?.canRead ?? (f.userId === user.id),
    canWrite: f.permissions[0]?.canWrite ?? (f.userId === user.id),
    canDelete: f.permissions[0]?.canDelete ?? (f.userId === user.id),
  }));

  return NextResponse.json(foldersWithPerms);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { name, parentId } = await request.json();

  if (parentId) {
    const parentFolder = await prisma.folder.findFirst({
      where: {
        id: parentId,
        OR: [
          { userId: user.id },
          { permissions: { some: { userId: user.id, canWrite: true } } },
        ],
      },
    });
    if (!parentFolder) {
      return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 });
    }
  }

  const folder = await prisma.folder.create({
    data: {
      name,
      parentId: parentId || null,
      userId: user.id,
    },
  });

  return NextResponse.json(folder);
}
