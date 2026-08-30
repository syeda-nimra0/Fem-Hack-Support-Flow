import { verifyToken } from './auth.js';
import { Ticket } from './models.js';

/**
 * Socket.IO layer — real-time ticket updates.
 *
 * Rooms:
 *   user:{userId}    — personal notifications (ticket list refresh)
 *   role:{role}      — agent/admin dashboards (new tickets)
 *   ticket:{id}      — live conversation + status changes + typing
 */

export function emitToTicket(io, ticketId, event, payload) {
  if (io) io.to(`ticket:${ticketId}`).emit(event, payload);
}

export function emitToRoles(io, roles, event, payload) {
  if (!io) return;
  roles.forEach((role) => io.to(`role:${role}`).emit(event, payload));
}

export function emitToUser(io, userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

async function canAccessTicket(ticketId, user) {
  if (!/^[a-f\d]{24}$/i.test(String(ticketId))) return false;
  const ticket = await Ticket.findById(ticketId).select('customer assignedAgent');
  if (!ticket) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'agent') return true; // agents may join queue tickets (view-only is enforced by REST)
  return ticket.customer?.toString() === user.id || ticket.assignedAgent?.toString() === user.id;
}

export function initSocket(io) {
  // JWT authentication on the handshake
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyToken(token);
      socket.data.user = { id: payload.id, role: payload.role, name: payload.name };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role, name } = socket.data.user;
    socket.join(`user:${id}`);
    socket.join(`role:${role}`);
    socket.emit('connected', { userId: id, role });

    socket.on('ticket:join', async (ticketId, ack) => {
      try {
        if (await canAccessTicket(ticketId, socket.data.user)) {
          socket.join(`ticket:${ticketId}`);
          if (typeof ack === 'function') ack({ ok: true });
        } else if (typeof ack === 'function') {
          ack({ ok: false, error: 'Access denied' });
        }
      } catch {
        if (typeof ack === 'function') ack({ ok: false, error: 'Access denied' });
      }
    });

    socket.on('ticket:leave', (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
      socket.to(`ticket:${ticketId}`).emit('typing', {
        ticketId,
        user: { id, name },
        isTyping: false,
      });
    });

    // Real-time typing indicator (bonus)
    socket.on('typing:start', (ticketId) => {
      socket.to(`ticket:${ticketId}`).emit('typing', { ticketId, user: { id, name }, isTyping: true });
    });

    socket.on('typing:stop', (ticketId) => {
      socket.to(`ticket:${ticketId}`).emit('typing', { ticketId, user: { id, name }, isTyping: false });
    });

    socket.on('disconnect', () => {
      // rooms are cleaned up automatically
    });
  });
}
