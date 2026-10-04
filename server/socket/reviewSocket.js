let io;

const initSocket = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: '*', // Allow all origins for local development
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a user room to receive targeted progress or notifications
    socket.on('join_user_room', (userId) => {
      if (userId) {
        socket.join(userId.toString());
        console.log(`Socket ${socket.id} joined room ${userId}`);
      }
    });

    // Join a review-specific chat room for streaming follow-up responses
    socket.on('join_review_chat', (reviewId) => {
      if (reviewId) {
        socket.join(`review_${reviewId}`);
        console.log(`Socket ${socket.id} joined review chat room review_${reviewId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet');
  }
  return io;
};

/**
 * Emit progress step to user during review scan
 */
const emitScanProgress = (userId, status, percentage) => {
  try {
    const activeIo = getIO();
    activeIo.to(userId.toString()).emit('scan_progress', { status, percentage });
  } catch (error) {
    // Fail silently if socket server not connected yet
  }
};

/**
 * Emit real-time notifications to user
 */
const emitNotification = (userId, notification) => {
  try {
    const activeIo = getIO();
    activeIo.to(userId.toString()).emit('notification_received', notification);
  } catch (error) {
    // Fail silently
  }
};

module.exports = {
  initSocket,
  getIO,
  emitScanProgress,
  emitNotification
};
