const { pool } = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');

const listarUsuarios = async ({ activo, page = 1, limit = 20 } = {}) => {
  const params = [];
  let where = '';

  if (activo !== undefined) {
    params.push(activo === 'true' || activo === true);
    where = `WHERE activo = $${params.length}`;
  }

  const safePage  = Math.max(1, parseInt(page)  || 1);
  const safeLimit = Math.max(1, parseInt(limit) || 20);
  const offset = (safePage - 1) * safeLimit;
  params.push(safeLimit, offset);

  const { rows } = await pool.query(
    `SELECT id, nombre, apellido, correo, activo, es_admin,
            creditos_disponibles, cancelaciones_acumuladas,
            fecha_bloqueo_hasta, created_at
     FROM usuarios
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
};

const toggleActivar = async (id, activo) => {
  const { rows: [usuario] } = await pool.query(
    'SELECT id, es_admin FROM usuarios WHERE id = $1',
    [id]
  );
  if (!usuario) throw new AppError('Usuario no encontrado', 404);
  if (usuario.es_admin && !activo) throw new AppError('No se puede desactivar a otro administrador', 403);

  const { rows: [updated] } = await pool.query(
    'UPDATE usuarios SET activo = $1 WHERE id = $2 RETURNING id, nombre, activo',
    [activo, id]
  );
  return updated;
};

const listarPublicaciones = async ({ estado, page = 1, limit = 20 } = {}) => {
  const params = [];
  let where = '';

  if (estado) {
    params.push(estado.toUpperCase());
    where = `WHERE p.estado = $${params.length}`;
  }

  const safePage  = Math.max(1, parseInt(page)  || 1);
  const safeLimit = Math.max(1, parseInt(limit) || 20);
  const offset = (safePage - 1) * safeLimit;
  params.push(safeLimit, offset);

  const { rows } = await pool.query(
    `SELECT p.*,
            u.nombre, u.apellido,
            c.nombre AS categoria_nombre
     FROM publicaciones p
     JOIN usuarios u ON u.id = p.usuario_id
     LEFT JOIN categorias c ON c.id = p.categoria_id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
};

const eliminarPublicacion = async (id) => {
  const { rows: [pub] } = await pool.query(
    'SELECT id FROM publicaciones WHERE id = $1',
    [id]
  );
  if (!pub) throw new AppError('Publicación no encontrada', 404);

  const { rows: activos } = await pool.query(
    `SELECT id FROM intercambios
     WHERE publicacion_id = $1 AND estado NOT IN ('CANCELADO', 'COMPLETADO')`,
    [id]
  );
  if (activos.length) throw new AppError('No se puede eliminar: tiene intercambios activos asociados', 409);

  await pool.query('DELETE FROM publicaciones WHERE id = $1', [id]);
};

const getStats = async () => {
  const { rows: [stats] } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM usuarios)                                    AS total_usuarios,
      (SELECT COUNT(*) FROM usuarios WHERE activo = TRUE)                AS usuarios_activos,
      (SELECT COUNT(*) FROM publicaciones)                               AS total_publicaciones,
      (SELECT COUNT(*) FROM publicaciones WHERE estado = 'ABIERTO')     AS publicaciones_activas,
      (SELECT COUNT(*) FROM intercambios)                                AS total_intercambios,
      (SELECT COUNT(*) FROM intercambios WHERE estado = 'COMPLETADO')   AS intercambios_completados
  `);
  return stats;
};

module.exports = { listarUsuarios, toggleActivar, listarPublicaciones, eliminarPublicacion, getStats };
