import { io } from 'socket.io-client';

// Production-safe Socket.IO connection.
// Default: same-origin (works when frontend is served by the same backend).
// Optional: allow overriding via env for advanced deployments.
const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  undefined;

const socket = io(socketUrl, {
  transports: ['websocket', 'polling'],
  autoConnect: true
});

export default socket;

