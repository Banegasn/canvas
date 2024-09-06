import { Signal } from './signal/signal.mjs';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const PIXEL_SIZE = 5;
const canvas = $('#world-wide-canvas');
const ctx = canvas.getContext('2d');
const padding = (size) => size - 24;

const resizeCanvas = () => {
    canvas.width = padding(document.body.clientWidth);
    canvas.height = padding(document.body.clientHeight);
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

    // random color
    const color = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;

    // Emit the drawing signal locally
    drawSignal.emit({ x, y, color });

    // Send pixel data to server (we'll set up WebSockets next)
    sendPixelToServer({ x, y, color });
});

/** allow to grag to paint */
let isDrawing = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    lastX = Math.floor(e.offsetX / PIXEL_SIZE);
    lastY = Math.floor(e.offsetY / PIXEL_SIZE);
});

canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        const x = Math.floor(e.offsetX / PIXEL_SIZE);
        const y = Math.floor(e.offsetY / PIXEL_SIZE);

        // random color
        const color = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;

        // Emit the drawing signal locally
        drawSignal.emit({ x, y, color });

        // Send pixel data to server (we'll set up WebSockets next)
        sendPixelToServer({ x, y, color });

        lastX = x;
        lastY = y;
    }
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
});

// --- WebSockets ---

// Open WebSocket connection
const socket = new WebSocket('ws://localhost:8080');

// When receiving pixel data from the server
socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    drawSignal.emit(data);
});

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