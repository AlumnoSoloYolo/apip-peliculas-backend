const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./config/config');
const activityService = require('./services/activity.service');

// Mapa para rastrear conexiones de usuarios (userId -> socketId)
const userConnections = new Map();
let io;

function initializeSocketServer(server) {
    io = socketIo(server, {
        cors: {
            origin: "*", // Ajusta esto a tu dominio en producción
            methods: ["GET", "POST"]
        }
    });

    // Middleware para autenticar la conexión con JWT
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('No se proporcionó token de autenticación'));
        }

        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            socket.userId = decoded.id;
            return next();
        } catch (error) {
            return next(new Error('Token inválido'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;
        console.log(`Usuario conectado: ${userId}`);

        socket.join(userId);
        userConnections.set(userId, socket.id);

        socket.on('disconnect', () => {
            console.log(`Usuario desconectado: ${userId}`);
            userConnections.delete(userId);
        });

        // Aquí puedes agregar más eventos personalizados
    });

    // Servicio de actividad
    activityService.initializeActivityService(io);

    return io;  // Retornar la instancia io para ser compatible con tu código actual
}

// Función para enviar solicitudes de seguimiento
function sendFollowRequest(recipientId, requestData) {
    try {
        if (!io) {
            console.error('Socket.IO: No inicializado.');
            return false;
        }

        const socketId = userConnections.get(recipientId);
        if (socketId) {
            io.to(recipientId).emit('follow_request', requestData);
            console.log(`Socket.IO: Solicitud de seguimiento enviada a ${recipientId}`);
            return true;
        } else {
            console.log(`Socket.IO: Usuario ${recipientId} no está conectado.`);
            return false;
        }
    } catch (error) {
        console.error('Socket.IO: Error al enviar solicitud de seguimiento:', error);
        return false;
    }
}

// Exportar la función principal como valor por defecto
module.exports = initializeSocketServer;

// Añadir sendFollowRequest como propiedad
module.exports.sendFollowRequest = sendFollowRequest;