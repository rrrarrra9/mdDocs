import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; permId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id, permId } = await params;

  const folder = await prisma.folder.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!folder) {
    return NextResponse.json({ error: 'No eres propietario' }, { status: 403 });
  }

  await prisma.permission.delete({
    where: { id: permId },
  });

  return NextResponse.json({ success: true });
}
