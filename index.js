const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const url = require('url');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// ... (conexión a base de datos igual que tienes) ...

const SECRET_KEY = 'token1';

// =========================
//      RUTA REGISTRO
// =========================
app.post('/usuarios', async (req, res) => {
  const { nombre, correo, password } = req.body;

  try {
    await pool.query(
      'INSERT INTO usuarios (nombre, correo, contrasena) VALUES ($1, $2, $3)',
      [nombre, correo, password]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Error en /usuarios:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
//         LOGIN
// =========================
app.post('/login', async (req, res) => {
  const { nombre, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, nombre FROM usuarios WHERE nombre=$1 AND contrasena=$2',
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

// =========================
//   SUBIR PUBLICACIÓN
// =========================
app.post('/subirPublicacion', async (req, res) => {
  const { idusuario, titulo, texto } = req.body;

  try {
    await pool.query(
      'INSERT INTO publicaciones (idusuario, titulo, texto) VALUES ($1, $2, $3)',
      [idusuario, titulo, texto]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en /subirPublicacion:', err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
//     SUBIR COMENTARIO
// =========================
app.post('/subirComentario', async (req, res) => {
  const { idpublicacion, idusuario, comentario } = req.body;

  try {
    await pool.query(
      'INSERT INTO comentariosPublicaciones (idpublicacion, idusuario, comentario) VALUES ($1, $2, $3)',
      [idpublicacion, idusuario, comentario]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en /subirComentario:', err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
//   OBTENER TODAS LAS PUBLICACIONES
// =========================
app.get('/obcomentarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM publicaciones ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error en /obcomentarios:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
//   OBTENER UNA PUBLICACIÓN POR SU ID
// =========================
app.get('/publicacion/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM publicaciones WHERE id = $1',
      [id]
    );

    if (result.rows.length > 0) {
      res.json({ publicacion: result.rows[0] });
    } else {
      res.status(404).json({ error: 'Publicación no encontrada' });
    }

  } catch (err) {
    console.error("Error en /publicacion/:id:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
//   OBTENER COMENTARIOS DE UNA PUBLICACIÓN (VERSIÓN SIMPLIFICADA)
// =========================
app.get('/comentarios/:idpublicacion', async (req, res) => {
  const { idpublicacion } = req.params;

  try {
    // Primero, intenta con JOIN para obtener nombre del usuario
    try {
      const result = await pool.query(
        `SELECT cp.*, u.nombre as usuario_nombre 
         FROM comentariosPublicaciones cp
         LEFT JOIN usuarios u ON cp.idusuario = u.id
         WHERE cp.idpublicacion = $1
         ORDER BY cp.id ASC`,
        [idpublicacion]
      );
      
      res.json(result.rows);
    } catch (joinError) {
      // Si falla el JOIN, devuelve solo los comentarios sin el nombre
      console.log('JOIN falló, usando consulta simple:', joinError.message);
      
      const result = await pool.query(
        'SELECT * FROM comentariosPublicaciones WHERE idpublicacion = $1 ORDER BY id ASC',
        [idpublicacion]
      );
      
      res.json(result.rows);
    }

  } catch (err) {
    console.error("Error en /comentarios/:idpublicacion:", err);
    
    // Si no hay comentarios, devuelve un array vacío en lugar de error
    if (err.message.includes('no existe')) {
      res.json([]);
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// =========================
//   OBTENER PUBLICACIONES DE UN USUARIO (POR ID USUARIO)
// =========================
app.get('/publicaciones-usuario/:idusuario', async (req, res) => {
  const { idusuario } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM publicaciones WHERE idusuario = $1 ORDER BY id DESC',
      [idusuario]
    );

    if (result.rows.length > 0) {
      res.json(result.rows);
    } else {
      res.status(404).json({ error: 'sin publicaciones' });
    }

  } catch (err) {
    console.error("Error en /publicaciones-usuario/:idusuario:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
//       CHECK TOKEN
// =========================
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

// =========================
//       INICIAR SERVIDOR
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend funcionando en puerto ${PORT}`);
});