const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const userColors = [
  '#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000',
];

const documentRooms = new Map();
const MAX_DOCUMENTS = 100;
const MAX_CONTENT_LENGTH = 100000;

setInterval(() => {
  if (documentRooms.size > MAX_DOCUMENTS) {
    const entries = Array.from(documentRooms.entries());
    entries.slice(0, documentRooms.size - MAX_DOCUMENTS).forEach(([key]) => {
      documentRooms.delete(key);
    });
  }
}, 60000);

function getColorForUser(userId) {
  const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return userColors[index % userColors.length];
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    let currentDocId = null;
    let currentUserId = null;

    socket.on('join-document', (data) => {
      const { docId, userId, userName } = data;
      currentDocId = docId;
      currentUserId = userId;

      socket.join(docId);

      if (!documentRooms.has(docId)) {
        documentRooms.set(docId, { content: '', users: new Map() });
      }

      const room = documentRooms.get(docId);
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

    socket.on('cursor-move', (data) => {
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

  socket.on('document-change', (data) => {
    if (!currentDocId) return;

    const room = documentRooms.get(currentDocId);
    if (room) {
      const content = data.content && data.content.length > MAX_CONTENT_LENGTH 
        ? data.content.slice(0, MAX_CONTENT_LENGTH) 
        : data.content;
      room.content = content;
      socket.to(currentDocId).emit('document-update', content);
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

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
