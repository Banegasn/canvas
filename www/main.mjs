import { Signal } from './signal/signal.mjs';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const PIXEL_SIZE = 8;
const canvas = $('#world-wide-canvas');
const onlineCount = $('#online-count');
const pixelCount = $('#pixel-count');
const ctx = canvas.getContext('2d');
const padding = (size) => size - 0;

document.addEventListener('click', (e) => {
    if (e.target) {
        const attribute = e.target.getAttribute('click') || e.target.parentElement.getAttribute('click');
        attribute && eval(attribute);
    }
});

function rgbaToHex(r, g, b, a = '') {
    const componentToHex = (c) => { const hex = c.toString(16); return hex.length == 1 ? "0" + hex : hex };
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b) + componentToHex(a);
}

const resizeCanvas = () => {
    canvas.width = padding(document.body.clientWidth);
    canvas.height = padding(document.body.clientHeight - 64);
}

// size canvas as windows 
resizeCanvas();

// Resize canvas when window size changes
window.addEventListener('resize', () => {
    resizeCanvas();
    clearCanvas();
});

// Create signals for drawing
const drawSignal = new Signal();

// Listen for drawing events and handle them
drawSignal.listen(({ x, y, color }) => {
    drawPixel(x, y, color);
});


// Function to draw a pixel on the canvas
function drawPixel(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
}

// Function to handle user clicks on the canvas
canvas.addEventListener('click', (e) => {
    const x = Math.floor(e.offsetX / PIXEL_SIZE);
    const y = Math.floor(e.offsetY / PIXEL_SIZE);
    const color = randomColor();
    drawSignal.emit({ x, y, color });
    sendPixelToServer({ x, y, color });
});

/** allow to grag to paint */
let isDrawing = false;

canvas.addEventListener('mousedown', (e) => isDrawing = true);

canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        const x = Math.floor(e.offsetX / PIXEL_SIZE);
        const y = Math.floor(e.offsetY / PIXEL_SIZE);
        // random color in hex
        const color = randomColor();
        // emit the drawing signal locally
        drawSignal.emit({ x, y, color });
        // send pixel data to server
        sendPixelToServer({ x, y, color });
    }
});

canvas.addEventListener('mouseup', () => isDrawing = false);

// --- WebSockets ---

let socket = initSocket();

/**
 * Generates a hex random color with alpha channel
 * @returns {string} random color in hex
 */
function randomColor() {
    // return a hex random color with alpha channel 
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    const a = Math.floor(Math.random() * 256);
    return rgbaToHex(r, g, b, a);
}

/**
 * Initializes a WebSocket connection
 * @returns {WebSocket} socket
 */
function initSocket() {
    const domain = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${domain}`);
    listenSocketEvents(socket);
    return socket;
}

function listenSocketEvents(newSocket) {
    // When the WebSocket connection is open
    newSocket.addEventListener('open', () => { console.log('WebSocket connection opened.'); }, { once: true });
    // Handle socket errors
    newSocket.addEventListener('error', (error) => { console.error('WebSocket error:', error); });
    // When receiving pixel data from the server
    newSocket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        if (data.stats) {
            onlineCount.innerHTML = data.stats.online || 0;
            pixelCount.innerHTML = data.stats.pixels || 0;
        }
        if (data.type === 'STATE') {
            const DATA = 4;
            const width = data.settings.width;
            const state = new Uint8Array(data.state.split(',').map(Number));
            for (let i = 0; i < state.length; i += DATA) {
                const color = rgbaToHex(state[i], state[i + 1], state[i + 2], state[i + 3]);
                const x = i / DATA % width;
                const y = Math.floor(i / DATA / width);
                drawSignal.emit({ x, y, color });
            }
        } else {
            drawSignal.emit(data);
        }
    });
    newSocket.addEventListener('close', () => {
        console.log('WebSocket connection closed. Retrying in 1 seconds...');
        setTimeout(() => { socket = initSocket(); }, 1000);
    }, { once: true });
}

// Function to send pixel data to the server
function sendPixelToServer(data) {
    const message = JSON.stringify(data);
    socket.send(message);
}


let scale = 1;
let panX = 0, panY = 0;

// Signal for zoom
const zoomSignal = new Signal();

// Handle zoom in/out
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;
    scale *= zoomAmount;

    // Emit zoom signal
    zoomSignal.emit({ scale, panX, panY });
    clearCanvas();
});

// Redraw canvas with zoom and pan
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}