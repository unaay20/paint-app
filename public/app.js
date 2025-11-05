const API_URL = 'http://localhost:3000/api';

const MODES = {
    DRAW: 'draw', ERASE: 'erase', LINE: 'line', RECTANGLE: 'rectangle',
    SQUARE: 'square', CIRCLE: 'circle', ELLIPSE: 'ellipse',
    POLYGON: 'polygon', STAR: 'star', PICKER: 'picker'
};

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('color-picker');
const lineWidthInput = document.getElementById('line-width');
const polygonSidesInput = document.getElementById('polygon-sides');
const starPointsInput = document.getElementById('star-points');

let isDrawing = false, startX = 0, startY = 0, lastX = 0, lastY = 0;
let mode = MODES.DRAW, imageData = null, currentColor = '#000000', backgroundImage = null;

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

colorPicker.addEventListener('change', (e) => { currentColor = e.target.value; ctx.strokeStyle = currentColor; ctx.fillStyle = currentColor; });
lineWidthInput.addEventListener('change', (e) => { ctx.lineWidth = parseInt(e.target.value); });

document.getElementById('draw-btn').addEventListener('click', () => setMode(MODES.DRAW));
document.getElementById('erase-btn').addEventListener('click', () => setMode(MODES.ERASE));
document.getElementById('line-btn').addEventListener('click', () => setMode(MODES.LINE));
document.getElementById('rectangle-btn').addEventListener('click', () => setMode(MODES.RECTANGLE));
document.getElementById('square-btn').addEventListener('click', () => setMode(MODES.SQUARE));
document.getElementById('circle-btn').addEventListener('click', () => setMode(MODES.CIRCLE));
document.getElementById('ellipse-btn').addEventListener('click', () => setMode(MODES.ELLIPSE));
document.getElementById('polygon-btn').addEventListener('click', () => setMode(MODES.POLYGON));
document.getElementById('star-btn').addEventListener('click', () => setMode(MODES.STAR));
document.getElementById('picker-btn').addEventListener('click', () => setMode(MODES.PICKER));
document.getElementById('clear-btn').addEventListener('click', clearCanvas);

document.getElementById('new-btn').addEventListener('click', () => {
    if (confirm('¿Crear un nuevo dibujo? Se perderá el dibujo actual si no lo has guardado.')) {
        clearCanvas();
    }
});

document.getElementById('bg-btn').addEventListener('click', () => document.getElementById('bg-input').click());
document.getElementById('bg-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => { backgroundImage = img; redrawCanvas(); };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});

document.getElementById('export-btn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvas.toDataURL();
    link.click();
});

document.getElementById('save-btn').addEventListener('click', () => {
    document.getElementById('save-modal').style.display = 'block';
});
document.getElementById('close-save-modal').addEventListener('click', () => {
    document.getElementById('save-modal').style.display = 'none';
});
document.getElementById('save-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('drawing-name').value;
    const data = canvas.toDataURL();
    try {
        const res = await fetch(API_URL + '/drawings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, data })
        });
        if (!res.ok) throw new Error('Error al guardar');
        showTempMessage('Dibujo guardado', 'success', 'save-message');
        setTimeout(() => { document.getElementById('save-modal').style.display = 'none'; document.getElementById('drawing-name').value = ''; }, 800);
    } catch (err) {
        showTempMessage('Error al guardar', 'error', 'save-message');
    }
});

document.getElementById('load-btn').addEventListener('click', loadDrawings);
document.getElementById('close-load-modal').addEventListener('click', () => {
    document.getElementById('load-modal').style.display = 'none';
});

window.loadDrawing = async (id) => {
    try {
        const res = await fetch(API_URL + '/drawings/' + id);
        if (!res.ok) throw new Error('No encontrado');
        const drawing = await res.json();
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = drawing.data;
        document.getElementById('load-modal').style.display = 'none';
    } catch (err) {
        alert('Error al cargar dibujo');
    }
};

