import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import path from "path";
import fs from "fs";

const PORT = process.env.PORT || 8080;
const CLIENT_BASE_PATH = 'www';
const HTTP_STATUS_CODES = {
    "OK": 200,
    "NOT_FOUND": 404,
    "INTERNAL_SERVER_ERROR": 500
}

const server = http.createServer((req, res) => {
    try {
        if (req.url === '/' || req.url.indexOf('.html') > 0) {
            return returnFile({ ...req, url: req.url === '/' ? '/index.html' : req.url }, res, 'text/html');
        } else if (req.url.indexOf('.mjs') > 0 || req.url.indexOf('.js') > 0) {
            return returnFile(req, res, 'application/javascript');
        }
        else if (req.url.indexOf('.css')) {
            return returnFile(req, res, 'application/stylesheet');
        }
        else if (req.url === '/favicon.ico') {
            return returnFile(req, res, 'image/x-icon');
        }
    } catch (e) {
        console.error(e);
        res.writeHead(HTTP_STATUS_CODES.NOT_FOUND);
        res.end();
    }
});


server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});


const wss = new WebSocketServer({ server });

console.log(`WebSocket server is running on ws://localhost:${PORT}`);

/**
 * @typedef {{x: number, y: number, color: string }} PaintMessage
 */

/**
 * @type {{ws: WebSocket, id: string}[]}
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

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function stats() {
    return {
        online: clients.length,
        pixels: pixels
    }
}

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
    clients.forEach(({ ws }) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message, { binary: false });
            ws.send(JSON.stringify({ stats: stats() }));
        }
    });
};

wss.on('connection', (ws) => {
    clients.push({ ws, id: uuidv4() });
    ws.send(JSON.stringify({
        type: 'STATE',
        stats: stats(),
        settings: { width: WIDTH, height: HEIGHT },
        state: state.map(elem => elem === 0 ? '' : elem).toString()
    }));
    ws.on('message', onMessage);
    ws.on('close', () => {
        clients = clients.filter(client => client.ws !== ws);
    });
});

function returnFile(req, res, contentType) {
    if (req.url.indexOf('..') > 0) {
        res.writeHead(HTTP_STATUS_CODES.NOT_FOUND);
        res.end();
        return;
    }

    if (!fs.existsSync(path.resolve('', CLIENT_BASE_PATH, req.url.slice(1)))) {
        res.writeHead(HTTP_STATUS_CODES.NOT_FOUND)
        res.end();
        return;
    }

    res.writeHead(HTTP_STATUS_CODES.OK, { 'Content-Type': contentType });
    return fs.createReadStream(path.resolve('', CLIENT_BASE_PATH, req.url.slice(1))).pipe(res);
}

