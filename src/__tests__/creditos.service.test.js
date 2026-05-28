'use strict';

jest.mock('../config/db', () => ({
  pool: { query: jest.fn() },
  withTransaction: jest.fn(),
}));

jest.mock('../middlewares/errorHandler', () => ({
  AppError: class AppError extends Error {
    constructor(msg, status) {
      super(msg);
      this.statusCode = status;
    }
  },
}));

const { pool, withTransaction } = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');
const {
  liquidarIntercambio,
  aplicarPenalizacionSiCorresponde,
  asignarCreditosIniciales,
  CREDITOS_INICIALES,
} = require('../services/creditos.service');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea un mockClient con query que devuelve respuestas en orden (cola FIFO).
 * Cada llamada consume el siguiente elemento del array responses.
 * Si se acaban los elementos, devuelve { rows: [] }.
 */
const buildClient = (responses = []) => {
  let callCount = 0;
  return {
    query: jest.fn(() => {
      const result = responses[callCount] ?? { rows: [] };
      callCount++;
      return Promise.resolve(result);
    }),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// liquidarIntercambio
// ─────────────────────────────────────────────────────────────────────────────

describe('liquidarIntercambio', () => {
  afterEach(() => jest.clearAllMocks());

  it('transfiere créditos correctamente cuando el intercambio existe', async () => {
    const intercambio = { creditos_acordados: 5, prestador_id: 1, receptor_id: 2 };

    const mockClient = buildClient([
      // 1. SELECT intercambio
      { rows: [intercambio] },
      // 2. UPDATE prestador creditos
      { rows: [] },
      // 3. INSERT movimiento prestador (registrarMovimiento)
      { rows: [] },
      // 4. UPDATE receptor creditos
      { rows: [] },
      // 5. INSERT movimiento receptor (registrarMovimiento)
      { rows: [] },
      // 6. INSERT historial_intercambio
      { rows: [] },
    ]);

    await liquidarIntercambio(mockClient, 42);

    expect(mockClient.query).toHaveBeenCalledTimes(6);

    // Primera llamada: SELECT intercambio
    expect(mockClient.query.mock.calls[0][1]).toEqual([42]);

    // Segunda llamada: UPDATE prestador — suma créditos
    expect(mockClient.query.mock.calls[1][0]).toMatch(/creditos_disponibles\s*=\s*creditos_disponibles\s*\+/);
    expect(mockClient.query.mock.calls[1][1]).toEqual([5, 1]);

    // Cuarta llamada: UPDATE receptor — resta créditos con GREATEST
    expect(mockClient.query.mock.calls[3][0]).toMatch(/GREATEST/);
    expect(mockClient.query.mock.calls[3][1]).toEqual([5, 2]);

    // Sexta llamada: INSERT historial con estado COMPLETADO
    expect(mockClient.query.mock.calls[5][0]).toMatch(/historial_intercambio/);
    expect(mockClient.query.mock.calls[5][1]).toEqual(['COMPLETADO', 42]);
  });

  it('lanza AppError 404 si el intercambio no existe', async () => {
    const mockClient = buildClient([
      // SELECT devuelve vacío → intercambio = undefined
      { rows: [] },
    ]);

    await expect(liquidarIntercambio(mockClient, 99)).rejects.toMatchObject({
      message: 'Intercambio no encontrado al liquidar',
      statusCode: 404,
    });

    expect(mockClient.query).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// aplicarPenalizacionSiCorresponde
// ─────────────────────────────────────────────────────────────────────────────

describe('aplicarPenalizacionSiCorresponde', () => {
  afterEach(() => jest.clearAllMocks());

  // Devuelve una fecha N días en el futuro desde ahora
  const fechaEn = (dias) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString();
  };

  it('no penaliza si la fecha acordada es 3 o más días en el futuro', async () => {
    const mockClient = buildClient([]);

    const resultado = await aplicarPenalizacionSiCorresponde(mockClient, {
      usuarioId: 1,
      intercambioId: 10,
      fechaAcordada: fechaEn(5),
      creditosAcordados: 10,
    });

    expect(resultado).toEqual({ aplicoPenalizacion: false, penalizacion: 0, bloqueado: false });
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  it('no penaliza si la fecha acordada ya pasó (diasRestantes < 0)', async () => {
    const mockClient = buildClient([]);

    const resultado = await aplicarPenalizacionSiCorresponde(mockClient, {
      usuarioId: 1,
      intercambioId: 10,
      fechaAcordada: fechaEn(-2),
      creditosAcordados: 10,
    });

    expect(resultado).toEqual({ aplicoPenalizacion: false, penalizacion: 0, bloqueado: false });
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  it('penaliza si la fecha acordada está dentro de los 3 días', async () => {
    const mockClient = buildClient([
      // 1. UPDATE descontar penalización
      { rows: [] },
      // 2. INSERT movimiento PENALIZACION (registrarMovimiento)
      { rows: [] },
      // 3. UPDATE contador RETURNING cancelaciones_acumuladas (1 — no llega a bloqueo)
      { rows: [{ cancelaciones_acumuladas: 1 }] },
    ]);

    const resultado = await aplicarPenalizacionSiCorresponde(mockClient, {
      usuarioId: 3,
      intercambioId: 20,
      fechaAcordada: fechaEn(1),
      creditosAcordados: 10,
    });

    // 10 * 0.10 = 1 → Math.ceil(1) = 1
    expect(resultado).toEqual({ aplicoPenalizacion: true, penalizacion: 1, bloqueado: false });
    expect(mockClient.query).toHaveBeenCalledTimes(3);

    // Primera query: descuento de penalización
    expect(mockClient.query.mock.calls[0][0]).toMatch(/GREATEST/);
    expect(mockClient.query.mock.calls[0][1]).toEqual([1, 3]);

    // Tercera query: incremento de cancelaciones
    expect(mockClient.query.mock.calls[2][0]).toMatch(/cancelaciones_acumuladas\s*=\s*cancelaciones_acumuladas\s*\+\s*1/);
  });

  it('bloquea al usuario cuando acumula 3 cancelaciones', async () => {
    const mockClient = buildClient([
      // 1. UPDATE descontar penalización
      { rows: [] },
      // 2. INSERT movimiento PENALIZACION
      { rows: [] },
      // 3. UPDATE contador RETURNING 3 (alcanza MAX_CANCELACIONES)
      { rows: [{ cancelaciones_acumuladas: 3 }] },
      // 4. UPDATE bloqueo temporal + reset cancelaciones
      { rows: [] },
    ]);

    const resultado = await aplicarPenalizacionSiCorresponde(mockClient, {
      usuarioId: 5,
      intercambioId: 30,
      fechaAcordada: fechaEn(2),
      creditosAcordados: 20,
    });

    expect(resultado.bloqueado).toBe(true);
    expect(resultado.aplicoPenalizacion).toBe(true);
    expect(mockClient.query).toHaveBeenCalledTimes(4);

    // Cuarta query: UPDATE bloqueo
    expect(mockClient.query.mock.calls[3][0]).toMatch(/fecha_bloqueo_hasta/);
    expect(mockClient.query.mock.calls[3][0]).toMatch(/cancelaciones_acumuladas\s*=\s*0/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// asignarCreditosIniciales
// ─────────────────────────────────────────────────────────────────────────────

describe('asignarCreditosIniciales', () => {
  afterEach(() => jest.clearAllMocks());

  it('inserta el movimiento de ASIGNACION_INICIAL con los créditos correctos', async () => {
    const mockClient = buildClient([{ rows: [] }]);

    await asignarCreditosIniciales(mockClient, 7);

    expect(mockClient.query).toHaveBeenCalledTimes(1);

    const [sql, params] = mockClient.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO movimientos_credito/);
    expect(params).toContain('ASIGNACION_INICIAL');
    expect(params).toContain(CREDITOS_INICIALES);
    expect(params).toContain(7);
  });

  it('usa CREDITOS_INICIALES = 8', () => {
    expect(CREDITOS_INICIALES).toBe(8);
  });
});
