import { Server } from 'socket.io';
import { socketAuthMiddleware } from './auth.middleware.js';

let io; // instancia singleton

/**
 * Inicializa Socket.IO sobre el servidor HTTP dado.
 * @param {import('http').Server} httpServer
 * @returns {Server} instancia de Socket.IO
 */
export const initSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // en producción limitar al dominio del frontend
      methods: ['GET', 'POST'],
    },
  });

  // Autenticación JWT en el handshake
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const { companyId } = socket.user;

    // Unir al socket a la room de su compañía
    socket.join(`company:${companyId}`);
    console.log(`🔌  Socket conectado: ${socket.id} → company:${companyId}`);

    socket.on('disconnect', (reason) => {
      console.log(`🔌  Socket desconectado: ${socket.id} (${reason})`);
    });
  });

  return io;
};

/**
 * Devuelve la instancia de Socket.IO previamente inicializada,
 * o null si todavía no se ha llamado a initSocketIO (p.ej. en tests).
 */
export const getIO = () => io ?? null;
