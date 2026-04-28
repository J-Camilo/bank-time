const { pool } = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');

const SAFE_FIELDS = `
  id, nombre, apellido, correo, departamento, municipio, direccion,
  creditos_disponibles, cancelaciones_acumuladas, fecha_bloqueo_hasta,
  activo, es_admin, promedio_valoracion, total_valoraciones, created_at
`;

const getProfile = async (id) => {
  const { rows: [user] } = await pool.query(
    `SELECT ${SAFE_FIELDS} FROM usuarios WHERE id = $1`,
    [id]
  );
  if (!user) throw new AppError('Usuario no encontrado', 404);
  return user;
};

const updateProfile = async (id, { nombre, apellido, departamento, municipio, direccion }) => {
  const { rows: [user] } = await pool.query(
    `UPDATE usuarios
     SET nombre       = COALESCE($1, nombre),
         apellido     = COALESCE($2, apellido),
         departamento = COALESCE($3, departamento),
         municipio    = COALESCE($4, municipio),
         direccion    = COALESCE($5, direccion)
     WHERE id = $6
     RETURNING id, nombre, apellido, correo, departamento, municipio, direccion, updated_at`,
    [nombre || null, apellido || null, departamento || null, municipio || null, direccion || null, id]
  );
  if (!user) throw new AppError('Usuario no encontrado', 404);
  return user;
};

const getCreditos = async (id) => {
  const { rows: [balance] } = await pool.query(
    `SELECT creditos_disponibles, cancelaciones_acumuladas, fecha_bloqueo_hasta
     FROM usuarios WHERE id = $1`,
    [id]
  );

  const { rows: movimientos } = await pool.query(
    `SELECT id, tipo, cantidad, descripcion, fecha, intercambio_id
     FROM movimientos_credito
     WHERE usuario_id = $1
     ORDER BY fecha DESC
     LIMIT 30`,
    [id]
  );

  return { ...balance, movimientos };
};

const getHistorial = async (id, { estado_final, page = 1, limit = 10 } = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [id];
  let filter = '';

  if (estado_final) {
    params.push(estado_final.toUpperCase());
    filter = `AND hi.estado_final = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT
       hi.id, hi.fecha_registro, hi.estado_final,
       i.creditos_acordados, i.fecha_acordada,
       p.titulo AS publicacion_titulo,
       prest.nombre AS prestador_nombre, prest.apellido AS prestador_apellido,
       rec.nombre   AS receptor_nombre,  rec.apellido   AS receptor_apellido,
       CASE WHEN i.prestador_id = $1 THEN 'PRESTADOR' ELSE 'RECEPTOR' END AS mi_rol
     FROM historial_intercambio hi
     JOIN intercambios  i    ON i.id    = hi.intercambio_id
     JOIN publicaciones p    ON p.id    = i.publicacion_id
     JOIN usuarios      prest ON prest.id = i.prestador_id
     JOIN usuarios      rec   ON rec.id   = i.receptor_id
     WHERE (i.prestador_id = $1 OR i.receptor_id = $1)
     ${filter}
     ORDER BY hi.fecha_registro DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, parseInt(limit), offset]
  );
  return rows;
};

module.exports = { getProfile, updateProfile, getCreditos, getHistorial };
