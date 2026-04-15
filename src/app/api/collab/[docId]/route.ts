import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface CollabState {
  content: string;
  users: Map<string, { userId: string; userName: string; color: string; lastSeen: number }>;
  version: number;
}

const documents = new Map<string, CollabState>();

const userColors = [
  '#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
];

function getColorForUser(userId: string): string {
  const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return userColors[index % userColors.length];
}

function cleanInactiveUsers(docId: string) {
  const doc = documents.get(docId);
  if (!doc) return;
  const now = Date.now();
  for (const [userId, user] of doc.users) {
    if (now - user.lastSeen > 30000) {
      doc.users.delete(userId);
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { docId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  cleanInactiveUsers(docId);

  if (!documents.has(docId)) {
    documents.set(docId, {
      content: '',
      users: new Map(),
      version: 0,
    });
  }

  const doc = documents.get(docId)!;
  const userId = session.user.id;
  const userName = session.user.name || session.user.email || 'User';
  const color = getColorForUser(userId);

  doc.users.set(userId, { userId, userName, color, lastSeen: Date.now() });

  const url = new URL(request.url);
  const since = parseInt(url.searchParams.get('since') || '0');

  return NextResponse.json({
    content: doc.content,
    version: doc.version,
    users: Array.from(doc.users.values()).filter(u => u.userId !== userId),
    hasChanges: doc.version > since,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { docId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { content, version, cursor } = body;

  if (!documents.has(docId)) {
    documents.set(docId, {
      content: '',
      users: new Map(),
      version: 0,
    });
  }

  const doc = documents.get(docId)!;
  const userId = session.user.id;
  const userName = session.user.name || session.user.email || 'User';

  if (content !== undefined && typeof content === 'string') {
    if (version === undefined || version === doc.version) {
      doc.content = content;
      doc.version++;
    }
  }

  if (cursor) {
    const color = getColorForUser(userId);
    doc.users.set(userId, { userId, userName, color, lastSeen: Date.now() });
  }

  return NextResponse.json({
    version: doc.version,
    content: doc.content,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { docId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const doc = documents.get(docId);
  if (doc) {
    doc.users.delete(session.user.id);
  }

  return NextResponse.json({ success: true });
}
