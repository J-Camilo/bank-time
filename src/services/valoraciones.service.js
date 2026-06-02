const { pool } = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');

const crear = async (usuarioId, { intercambio_id, calificacion, comentario }) => {
  const { rows: [intercambio] } = await pool.query(
    'SELECT * FROM intercambios WHERE id = $1',
    [intercambio_id]
  );
  if (!intercambio) throw new AppError('Intercambio no encontrado', 404);
  if (intercambio.estado !== 'COMPLETADO') throw new AppError('El intercambio no está completado', 400);

  const esPrestador = intercambio.prestador_id === usuarioId;
  const esReceptor  = intercambio.receptor_id  === usuarioId;
  if (!esPrestador && !esReceptor) throw new AppError('Sin permiso para valorar este intercambio', 403);

  const usuario_valorado_id = esPrestador ? intercambio.receptor_id : intercambio.prestador_id;

  const { withTransaction } = require('../config/db');
  return withTransaction(async (client) => {
    let valoracion;
    try {
      const { rows: [v] } = await client.query(
        `INSERT INTO valoraciones (intercambio_id, usuario_id, usuario_valorado_id, calificacion, comentario)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [intercambio_id, usuarioId, usuario_valorado_id, calificacion, comentario || null]
      );
      valoracion = v;
    } catch (e) {
      if (e.code === '23505') throw new AppError('Ya valoraste este intercambio', 409);
      throw e;
    }

    // Recalcular promedio real del usuario valorado
    await client.query(
      `UPDATE usuarios
       SET promedio_valoracion = (
             SELECT ROUND(AVG(calificacion)::numeric, 1)
             FROM valoraciones
             WHERE usuario_valorado_id = $1
           ),
           total_valoraciones = (
             SELECT COUNT(*)
             FROM valoraciones
             WHERE usuario_valorado_id = $1
           )
       WHERE id = $1`,
      [usuario_valorado_id]
    );

    return valoracion;
  });
};

const listarPorUsuario = async (usuarioId) => {
  const { rows } = await pool.query(
    `SELECT v.id, v.calificacion, v.comentario, v.fecha,
            u.nombre AS evaluador_nombre, u.apellido AS evaluador_apellido
     FROM valoraciones v
     JOIN usuarios u ON u.id = v.usuario_id
     WHERE v.usuario_valorado_id = $1
     ORDER BY v.fecha DESC
     LIMIT 20`,
    [usuarioId]
  );
  return rows;
};

const porIntercambio = async (intercambioId, usuarioId) => {
  const { rows: [intercambio] } = await pool.query(
    'SELECT prestador_id, receptor_id FROM intercambios WHERE id = $1',
    [intercambioId]
  );
  if (!intercambio) throw new AppError('Intercambio no encontrado', 404);
  if (intercambio.prestador_id !== usuarioId && intercambio.receptor_id !== usuarioId) {
    throw new AppError('Sin acceso a este intercambio', 403);
  }

  const { rows } = await pool.query(
    `SELECT v.id, v.calificacion, v.comentario, v.fecha, v.usuario_id,
            u.nombre  AS evaluador_nombre,  u.apellido  AS evaluador_apellido,
            uv.nombre AS evaluado_nombre, uv.apellido AS evaluado_apellido
     FROM valoraciones v
     JOIN usuarios u  ON u.id  = v.usuario_id
     JOIN usuarios uv ON uv.id = v.usuario_valorado_id
     WHERE v.intercambio_id = $1`,
    [intercambioId]
  );
  return rows;
};

module.exports = { crear, listarPorUsuario, porIntercambio };
