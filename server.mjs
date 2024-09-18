import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import path from "path";
import fs, { stat } from "fs";

const PORT = 4200;
const SOCKET_PORT = 3000;
const CLIENT_BASE_PATH = 'www';
const HTTP_STATUS_CODES = {
    /** Success */
    "OK": 200,
    "NOT_FOUND": 404,
    "INTERNAL_SERVER_ERROR": 500
}

const wss = new WebSocketServer({ port: SOCKET_PORT });

console.log(`WebSocket server is running on ws://localhost:${SOCKET_PORT}`);

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

const WIDTH = 1024;
const HEIGHT = 200;
const DATA = 4;

/**
 * @type {Uint8Array}
 */
let state = new Uint8Array(WIDTH * HEIGHT * DATA);


function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})*$/i.exec(hex);
    return result ? {
        red: parseInt(result[1], 16),
        green: parseInt(result[2], 16),
        blue: parseInt(result[3], 16),
        alpha: parseInt(result[4], 16)
    } : null;
}

/**
 * Save state of new pixel message into state using a  Uint8Array
 */
const savePixel = (message) => {
    const { x, y, color } = message;
    const index = (x + (y * WIDTH)) * DATA;
    const rgbColor = hexToRgb(color);
    if (rgbColor) {
        try {
            state.set([rgbColor.red, rgbColor.green, rgbColor.blue, rgbColor.alpha], index);
        } catch (e) {
            console.error(e);
        }
    }
}

/**
 * When a message is received, broadcast to all clients
 * @param {PaintMessage} message 
 */
const onMessage = (message) => {
    const data = JSON.parse(message.toString());
    pixels++;
    savePixel(data);
    clients.forEach(client => {
        // check if client is sender
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message, { binary: false });
            console.log('sending new state');
        }
    });
};

/**
 * Clean up when clients disconnect
 */
const onClose = () => {
    clients = clients.filter(client => client !== ws);
};


wss.on('connection', (ws) => {
    clients.push(ws);
    ws.send(JSON.stringify({ type: 'STATE', settings: { width: WIDTH, height: HEIGHT }, state: state.toString() }));
    ws.on('message', onMessage);
    ws.on('close', onClose);
});

function returnFile(req, res, contentType) {
    if (!fs.existsSync(path.resolve('', CLIENT_BASE_PATH, req.url.slice(1)))) {
        res.writeHead(HTTP_STATUS_CODES.NOT_FOUND)
        res.end();
        return;
    }

    res.writeHead(HTTP_STATUS_CODES.OK, { 'Content-Type': contentType });
    return fs.createReadStream(path.resolve('', CLIENT_BASE_PATH, req.url.slice(1))).pipe(res);
}

const ws = http.createServer((req, res) => {
    try {
        if (req.url === '/') {
            res.writeHead(HTTP_STATUS_CODES.OK, { 'Content-Type': 'text/html' });
            return fs.createReadStream(path.resolve('', CLIENT_BASE_PATH, 'index.html')).pipe(res);
        } else if (req.url.indexOf('.mjs') || req.url.indexOf('.js')) {
            return returnFile(req, res, 'application/javascript');
        }
        else if (req.url === '/favicon.ico') {
            return returnFile(req, res, 'image/x-icon');
        }
        else if (req.url.indexOf('.css')) {
            return returnFile(req, res, 'application/stylesheet');
        }
    } catch (e) {
        console.error(e);
        res.writeHead(HTTP_STATUS_CODES.NOT_FOUND);
        res.end();
    }
});

ws.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});