window.deleteDrawing = async (id) => {
    if (!confirm('¿Eliminar este dibujo?')) return;
    try {
        const res = await fetch(API_URL + '/drawings/' + id, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar');
        loadDrawings();
    } catch (err) {
        alert('Error al eliminar');
    }
};

async function loadDrawings() {
    try {
        const res = await fetch(API_URL + '/drawings');
        if (!res.ok) throw new Error('Error al obtener');
        const drawings = await res.json();
        const listHTML = drawings.map(d => `
            <div class="drawing-item">
                <span>${escapeHtml(d.name)} - ${new Date(d.created_at).toLocaleString()}</span>
                <div class="drawing-actions">
                    <button class="load-btn" onclick="loadDrawing(${d.id})">Cargar</button>
                    <button class="delete-btn" onclick="deleteDrawing(${d.id})">Eliminar</button>
                </div>
            </div>
        `).join('');
        document.getElementById('drawings-list').innerHTML = listHTML || '<p>No hay dibujos guardados</p>';
        document.getElementById('load-modal').style.display = 'block';
    } catch (err) {
        alert('Error al cargar dibujos');
    }
}

function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left; startY = e.clientY - rect.top;
    lastX = startX; lastY = startY;
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function draw(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;

    if (mode === MODES.DRAW || mode === MODES.ERASE) {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        lastX = x; lastY = y;
        return;
    }

    ctx.putImageData(imageData, 0, 0);
    switch (mode) {
        case MODES.LINE: drawLine(startX, startY, x, y); break;
        case MODES.RECTANGLE: drawRectangle(startX, startY, x - startX, y - startY); break;
        case MODES.SQUARE:
            const size = Math.max(Math.abs(x - startX), Math.abs(y - startY));
            drawRectangle(startX, startY, size * Math.sign(x - startX), size * Math.sign(y - startY));
            break;
        case MODES.CIRCLE: drawCircle(startX, startY, Math.hypot(x - startX, y - startY)); break;
        case MODES.ELLIPSE: drawEllipse(startX, startY, Math.abs(x - startX), Math.abs(y - startY)); break;
        case MODES.POLYGON: drawPolygon(startX, startY, Math.hypot(x - startX, y - startY), parseInt(polygonSidesInput.value)); break;
        case MODES.STAR: drawStar(startX, startY, Math.hypot(x - startX, y - startY), parseInt(starPointsInput.value)); break;
    }
}

function stopDrawing() { isDrawing = false; }

function drawLine(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function drawRectangle(x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.stroke(); }
function drawCircle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
function drawEllipse(x, y, rX, rY) { ctx.beginPath(); ctx.ellipse(x, y, rX, rY, 0, 0, Math.PI * 2); ctx.stroke(); }
function drawPolygon(x, y, r, sides) { ctx.beginPath(); for (let i = 0; i <= sides; i++) { const angle = (i * 2 * Math.PI) / sides - Math.PI / 2; const px = x + r * Math.cos(angle); const py = y + r * Math.sin(angle); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); }
function drawStar(x, y, r, points) { ctx.beginPath(); const inner = r * 0.5; for (let i = 0; i <= points * 2; i++) { const angle = (i * Math.PI) / points - Math.PI / 2; const rad = i % 2 === 0 ? r : inner; const px = x + rad * Math.cos(angle); const py = y + rad * Math.sin(angle); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); ctx.stroke(); }

function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); redrawCanvas(); }
function redrawCanvas() { if (backgroundImage) ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height); }

function setMode(newMode) {
    mode = newMode;
    document.querySelectorAll('aside button').forEach(btn => btn.classList.remove('active'));
    const ids = { draw: 'draw-btn', erase: 'erase-btn', line: 'line-btn', rectangle: 'rectangle-btn', square: 'square-btn', circle: 'circle-btn', ellipse: 'ellipse-btn', polygon: 'polygon-btn', star: 'star-btn', picker: 'picker-btn' };
    document.getElementById(ids[newMode])?.classList.add('active');

    document.getElementById('polygon-label').style.display = newMode === MODES.POLYGON ? 'flex' : 'none';
    document.getElementById('star-label').style.display = newMode === MODES.STAR ? 'flex' : 'none';

    if (newMode === MODES.ERASE) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 20;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = parseInt(lineWidthInput.value);
        ctx.fillStyle = currentColor;
    }
}

function showTempMessage(text, type, elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = text; el.className = `message ${type}`; el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 2000);
}

function escapeHtml(unsafe) { return unsafe.replace(/[&<"'>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#039;" }[c])); }

ctx.lineWidth = 2; ctx.strokeStyle = currentColor; ctx.fillStyle = currentColor; setMode(MODES.DRAW);
