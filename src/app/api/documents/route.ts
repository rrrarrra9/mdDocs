import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { userId: user.id },
        {
          folder: {
            permissions: {
              some: {
                userId: user.id,
                canRead: true,
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      content: true,
      folderId: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(documents);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { title, content, folderId } = await request.json();

  if (folderId) {
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        OR: [
          { userId: user.id },
          { permissions: { some: { userId: user.id, canWrite: true } } },
        ],
      },
    });
    if (!folder) {
      return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 });
    }
  }

  const document = await prisma.document.create({
    data: {
      title,
      content: content || '',
      folderId: folderId || null,
      userId: user.id,
    },
  });

  return NextResponse.json(document);
}
