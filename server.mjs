import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

console.log('WebSocket server is running on ws://localhost:8080');

/**
 * @typedef {{x: number, y: number, color: string }} PaintMessage
 */

/**
 * @type {WebSocket[]}
 */
let clients = [];

/**
 * @type {number}
 */
let pixels = 0

/**
 * When a message is received, broadcast to all clients
 * @param {PaintMessage} message 
 */
const newMessage = (message) => {
    pixels++;
    clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message, { binary: false });
        }
    });
};

/**
 * Clean up when clients disconnect
 */
const closeConnection = () => {
    clients = clients.filter(client => client !== ws);
};


wss.on('connection', (ws) => {
    clients.push(ws);

    ws.on('message', newMessage);

    ws.on('close', closeConnection);
});
