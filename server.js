const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro_cambiar_en_produccion';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Base de datos
const dbFile = path.join(__dirname, 'paintjs.db');
const db = new sqlite3.Database(dbFile, err => {
    if (err) return console.error('DB open error:', err);
    console.log('Conectado a SQLite:', dbFile);
    initDB();
});

function initDB() {
    // Tabla de usuarios
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creando tabla users:', err);
    });

    // Tabla de dibujos (ahora con user_id)
    db.run(`CREATE TABLE IF NOT EXISTS drawings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`, (err) => {
        if (err) console.error('Error creando tabla drawings:', err);
    });
}

// Middleware de autenticación
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log('❌ No se proporcionó token');
        return res.status(401).json({ error: 'Token requerido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('❌ Token inválido:', err.message);
            return res.status(403).json({ error: 'Token inválido o expirado' });
        }
        console.log('✅ Token válido para usuario:', user.username);
        req.user = user;
        next();
    });
}

// ============= RUTAS DE AUTENTICACIÓN =============

// Registro
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword],
            function (err) {
                if (err) {
                    console.error('Error al registrar:', err);
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ error: 'El usuario o email ya existe' });
                    }
                    return res.status(500).json({ error: 'Error al crear usuario' });
                }
                console.log('✅ Usuario creado:', username);
                res.json({ message: 'Usuario creado exitosamente', id: this.lastID });
            }
        );
    } catch (err) {
        console.error('Error en registro:', err);
        res.status(500).json({ error: 'Error al procesar registro' });
    }
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('Error al buscar usuario:', err);
            return res.status(500).json({ error: 'Error al buscar usuario' });
        }
        if (!user) {
            console.log('❌ Usuario no encontrado:', username);
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        try {
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                console.log('❌ Contraseña incorrecta para:', username);
                return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
            }

            const token = jwt.sign(
                { id: user.id, username: user.username },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            console.log('✅ Login exitoso:', username);
            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        } catch (err) {
            console.error('Error en login:', err);
            res.status(500).json({ error: 'Error al procesar login' });
        }
    });
});

// Verificar token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    db.get('SELECT id, username, email FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) {
            console.error('Error al verificar usuario:', err);
            return res.status(500).json({ error: 'Error al verificar usuario' });
        }
        if (!user) {
            console.log('❌ Usuario no encontrado en DB:', req.user.id);
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        console.log('✅ Usuario verificado:', user.username);
        res.json(user);
    });
});

// ============= RUTAS DE DIBUJOS =============

// Guardar dibujo
app.post('/api/drawings', authenticateToken, (req, res) => {
    const { name, data } = req.body;
    const userId = req.user.id;

    console.log('📝 Guardando dibujo para usuario:', req.user.username);

    if (!name || !data) {
        return res.status(400).json({ error: 'Nombre y datos requeridos' });
    }

    db.run(
        'INSERT INTO drawings (user_id, name, data) VALUES (?, ?, ?)',
        [userId, name, data],
        function (err) {
            if (err) {
                console.error('❌ Error al guardar dibujo:', err);
                return res.status(500).json({ error: 'Error al guardar dibujo: ' + err.message });
            }
            console.log('✅ Dibujo guardado con ID:', this.lastID);
            res.json({ id: this.lastID, message: 'Dibujo guardado' });
        }
    );
});

// Obtener dibujos del usuario
app.get('/api/drawings', authenticateToken, (req, res) => {
    const userId = req.user.id;

    console.log('📂 Cargando dibujos para usuario:', req.user.username);

    db.all(
        'SELECT id, name, created_at FROM drawings WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
            if (err) {
                console.error('❌ Error al cargar dibujos:', err);
                return res.status(500).json({ error: 'Error al cargar dibujos: ' + err.message });
            }
            console.log('✅ Dibujos cargados:', rows.length);
            res.json(rows);
        }
    );
});

// Obtener un dibujo específico
app.get('/api/drawings/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    const userId = req.user.id;

    console.log('🖼️ Cargando dibujo', id, 'para usuario:', req.user.username);

    db.get(
        'SELECT * FROM drawings WHERE id = ? AND user_id = ?',
        [id, userId],
        (err, row) => {
            if (err) {
                console.error('❌ Error al cargar dibujo:', err);
                return res.status(500).json({ error: 'Error al cargar dibujo: ' + err.message });
            }
            if (!row) {
                console.log('❌ Dibujo no encontrado:', id);
                return res.status(404).json({ error: 'Dibujo no encontrado' });
            }
            console.log('✅ Dibujo cargado:', row.name);
            res.json(row);
        }
    );
});

// Eliminar dibujo
app.delete('/api/drawings/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    const userId = req.user.id;

    console.log('🗑️ Eliminando dibujo', id, 'para usuario:', req.user.username);

    db.run(
        'DELETE FROM drawings WHERE id = ? AND user_id = ?',
        [id, userId],
        function (err) {
            if (err) {
                console.error('❌ Error al eliminar dibujo:', err);
                return res.status(500).json({ error: 'Error al eliminar dibujo: ' + err.message });
            }
            if (this.changes === 0) {
                console.log('❌ Dibujo no encontrado para eliminar:', id);
                return res.status(404).json({ error: 'Dibujo no encontrado' });
            }
            console.log('✅ Dibujo eliminado:', id);
            res.json({ message: 'Dibujo eliminado' });
        }
    );
});

// Servir archivos estáticos
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Ruta catch-all para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🎨 Paint.js Server escuchando en http://localhost:${PORT}`);
    console.log(`📁 Base de datos: ${dbFile}`);
    console.log(`🔐 JWT Secret configurado: ${JWT_SECRET.substring(0, 10)}...`);
    console.log(`\n✅ Servidor listo!\n`);
});