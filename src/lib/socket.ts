import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';

interface SocketServer extends HTTPServer {
  io?: Server;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

const userColors = [
  '#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
];

interface UserCursor {
  userId: string;
  userName: string;
  color: string;
  line: number;
  ch: number;
}

interface DocumentRoom {
  content: string;
  users: Map<string, UserCursor>;
}

const documentRooms = new Map<string, DocumentRoom>();

function getColorForUser(userId: string): string {
  const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return userColors[index % userColors.length];
}

export function initSocketIO(server: HTTPServer) {
  if ((server as SocketServer).io) {
    return (server as SocketServer).io;
  }

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    let currentDocId: string | null = null;
    let currentUserId: string | null = null;

    socket.on('join-document', (data: { docId: string; userId: string; userName: string }) => {
      const { docId, userId, userName } = data;
      currentDocId = docId;
      currentUserId = userId;

      socket.join(docId);

      if (!documentRooms.has(docId)) {
        documentRooms.set(docId, { content: '', users: new Map() });
      }

      const room = documentRooms.get(docId)!;
      const color = getColorForUser(userId);

      room.users.set(userId, {
        userId,
        userName,
        color,
        line: 0,
        ch: 0,
      });

      socket.emit('document-sync', {
        content: room.content,
        users: Array.from(room.users.values()).filter(u => u.userId !== userId),
      });

      socket.to(docId).emit('user-joined', {
        userId,
        userName,
        color,
      });
    });

    socket.on('cursor-move', (data: { line: number; ch: number }) => {
      if (!currentDocId || !currentUserId) return;

      const room = documentRooms.get(currentDocId);
      if (!room) return;

      const user = room.users.get(currentUserId);
      if (user) {
        user.line = data.line;
        user.ch = data.ch;
        socket.to(currentDocId).emit('cursor-update', {
          userId: currentUserId,
          userName: user.userName,
          color: user.color,
          line: data.line,
          ch: data.ch,
        });
      }
    });

    socket.on('document-change', (data: { content: string }) => {
      if (!currentDocId) return;

      const room = documentRooms.get(currentDocId);
      if (room) {
        room.content = data.content;
        socket.to(currentDocId).emit('document-update', data.content);
      }
    });

    socket.on('disconnect', () => {
      if (currentDocId && currentUserId) {
        const room = documentRooms.get(currentDocId);
        if (room) {
          room.users.delete(currentUserId);
          socket.to(currentDocId).emit('user-left', currentUserId);
        }
      }
    });
  });

  (server as SocketServer).io = io;
  return io;
}

export function getIO() {
  return null;
}
