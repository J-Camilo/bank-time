const { pool, withTransaction } = require('../config/db');
const { AppError }              = require('../middlewares/errorHandler');
const creditos                  = require('./creditos.service');
const notif                     = require('./notificaciones.service');

const BASE_SELECT = `
  SELECT
    i.*,
    p.titulo  AS publicacion_titulo,
    prest.nombre AS prestador_nombre, prest.apellido AS prestador_apellido,
    rec.nombre   AS receptor_nombre,  rec.apellido   AS receptor_apellido
  FROM intercambios i
  JOIN publicaciones p    ON p.id    = i.publicacion_id
  JOIN usuarios      prest ON prest.id = i.prestador_id
  JOIN usuarios      rec   ON rec.id   = i.receptor_id
`;

const findById = async (id, usuarioId) => {
  const { rows: [i] } = await pool.query(
    `${BASE_SELECT} WHERE i.id = $1`,
    [id]
  );
  if (!i) throw new AppError('Intercambio no encontrado', 404);
  if (i.prestador_id !== usuarioId && i.receptor_id !== usuarioId) {
    throw new AppError('Sin acceso a este intercambio', 403);
  }
  return i;
};

const listarMios = async (usuarioId, { estado } = {}) => {
  const params = [usuarioId];
  let filter = '';
  if (estado) {
    params.push(estado.toUpperCase());
    filter = `AND i.estado = $${params.length}`;
  }

  const { rows } = await pool.query(
    `${BASE_SELECT}
     WHERE (i.prestador_id = $1 OR i.receptor_id = $1)
     ${filter}
     ORDER BY i.fecha_acordada DESC`,
    params
  );
  return rows;
};

/**
 * Confirma la participación del usuario autenticado en el intercambio.
 *
 * Flujo de estados:
 *   EN_ESPERA → (primer confirm) → EN_CURSO → (segundo confirm) → COMPLETADO
 *
 * Al COMPLETADO: liquida créditos y guarda historial.
 */
const confirmar = async (intercambioId, usuarioId) => {
  return withTransaction(async (client) => {
    const { rows: [i] } = await client.query(
      'SELECT * FROM intercambios WHERE id = $1 FOR UPDATE',
      [intercambioId]
    );
    if (!i) throw new AppError('Intercambio no encontrado', 404);
    if (i.estado === 'COMPLETADO') throw new AppError('El intercambio ya está completado', 400);
    if (i.estado === 'CANCELADO')  throw new AppError('El intercambio está cancelado', 400);

    const esPrestador = i.prestador_id === usuarioId;
    const esReceptor  = i.receptor_id  === usuarioId;
    if (!esPrestador && !esReceptor) throw new AppError('Sin permiso para confirmar este intercambio', 403);

    const campo = esPrestador ? 'confirmacion_prestador' : 'confirmacion_receptor';
    if (i[campo]) throw new AppError('Ya confirmaste tu participación en este intercambio', 400);

    // Determine new estado: first confirmation → EN_CURSO, second → COMPLETADO (via trigger or here)
    const otraConfirmacion = esPrestador ? i.confirmacion_receptor : i.confirmacion_prestador;
    const nuevoEstado = otraConfirmacion ? 'COMPLETADO' : 'EN_CURSO';

    const { rows: [updated] } = await client.query(
      `UPDATE intercambios
       SET ${campo} = TRUE, estado = $1
       WHERE id = $2
       RETURNING *`,
      [nuevoEstado, intercambioId]
    );

    // ── If now COMPLETADO, liquidate credits ──────────────────
    if (nuevoEstado === 'COMPLETADO') {
      await creditos.liquidarIntercambio(client, intercambioId);

      await notif.crearNotificacion(client, {
        usuarioId: i.prestador_id,
        titulo: '🎉 Intercambio completado',
        mensaje: `El intercambio #${intercambioId} fue completado. Se añadieron créditos a tu cuenta.`,
        intercambioId,
      });
      await notif.crearNotificacion(client, {
        usuarioId: i.receptor_id,
        titulo: '🎉 Intercambio completado',
        mensaje: `El intercambio #${intercambioId} fue completado. Se descontaron créditos de tu cuenta.`,
        intercambioId,
      });
    }

    return updated;
  });
};

/**
 * Cancela un intercambio y aplica penalización si la cancelación
 * ocurre dentro de los 3 días previos a la fecha acordada.
 *
 * Reglas de negocio:
 *   - Penalización = CEIL(creditos_acordados × 10%)
 *   - 3 cancelaciones tardías → bloqueo de 3 días
 */
const cancelar = async (intercambioId, usuarioId) => {
  return withTransaction(async (client) => {
    const { rows: [i] } = await client.query(
      'SELECT * FROM intercambios WHERE id = $1 FOR UPDATE',
      [intercambioId]
    );
    if (!i) throw new AppError('Intercambio no encontrado', 404);
    if (i.estado === 'COMPLETADO') throw new AppError('No se puede cancelar un intercambio completado', 400);
    if (i.estado === 'CANCELADO')  throw new AppError('El intercambio ya está cancelado', 400);

    const esParte = i.prestador_id === usuarioId || i.receptor_id === usuarioId;
    if (!esParte) throw new AppError('Sin permiso para cancelar este intercambio', 403);

    // ── Cancel ────────────────────────────────────────────────
    await client.query(
      `UPDATE intercambios
       SET estado = 'CANCELADO', fecha_cancelacion = NOW()
       WHERE id = $1`,
      [intercambioId]
    );

    // ── Historial ─────────────────────────────────────────────
    await client.query(
      `INSERT INTO historial_intercambio (estado_final, intercambio_id)
       VALUES ('CANCELADO', $1)
       ON CONFLICT (intercambio_id) DO NOTHING`,
      [intercambioId]
    );

    // ── Penalty logic ─────────────────────────────────────────
    const { aplicoPenalizacion, penalizacion, bloqueado } =
      await creditos.aplicarPenalizacionSiCorresponde(client, {
        usuarioId,
        intercambioId,
        fechaAcordada:    i.fecha_acordada,
        creditosAcordados: i.creditos_acordados,
      });

    // ── Notify the other party ────────────────────────────────
    const otroId = i.prestador_id === usuarioId ? i.receptor_id : i.prestador_id;
    await notif.crearNotificacion(client, {
      usuarioId: otroId,
      titulo: '❌ Intercambio cancelado',
      mensaje: `El intercambio #${intercambioId} fue cancelado por la otra parte.`,
      intercambioId,
    });

    if (bloqueado) {
      await notif.crearNotificacion(client, {
        usuarioId,
        titulo: '🚫 Cuenta bloqueada',
        mensaje: 'Tu cuenta ha sido bloqueada 3 días por acumular 3 cancelaciones tardías.',
      });
    }

    return { cancelado: true, aplicoPenalizacion, penalizacion, bloqueado };
  });
};

module.exports = { findById, listarMios, confirmar, cancelar };
