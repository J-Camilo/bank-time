const { pool, withTransaction } = require('../config/db');
const { AppError }              = require('../middlewares/errorHandler');
const notif                     = require('./notificaciones.service');

const crear = async (usuarioId, { publicacion_id, mensaje, fecha_propuesta }) => {
  return withTransaction(async (client) => {
    // ── Validate publication ──────────────────────────────────
    const { rows: [pub] } = await client.query(
      'SELECT id, usuario_id, estado, titulo, creditos_hora FROM publicaciones WHERE id = $1 FOR SHARE',
      [publicacion_id]
    );
    if (!pub)                         throw new AppError('Publicación no encontrada', 404);
    if (pub.estado !== 'ABIERTO')     throw new AppError('Publicación no está disponible', 400);
    if (pub.usuario_id === usuarioId) throw new AppError('No puedes solicitar tu propia publicación', 400);

    // ── Validate requester ────────────────────────────────────
    const { rows: [usr] } = await client.query(
      'SELECT creditos_disponibles, fecha_bloqueo_hasta FROM usuarios WHERE id = $1',
      [usuarioId]
    );
    if (usr.fecha_bloqueo_hasta && new Date(usr.fecha_bloqueo_hasta) > new Date()) {
      throw new AppError('Tu cuenta está bloqueada temporalmente', 403);
    }
    if (usr.creditos_disponibles < (pub.creditos_hora || 1)) {
      throw new AppError('Créditos insuficientes para solicitar este servicio', 400);
    }

    // ── Check no active pending solicitud ─────────────────────
    const { rows: [existing] } = await client.query(
      `SELECT id FROM solicitud_interes
       WHERE publicacion_id = $1 AND usuario_id = $2 AND estado = 'PENDIENTE'`,
      [publicacion_id, usuarioId]
    );
    if (existing) throw new AppError('Ya tenés una solicitud pendiente para esta publicación', 409);

    // ── Create solicitud ──────────────────────────────────────
    const { rows: [solicitud] } = await client.query(
      `INSERT INTO solicitud_interes (publicacion_id, usuario_id, mensaje, fecha_propuesta)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [publicacion_id, usuarioId, mensaje || null, fecha_propuesta || null]
    );

    // ── Notify publication owner ──────────────────────────────
    await notif.crearNotificacion(client, {
      usuarioId: pub.usuario_id,
      titulo: '📬 Nueva solicitud de servicio',
      mensaje: `Tienes una nueva solicitud para tu publicación "${pub.titulo}"`,
    });

    return solicitud;
  });
};

const listarRecibidas = async (usuarioId) => {
  const { rows } = await pool.query(
    `SELECT si.*,
            p.titulo AS publicacion_titulo,
            u.nombre, u.apellido, u.promedio_valoracion
     FROM solicitud_interes si
     JOIN publicaciones p ON p.id = si.publicacion_id
     JOIN usuarios      u ON u.id = si.usuario_id
     WHERE p.usuario_id = $1
     ORDER BY si.created_at DESC`,
    [usuarioId]
  );
  return rows;
};

const listarEnviadas = async (usuarioId) => {
  const { rows } = await pool.query(
    `SELECT si.*,
            p.titulo AS publicacion_titulo,
            u.nombre AS propietario_nombre, u.apellido AS propietario_apellido
     FROM solicitud_interes si
     JOIN publicaciones p ON p.id = si.publicacion_id
     JOIN usuarios      u ON u.id = p.usuario_id
     WHERE si.usuario_id = $1
     ORDER BY si.created_at DESC`,
    [usuarioId]
  );
  return rows;
};

const aceptar = async (solicitudId, usuarioId) => {
  return withTransaction(async (client) => {
    const { rows: [solicitud] } = await client.query(
      `SELECT si.*, p.usuario_id AS pub_owner, p.titulo, p.creditos_hora
       FROM solicitud_interes si
       JOIN publicaciones p ON p.id = si.publicacion_id
       WHERE si.id = $1
       FOR UPDATE`,
      [solicitudId]
    );
    if (!solicitud)                        throw new AppError('Solicitud no encontrada', 404);
    if (solicitud.pub_owner !== usuarioId) throw new AppError('Sin permiso sobre esta solicitud', 403);
    if (solicitud.estado !== 'PENDIENTE')  throw new AppError('La solicitud ya fue procesada', 400);

    // Check no overlapping intercambio for same publicacion + same date range
    // (simple check — could be enhanced with time-slot collision detection)
    if (solicitud.fecha_propuesta) {
      const { rows: overlap } = await client.query(
        `SELECT id FROM intercambios
         WHERE publicacion_id = $1
           AND estado NOT IN ('CANCELADO')
           AND ABS(EXTRACT(EPOCH FROM (fecha_acordada - $2::timestamptz)) / 3600) < 2`,
        [solicitud.publicacion_id, solicitud.fecha_propuesta]
      );
      if (overlap.length) throw new AppError('Ya existe un intercambio en ese horario para esta publicación', 409);
    }

    // ── Update solicitud ──────────────────────────────────────
    await client.query(
      "UPDATE solicitud_interes SET estado = 'ACEPTADA' WHERE id = $1",
      [solicitudId]
    );

    // ── Create intercambio ────────────────────────────────────
    const { rows: [intercambio] } = await client.query(
      `INSERT INTO intercambios
         (fecha_acordada, creditos_acordados, publicacion_id, prestador_id, receptor_id, solicitud_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        solicitud.fecha_propuesta || new Date(),
        solicitud.creditos_hora || 1,
        solicitud.publicacion_id,
        usuarioId,            // publisher = prestador del servicio
        solicitud.usuario_id, // requester = receptor del servicio
        solicitudId,
      ]
    );

    // ── Notify requester ──────────────────────────────────────
    await notif.crearNotificacion(client, {
      usuarioId: solicitud.usuario_id,
      titulo: '✅ ¡Solicitud aceptada!',
      mensaje: `Tu solicitud para "${solicitud.titulo}" fue aceptada. Intercambio programado.`,
      intercambioId: intercambio.id,
    });

    return intercambio;
  });
};

