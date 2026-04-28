const { pool } = require('../config/db');

/**
 * Crea una notificación interna para un usuario.
 * Puede recibir un cliente de transacción (client) o usar el pool directamente.
 *
 * @param {import('pg').PoolClient|null} client
 * @param {{ usuarioId, titulo, mensaje, intercambioId? }} opts
 */
const crearNotificacion = async (client, { usuarioId, titulo, mensaje, intercambioId = null }) => {
  const db = client || pool;
  await db.query(
    `INSERT INTO notificaciones (usuario_id, titulo, mensaje, intercambio_id)
     VALUES ($1, $2, $3, $4)`,
    [usuarioId, titulo, mensaje, intercambioId]
  );
};

/**
 * Lista las últimas 50 notificaciones de un usuario.
 * @param {boolean} soloNoLeidas - si true, filtra solo las no leídas
 */
const listarPorUsuario = async (usuarioId, { soloNoLeidas = false } = {}) => {
  const { rows } = await pool.query(
    `SELECT * FROM notificaciones
     WHERE usuario_id = $1
     ${soloNoLeidas ? 'AND leida = FALSE' : ''}
     ORDER BY created_at DESC
     LIMIT 50`,
    [usuarioId]
  );
  return rows;
};

/**
 * Marca una notificación como leída (solo si pertenece al usuario).
 * @returns {boolean} true si se actualizó, false si no se encontró
 */
const marcarLeida = async (notificacionId, usuarioId) => {
  const { rowCount } = await pool.query(
    'UPDATE notificaciones SET leida = TRUE WHERE id = $1 AND usuario_id = $2',
    [notificacionId, usuarioId]
  );
  return rowCount > 0;
};

// ─────────────────────────────────────────────────────────────
// TODO: marcarTodasLeidas
// Ver instrucciones en TODO.md → sección "Notificaciones"
// ─────────────────────────────────────────────────────────────

module.exports = { crearNotificacion, listarPorUsuario, marcarLeida };
