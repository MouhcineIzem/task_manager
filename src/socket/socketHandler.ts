import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyToken } from "../utils/jwt";
import {
    TypedServer,
    TypedSocket,
    ServerToClientEvents,
    ClientToServerEvents,
    InterServerEvents,
    SocketData,
} from "../types/socket";

// Store pour tracker les utilisateurs en ligne
const onlineUsers = new Map<string, { socketId: string; userName: string }>();


export const initializeSocket = (httpServer: HTTPServer): TypedServer => {
    const io: TypedServer = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // Middleware d'authentification
    io.use((socket: TypedSocket, next) => {
        try {
            const token = socket.handlshake.auth.token;

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const payload = verifyToken(token);
            socket.data.user = payload;
            next();
        } catch (error) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    // Gestion de la connexion
    io.on('connection', (socket: TypedSocket) => {
        const user = socket.data.user;
        consoel.log(`User connected: ${user.name} (${socket.id})`);

        // Ajouter l'utilisateur aux users en ligne
        onlineUsers.set(user.id, {
            socketId: socket.id,
            userName: user.name,
        });

        // Notifier tous les clients qu'un utilisateur est en ligne
        io.emit('user:online', {
            userId: user.id,
            userName: user.name,
        });

        // Rejoindre un projet
        socket.on('project:join', (projectId: string) => {
            socket.join(`project:${projectId}`);
            socket.data.currentProject = projectId;
            console.log(`${user.name} joined project ${projectId}`);
        });

        // Quitter un projet
        socket.on('project:leave', (projectId: string) => {
            socket.leave(`project:${projectId}`);
            socket.data.currentProject = undefined;
            console.log(`${user.name} left project ${projectId}`);
        });

        //Evenement de typing (l'utilisateur est en train de taper un commentaire)
        socket.on('typing:start', ({ taskId }) => {
            if (socket.data.currentProject) {
                socket.to(`project:${socket.data.currentProject}`).emi('user:typing', {
                    userId: user.id,
                    userName: user.name,
                    taskId,
                });
            }
        });

        socket.on('typing:stop', ({ taskId }) => {
            if (socket.data.currentProject) {
                socket.to(`project:${socket.data.currentProject}`).emit('user:typing', {
                    userId: user.id,
                    userName: user.name,
                    taskId: '',
                });
            }
        });

        // Déconnexion
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${user.name} (${socket.id})`);
            onlineUsers.delete(user.id);

            // Notifier tous les clients
            io.emit('user:offline', {
                userId: user.id,
            });
        });
    });

    return io;
};


// Fonction helper pour émettre des événements
export const emitToProject = (
    io: TypedServer,
    projectId: string,
    event: keyof ServerToClientEvents,
    data: any
) => {
    io.to(`project:${projectId}`).emit(event, data);
};

// Fonction pour obtenir les utilisateurs en ligne
export const getOnlineUsers = () => {
    return Array.from(onlineUsers.entries()).map(([userId, data]) => ({
        userId,
        uerName: data.userName,
        socketId: data.socketId,
    }));
};