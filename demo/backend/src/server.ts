import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },

    pingTimeout: 5000, 
    pingInterval: 3000,
});

const PORT = process.env.PORT || 2137;

// Track connected clients
const clients = new Map<string, string>(); // socketId -> clientId

app.get('/', (req, res) => {
    res.send('Socket.IO Server is running!');
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Get client ID from handshake auth
    const clientId = socket.handshake.auth?.clientId;
    console.log(socket.handshake.auth);
    if (!clientId) throw new Error(`No client id`)
    if (clientId) {
        clients.set(socket.id, clientId);
        console.log(`Client ${clientId} connected with socket ${socket.id}`);
    }

    // Handle message events - broadcast to all peers
    socket.on('message', (data) => {
        console.log('Message received:', data);
        socket.broadcast.emit('message', data);
    });

    // Handle disconnect - notify all clients
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);

        const clientId = clients.get(socket.id);
        if (clientId) {
            // Broadcast disconnection to all remaining clients
            socket.broadcast.emit('message', {
                role: 'client-disconnect',
                clientId
            });
            console.log(`Notified all clients about ${clientId} disconnection`);
            clients.delete(socket.id);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});