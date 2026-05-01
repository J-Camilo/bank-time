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

  try {
    const { rows: [valoracion] } = await pool.query(
      `INSERT INTO valoraciones (intercambio_id, usuario_id, usuario_valorado_id, calificacion, comentario)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [intercambio_id, usuarioId, usuario_valorado_id, calificacion, comentario || null]
    );
    return valoracion;
  } catch (e) {
    if (e.code === '23505') throw new AppError('Ya valoraste este intercambio', 409);
    throw e;
  }
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

module.exports = { crear, listarPorUsuario };
