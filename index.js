const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const SECRET_KEY = 'token1';

// Rutas
app.post('/usuarios', async (req, res) => {
  const { nombre, correo, password } = req.body;

  try {
    await pool.query(
      'INSERT INTO usuarios (nombre, correo, contraseña) VALUES ($1, $2, $3)',
      [nombre, correo, password]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/login', async (req, res) => {
  const { nombre, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, nombre FROM usuarios WHERE nombre=$1 AND contraseña=$2',
      [nombre, password]
    );

    if (result.rows.length > 0) {
      const { id, nombre } = result.rows[0];
      const token = jwt.sign({ id, nombre }, SECRET_KEY, { expiresIn: '1h' });

      res.json({ valido: true, id, nombre, token });
    } else {
      res.json({ valido: false });
    }

  } catch (err) {
    console.error('Error en /login:', err);
    res.status(500).json({ error: err.message });
  }
});


app.post('/subirPublicacion', async (req, res) => {
  const { idusuario, titulo, texto } = req.body;
  try {
    await pool.query(
      'INSERT INTO publicaciones (idusuario, titulo, texto) VALUES ($1, $2, $3)',
      [idusuario, titulo, texto]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/subirComentario', async (req, res) => {
  const { idpublicacion, idusuario, comentario } = req.body;
  try {
    await pool.query(
      'INSERT INTO comentariosPublicaciones (idpublicacion, idusuario, comentario) VALUES ($1, $2, $3)',
      [idpublicacion, idusuario, comentario]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/obcomentarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM publicaciones');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/publicaciones/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM publicaciones WHERE idusuario = $1',
      [id]
    );

    if (result.rows.length > 0) {
      res.json(result.rows);
    } else {
      res.status(404).json({ error: 'sin publicaciones' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/checkToken', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ valido: false, message: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    res.json({ valido: true, decoded });
  } catch (error) {
    res.status(403).json({ valido: false, message: 'Token invalido' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend funcionando en puerto ${PORT}`);
});
