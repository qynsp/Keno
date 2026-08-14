import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '../types';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to Casino Keno Socket server');
    });

    socket.on('disconnect', (reason) => {
      console.warn('❌ Disconnected from Socket server:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('⚠️ Socket.IO connection error:', error.message);
    });
  }

  return socket;
}
