const { pool } = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');

const DIAS_PENALIZACION  = 3;  // cancelar dentro de estos días → penalización
const PORCENTAJE_PENAL   = 0.10;
const MAX_CANCELACIONES  = 3;
const DIAS_BLOQUEO       = 3;
const CREDITOS_INICIALES = 8;

/**
 * Inserta un movimiento de crédito. Siempre dentro de una transacción existente.
 * La cantidad es SIEMPRE positiva; el tipo define si es ingreso o egreso.
 *
 * @param {import('pg').PoolClient} client  - cliente de transacción activa
 * @param {{ usuarioId, tipo, cantidad, descripcion, intercambioId? }} opts
 */
const registrarMovimiento = async (client, { usuarioId, tipo, cantidad, descripcion, intercambioId = null }) => {
  await client.query(
    `INSERT INTO movimientos_credito (tipo, cantidad, descripcion, usuario_id, intercambio_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [tipo, cantidad, descripcion, usuarioId, intercambioId]
  );
};

/**
 * Asigna los 8 créditos iniciales al registrarse.
 * El DEFAULT de la columna ya los pone en la DB; aquí solo dejamos el movimiento auditado.
 */
const asignarCreditosIniciales = async (client, usuarioId) => {
  await registrarMovimiento(client, {
    usuarioId,
    tipo: 'ASIGNACION_INICIAL',
    cantidad: CREDITOS_INICIALES,
    descripcion: 'Créditos de bienvenida al registrarse',
  });
};

/**
 * Liquida un intercambio COMPLETADO:
 *   - Suma créditos al prestador
 *   - Descuenta créditos al receptor
 *   - Registra ambos movimientos
 *   - Guarda en historial_intercambio
 *
 * Debe llamarse dentro de una transacción existente (client).
 */
const liquidarIntercambio = async (client, intercambioId) => {
  const { rows: [intercambio] } = await client.query(
    'SELECT creditos_acordados, prestador_id, receptor_id FROM intercambios WHERE id = $1',
    [intercambioId]
  );
  if (!intercambio) throw new AppError('Intercambio no encontrado al liquidar', 404);

  const { creditos_acordados, prestador_id, receptor_id } = intercambio;

  // ── Prestador: gana créditos ──────────────────────────────
  await client.query(
    'UPDATE usuarios SET creditos_disponibles = creditos_disponibles + $1 WHERE id = $2',
    [creditos_acordados, prestador_id]
  );
  await registrarMovimiento(client, {
    usuarioId: prestador_id,
    tipo: 'GANANCIA',
    cantidad: creditos_acordados,
    descripcion: `Servicio prestado — intercambio #${intercambioId}`,
    intercambioId,
  });

  // ── Receptor: consume créditos (nunca baja de 0) ──────────
  await client.query(
    'UPDATE usuarios SET creditos_disponibles = GREATEST(0, creditos_disponibles - $1) WHERE id = $2',
    [creditos_acordados, receptor_id]
  );
  await registrarMovimiento(client, {
    usuarioId: receptor_id,
    tipo: 'CONSUMO',
    cantidad: creditos_acordados,
    descripcion: `Servicio recibido — intercambio #${intercambioId}`,
    intercambioId,
  });

  // ── Historial inmutable ───────────────────────────────────
  await client.query(
    `INSERT INTO historial_intercambio (estado_final, intercambio_id)
     VALUES ($1, $2)
     ON CONFLICT (intercambio_id) DO NOTHING`,
    ['COMPLETADO', intercambioId]
  );
};

/**
 * Aplica penalización por cancelación tardía (dentro de DIAS_PENALIZACION días).
 * También gestiona el contador de cancelaciones y el bloqueo temporal.
 * Debe llamarse dentro de una transacción existente (client).
 *
 * @returns {{ aplicoPenalizacion: boolean, penalizacion: number, bloqueado: boolean }}
 */
const aplicarPenalizacionSiCorresponde = async (client, { usuarioId, intercambioId, fechaAcordada, creditosAcordados }) => {
  const ahora = new Date();
  const diasRestantes = (new Date(fechaAcordada) - ahora) / (1000 * 60 * 60 * 24);

  // Solo penaliza si cancela dentro del plazo y el servicio aún no pasó
  if (diasRestantes >= DIAS_PENALIZACION || diasRestantes < 0) {
    return { aplicoPenalizacion: false, penalizacion: 0, bloqueado: false };
  }

  const penalizacion = Math.ceil(creditosAcordados * PORCENTAJE_PENAL);

  // Descontar penalización
  await client.query(
    'UPDATE usuarios SET creditos_disponibles = GREATEST(0, creditos_disponibles - $1) WHERE id = $2',
    [penalizacion, usuarioId]
  );

  await registrarMovimiento(client, {
    usuarioId,
    tipo: 'PENALIZACION',
    cantidad: penalizacion,
    descripcion: `Cancelación tardía — intercambio #${intercambioId}`,
    intercambioId,
  });

  // Incrementar contador de cancelaciones
  const { rows: [{ cancelaciones_acumuladas }] } = await client.query(
    `UPDATE usuarios
     SET cancelaciones_acumuladas = cancelaciones_acumuladas + 1
     WHERE id = $1
     RETURNING cancelaciones_acumuladas`,
    [usuarioId]
  );

  // Bloquear si alcanzó el máximo
  let bloqueado = false;
  if (cancelaciones_acumuladas >= MAX_CANCELACIONES) {
    const bloqueadoHasta = new Date();
    bloqueadoHasta.setDate(bloqueadoHasta.getDate() + DIAS_BLOQUEO);

    await client.query(
      `UPDATE usuarios
       SET fecha_bloqueo_hasta = $1, cancelaciones_acumuladas = 0
       WHERE id = $2`,
      [bloqueadoHasta, usuarioId]
    );
    bloqueado = true;
  }

  return { aplicoPenalizacion: true, penalizacion, bloqueado };
};

module.exports = {
  registrarMovimiento,
  asignarCreditosIniciales,
  liquidarIntercambio,
  aplicarPenalizacionSiCorresponde,
  CREDITOS_INICIALES,
};