const rechazar = async (solicitudId, usuarioId) => {
  return withTransaction(async (client) => {
    const { rows: [solicitud] } = await client.query(
      `SELECT si.*, p.usuario_id AS pub_owner, p.titulo
       FROM solicitud_interes si
       JOIN publicaciones p ON p.id = si.publicacion_id
       WHERE si.id = $1`,
      [solicitudId]
    );
    if (!solicitud)                        throw new AppError('Solicitud no encontrada', 404);
    if (solicitud.pub_owner !== usuarioId) throw new AppError('Sin permiso sobre esta solicitud', 403);
    if (solicitud.estado !== 'PENDIENTE')  throw new AppError('La solicitud ya fue procesada', 400);

    await client.query(
      "UPDATE solicitud_interes SET estado = 'RECHAZADA' WHERE id = $1",
      [solicitudId]
    );

    await notif.crearNotificacion(client, {
      usuarioId: solicitud.usuario_id,
      titulo: '❌ Solicitud rechazada',
      mensaje: `Tu solicitud para "${solicitud.titulo}" fue rechazada.`,
    });

    return { message: 'Solicitud rechazada correctamente' };
  });
};

const cancelar = async (solicitudId, usuarioId) => {
  const { rows: [solicitud] } = await pool.query(
    `SELECT id, usuario_id, estado FROM solicitud_interes WHERE id = $1`,
    [solicitudId]
  );
  if (!solicitud)                          throw new AppError('Solicitud no encontrada', 404);
  if (solicitud.usuario_id !== usuarioId)  throw new AppError('No tenés permiso sobre esta solicitud', 403);
  if (solicitud.estado !== 'PENDIENTE')    throw new AppError('Solo podés descartar solicitudes pendientes', 400);

  await pool.query(
    "UPDATE solicitud_interes SET estado = 'CANCELADA' WHERE id = $1",
    [solicitudId]
  );
  return { message: 'Solicitud descartada correctamente' };
};

const actualizar = async (solicitudId, usuarioId, { fecha_propuesta, mensaje }) => {
  const { rows: [solicitud] } = await pool.query(
    'SELECT id, usuario_id, estado FROM solicitud_interes WHERE id = $1',
    [solicitudId]
  );
  if (!solicitud)                          throw new AppError('Solicitud no encontrada', 404);
  if (solicitud.usuario_id !== usuarioId)  throw new AppError('No tenés permiso sobre esta solicitud', 403);
  if (solicitud.estado !== 'PENDIENTE')    throw new AppError('Solo podés modificar solicitudes pendientes', 400);

  const { rows: [updated] } = await pool.query(
    `UPDATE solicitud_interes
     SET fecha_propuesta = COALESCE($1, fecha_propuesta),
         mensaje         = COALESCE($2, mensaje)
     WHERE id = $3
     RETURNING *`,
    [fecha_propuesta || null, mensaje !== undefined ? mensaje : null, solicitudId]
  );
  return updated;
};

module.exports = { crear, listarRecibidas, listarEnviadas, aceptar, rechazar, cancelar, actualizar };
