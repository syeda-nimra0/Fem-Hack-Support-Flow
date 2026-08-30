import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';

let io = null;

export function initSocket(httpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, cb) => {
        // Allow same-origin (no origin) and the configured client URL
        if (!origin || origin === config.clientUrl || origin.startsWith('http://localhost')) {
          cb(null, true);
        } else {
          cb(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return next(new Error('User not found or deactivated'));
      }
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    const userIdStr = user._id.toString();

    // Join personal room
    socket.join(`user:${userIdStr}`);

    // Join role room (for broadcasting new tickets to all agents/admins)
    socket.join(`role:${user.role}`);

    socket.emit('connected', {
      userId: userIdStr,
      role: user.role,
      message: 'Connected to SupportFlow real-time',
    });

    // Join a specific ticket's room (for live conversation updates)
    socket.on('ticket:join', (ticketId) => {
      if (typeof ticketId === 'string') {
        socket.join(`ticket:${ticketId}`);
      }
    });

    socket.on('ticket:leave', (ticketId) => {
      if (typeof ticketId === 'string') {
        socket.leave(`ticket:${ticketId}`);
      }
    });

    // Typing indicator (alternative to REST endpoint)
    socket.on('ticket:typing', ({ ticketId, isTyping }) => {
      if (typeof ticketId === 'string') {
        socket.to(`ticket:${ticketId}`).emit('ticket:typing', {
          ticketId,
          userId: userIdStr,
          userName: user.name,
          userRole: user.role,
          isTyping: !!isTyping,
        });
      }
    });

    socket.on('disconnect', () => {
      // Rooms are automatically left on disconnect
    });
  });

  return io;
}

export function getIO() {
  return io;
}

export function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

export function emitToRole(role, event, payload) {
  if (io) io.to(`role:${role}`).emit(event, payload);
}

export function emitToTicket(ticketId, event, payload) {
  if (io) io.to(`ticket:${ticketId}`).emit(event, payload);
}
