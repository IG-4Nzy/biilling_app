import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let io: Server;

export function setupSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.isDev ? '*' : env.FRONTEND_URL,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // JWT authentication middleware for WebSocket
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string; role: string };
      (socket as any).userId = decoded.userId;
      (socket as any).userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    logger.info(`Socket connected: ${userId} (${socket.id})`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join organization room (all users share same data)
    socket.join('org:main');

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${userId} (${reason})`);
    });

    socket.on('error', (err) => {
      logger.error(`Socket error for ${userId}:`, err.message);
    });
  });

  logger.info('✅ WebSocket server initialized');
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call setupSocket first.');
  }
  return io;
}

// Emit event to all connected clients
export function emitToAll(event: string, data: unknown): void {
  if (io) {
    io.to('org:main').emit(event, data);
  }
}

// Emit event to a specific user
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}
