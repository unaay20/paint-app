const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const dbFile = path.join(__dirname, 'paintjs.db');
const db = new sqlite3.Database(dbFile, err => {
    if (err) return console.error('DB open error:', err);
    console.log('Conectado a SQLite:', dbFile);
    initDB();
});
function initDB() {
    db.run(`CREATE TABLE IF NOT EXISTS drawings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

app.post('/api/drawings', (req, res) => {
    const { name, data } = req.body;
    if (!name || !data) return res.status(400).json({ error: 'Nombre y datos requeridos' });
    db.run('INSERT INTO drawings (name, data) VALUES (?, ?)', [name, data], function (err) {
        if (err) return res.status(500).json({ error: 'Error al guardar dibujo' });
        res.json({ id: this.lastID, message: 'Dibujo guardado' });
    });
});

app.get('/api/drawings', (req, res) => {
    db.all('SELECT id, name, created_at FROM drawings ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al cargar dibujos' });
        res.json(rows);
    });
});

app.get('/api/drawings/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM drawings WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Error al cargar dibujo' });
        if (!row) return res.status(404).json({ error: 'Dibujo no encontrado' });
        res.json(row);
    });
});

app.delete('/api/drawings/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM drawings WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: 'Error al eliminar dibujo' });
        if (this.changes === 0) return res.status(404).json({ error: 'Dibujo no encontrado' });
        res.json({ message: 'Dibujo eliminado' });
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`API + frontend escuchando en http://localhost:${PORT}`);
});
