const jwt  = require('jsonwebtoken');
const { pool } = require('../config/db');

/**
 * Verifica el access token JWT del header Authorization: Bearer <token>
 * Adjunta req.user con los datos del usuario desde la DB.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Re-fetch from DB to ensure user is still active
    const { rows } = await pool.query(
      `SELECT id, nombre, apellido, correo, es_admin, activo,
              creditos_disponibles, fecha_bloqueo_hasta, cancelaciones_acumuladas
       FROM usuarios WHERE id = $1`,
      [payload.id]
    );

    if (!rows[0]) return res.status(401).json({ error: 'Usuario no encontrado' });
    if (!rows[0].activo) return res.status(403).json({ error: 'Cuenta desactivada' });

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = authMiddleware;
