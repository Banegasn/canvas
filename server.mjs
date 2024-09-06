import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

console.log('WebSocket server is running on ws://localhost:8080');

/**
 * @type {WebSocket[]}
 */
let clients = [];
let quantityOfLacasitos = 0

wss.on('connection', (ws) => {
    clients.push(ws);

    // When a message is received, broadcast to all clients
    ws.on('message', (message) => {
        quantityOfLacasitos++;
        clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message, { binary: false });
            }
        });
        console.log(quantityOfLacasitos);
    });

    // Clean up when clients disconnect
    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
    });

});
