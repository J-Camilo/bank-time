const { pool } = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');

/**
 * Encuentra publicaciones compatibles con una publicación dada.
 * Criterios: misma categoría, usuario distinto, estado ABIERTO.
 * Ordenadas por promedio de valoración (mejor primero).
 */
const findByPublicacion = async (publicacionId, usuarioId) => {
  // Auto-expire stale publications
  await pool.query(
    "UPDATE publicaciones SET estado = 'EXPIRADO' WHERE estado = 'ABIERTO' AND fecha_expiracion < CURRENT_DATE"
  );

  const { rows: [pub] } = await pool.query(
    `SELECT p.categoria_id, u.municipio
     FROM publicaciones p
     JOIN usuarios u ON u.id = p.usuario_id
     WHERE p.id = $1`,
    [publicacionId]
  );
  if (!pub) throw new AppError('Publicación no encontrada', 404);

  const { rows } = await pool.query(
    `SELECT
       p.id, p.titulo, p.descripcion, p.fecha_expiracion, p.creditos_hora,
       u.nombre, u.apellido, u.promedio_valoracion, u.municipio,
       c.nombre AS categoria_nombre,
       -- Relevance score: same municipio = bonus
       (u.promedio_valoracion + CASE WHEN u.municipio = $4 THEN 1 ELSE 0 END) AS score
     FROM publicaciones p
     JOIN usuarios u ON u.id = p.usuario_id
     LEFT JOIN categorias c ON c.id = p.categoria_id
     WHERE p.estado = 'ABIERTO'
       AND p.usuario_id  != $1
       AND p.id          != $2
       AND p.categoria_id = $3
     ORDER BY score DESC, p.created_at DESC
     LIMIT 10`,
    [usuarioId, publicacionId, pub.categoria_id, pub.municipio]
  );

  return rows;
};

/**
 * Busca publicaciones abiertas en múltiples categorías (excluyendo al propio usuario).
 * Útil para el dashboard / pantalla principal.
 */
const findByCategorias = async (categoriaIds, excludeUserId, limit = 20) => {
  if (!categoriaIds?.length) return [];

  const placeholders = categoriaIds.map((_, i) => `$${i + 2}`).join(', ');
  const { rows } = await pool.query(
    `SELECT
       p.id, p.titulo, p.descripcion, p.fecha_expiracion, p.creditos_hora,
       u.nombre, u.apellido, u.promedio_valoracion,
       c.nombre AS categoria_nombre
     FROM publicaciones p
     JOIN usuarios u ON u.id = p.usuario_id
     LEFT JOIN categorias c ON c.id = p.categoria_id
     WHERE p.estado = 'ABIERTO'
       AND p.usuario_id != $1
       AND p.categoria_id IN (${placeholders})
     ORDER BY u.promedio_valoracion DESC, p.created_at DESC
     LIMIT ${parseInt(limit)}`,
    [excludeUserId, ...categoriaIds.map(Number)]
  );
  return rows;
};

module.exports = { findByPublicacion, findByCategorias };
