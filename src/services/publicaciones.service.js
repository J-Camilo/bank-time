const { pool } = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');

// Expire publications past their date (called lazily on list/get)
const autoExpirar = () =>
  pool.query(`UPDATE publicaciones SET estado = 'EXPIRADO'
              WHERE estado = 'ABIERTO' AND fecha_expiracion < CURRENT_DATE`);

const create = async (usuarioId, { titulo, descripcion, categoria_id, fecha_expiracion, creditos_hora = 1 }) => {
  const { rows: [pub] } = await pool.query(
    `INSERT INTO publicaciones (titulo, descripcion, categoria_id, fecha_expiracion, creditos_hora, usuario_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [titulo, descripcion, categoria_id || null, fecha_expiracion, creditos_hora, usuarioId]
  );
  return pub;
};

const findAll = async ({ categoria_id, page = 1, limit = 10 } = {}) => {
  await autoExpirar();

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  let where = "p.estado = 'ABIERTO'";

  if (categoria_id) {
    params.push(parseInt(categoria_id));
    where += ` AND p.categoria_id = $${params.length}`;
  }

  const dataQuery = `
    SELECT p.*,
           u.nombre, u.apellido, u.promedio_valoracion,
           c.nombre AS categoria_nombre
    FROM publicaciones p
    JOIN usuarios u ON u.id = p.usuario_id
    LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE ${where}
    ORDER BY p.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const countQuery = `SELECT COUNT(*) FROM publicaciones p WHERE ${where}`;

  const [{ rows: data }, { rows: [{ count }] }] = await Promise.all([
    pool.query(dataQuery, [...params, parseInt(limit), offset]),
    pool.query(countQuery, params),
  ]);

  return { data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) };
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
