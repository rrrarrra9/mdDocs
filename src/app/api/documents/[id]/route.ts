import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: {
      id,
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
  });

  if (!document) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  return NextResponse.json(document);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const data = await request.json();

  const document = await prisma.document.findFirst({
    where: {
      id,
      OR: [
        { userId: user.id },
        {
          folder: {
            permissions: {
              some: {
                userId: user.id,
                canWrite: true,
              },
            },
          },
        },
      ],
    },
  });

  if (!document) {
    return NextResponse.json({ error: 'No encontrado o sin permisos' }, { status: 404 });
  }

  const updated = await prisma.document.update({
    where: { id },
    data: {
      title: data.title,
      content: data.content,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: {
      id,
      OR: [
        { userId: user.id },
        {
          folder: {
            permissions: {
              some: {
                userId: user.id,
                canDelete: true,
              },
            },
          },
        },
      ],
    },
  });

  if (!document) {
    return NextResponse.json({ error: 'No encontrado o sin permisos' }, { status: 404 });
  }

  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
