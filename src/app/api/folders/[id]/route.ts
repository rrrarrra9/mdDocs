import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
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
        { permissions: { some: { userId: session.user.id, canDelete: true } } },
      ],
    },
  });

  if (!folder) {
    return NextResponse.json({ error: 'No encontrado o sin permisos' }, { status: 404 });
  }

  await prisma.document.updateMany({
    where: { folderId: id },
    data: { folderId: null },
  });

  await prisma.folder.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
