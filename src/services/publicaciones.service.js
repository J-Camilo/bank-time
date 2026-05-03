const { pool } = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');

// Expire publications past their date (called lazily on list/get)
const autoExpirar = () =>
  pool.query(`UPDATE publicaciones SET estado = 'EXPIRADO'
              WHERE estado = 'ABIERTO' AND fecha_expiracion < CURRENT_DATE`);

const create = async (usuarioId, { titulo, descripcion, categoria_id, fecha_expiracion, creditos_hora = 1 }) => {
  if (!categoria_id || !Number.isInteger(Number(categoria_id))) {
    throw new AppError('categoria_id es requerida y debe ser un número válido', 400);
  }
  const { rows: [pub] } = await pool.query(
    `INSERT INTO publicaciones (titulo, descripcion, categoria_id, fecha_expiracion, creditos_hora, usuario_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [titulo, descripcion, Number(categoria_id), fecha_expiracion, creditos_hora, usuarioId]
  );
  return pub;
};

const findAll = async ({ categoria_id, categoria_ids, page = 1, limit = 10, sort_by = 'recientes' } = {}) => {
  await autoExpirar();

  const safePage  = Math.max(1, parseInt(page)  || 1);
  const safeLimit = Math.max(1, parseInt(limit) || 10);
  const offset    = (safePage - 1) * safeLimit;
  const params    = [];
  let where       = "p.estado = 'ABIERTO'";

  // Multi-category filter: categoria_ids takes precedence over categoria_id
  const cats = categoria_ids
    ? (Array.isArray(categoria_ids) ? categoria_ids : String(categoria_ids).split(','))
        .map(Number).filter(n => !isNaN(n) && n > 0)
    : categoria_id ? [parseInt(categoria_id)] : [];

  if (cats.length > 0) {
    params.push(cats);
    where += ` AND p.categoria_id = ANY($${params.length}::int[])`;
  }

  // Sort order
  const orderBy =
    sort_by === 'valorados' ? 'u.promedio_valoracion DESC NULLS LAST, p.created_at DESC' :
    sort_by === 'creditos'  ? 'p.creditos_hora DESC, p.created_at DESC' :
                              'p.created_at DESC';

  const dataQuery = `
    SELECT p.*,
           u.nombre, u.apellido, u.promedio_valoracion,
           c.nombre AS categoria_nombre
    FROM publicaciones p
    JOIN usuarios u ON u.id = p.usuario_id
    LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const countQuery = `
    SELECT COUNT(*) FROM publicaciones p
    JOIN usuarios u ON u.id = p.usuario_id
    WHERE ${where}
  `;

  const [{ rows: data }, { rows: [{ count }] }] = await Promise.all([
    pool.query(dataQuery, [...params, safeLimit, offset]),
    pool.query(countQuery, params),
  ]);

  return { data, total: parseInt(count), page: safePage, limit: safeLimit };
};

const findById = async (id) => {
  await autoExpirar();
  const { rows: [pub] } = await pool.query(
    `SELECT p.*,
            u.nombre, u.apellido, u.promedio_valoracion,
            c.nombre AS categoria_nombre
     FROM publicaciones p
     JOIN usuarios u ON u.id = p.usuario_id
     LEFT JOIN categorias c ON c.id = p.categoria_id
     WHERE p.id = $1`,
    [id]
  );
  if (!pub) throw new AppError('Publicación no encontrada', 404);
  return pub;
};

const findByUser = async (usuarioId, { includeExpired = false } = {}) => {
  const { rows } = await pool.query(
    `SELECT p.*, c.nombre AS categoria_nombre
     FROM publicaciones p
     LEFT JOIN categorias c ON c.id = p.categoria_id
     WHERE p.usuario_id = $1
     ${includeExpired ? '' : "AND p.estado = 'ABIERTO'"}
     ORDER BY p.created_at DESC`,
    [usuarioId]
  );
  return rows;
};

const update = async (id, usuarioId, fields) => {
  const { rows: [pub] } = await pool.query(
    'SELECT id, usuario_id, estado FROM publicaciones WHERE id = $1',
    [id]
  );
  if (!pub) throw new AppError('Publicación no encontrada', 404);
  if (pub.usuario_id !== usuarioId) throw new AppError('Sin permiso para editar esta publicación', 403);
  if (pub.estado !== 'ABIERTO') throw new AppError('Solo se pueden editar publicaciones abiertas', 400);

  const allowed = ['titulo', 'descripcion', 'categoria_id', 'fecha_expiracion', 'creditos_hora'];
  const updates = Object.entries(fields).filter(([k, v]) => allowed.includes(k) && v !== undefined);
  if (!updates.length) throw new AppError('No hay campos válidos para actualizar', 400);

  const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ');
  const values     = updates.map(([, v]) => v);
  values.push(id);

  const { rows: [updated] } = await pool.query(
    `UPDATE publicaciones SET ${setClauses} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return updated;
};

const remove = async (id, usuarioId) => {
  const { rows: [pub] } = await pool.query('SELECT * FROM publicaciones WHERE id = $1', [id]);
  if (!pub) throw new AppError('Publicación no encontrada', 404);
  if (pub.usuario_id !== usuarioId) throw new AppError('Sin permiso', 403);

  // Block if has active intercambios
  const { rows: activos } = await pool.query(
    `SELECT id FROM intercambios
     WHERE publicacion_id = $1 AND estado NOT IN ('CANCELADO', 'COMPLETADO')`,
    [id]
  );
  if (activos.length) throw new AppError('No se puede eliminar: tiene intercambios activos asociados', 409);

  await pool.query('DELETE FROM publicaciones WHERE id = $1', [id]);
};

module.exports = { create, findAll, findById, findByUser, update, remove };
