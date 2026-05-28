'use strict';

// errorHandler exporta: module.exports = errorHandler  y  module.exports.AppError = AppError
const errorHandler = require('../middlewares/errorHandler');
const { AppError } = require('../middlewares/errorHandler');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construye mocks mínimos de req/res para invocar el middleware directamente.
 */
const buildReqRes = () => {
  const req = { method: 'GET', path: '/test' };
  const res = {
    _status: null,
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
  };
  const next = jest.fn();
  return { req, res, next };
};

// ─────────────────────────────────────────────────────────────────────────────
// AppError
// ─────────────────────────────────────────────────────────────────────────────

describe('AppError', () => {
  it('asigna message y statusCode correctamente', () => {
    const err = new AppError('Recurso no encontrado', 404);
    expect(err.message).toBe('Recurso no encontrado');
    expect(err.statusCode).toBe(404);
  });

  it('es una instancia de Error', () => {
    const err = new AppError('error', 400);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('usa statusCode 400 como valor por defecto', () => {
    const err = new AppError('sin código');
    expect(err.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// errorHandler middleware — AppErrors
// ─────────────────────────────────────────────────────────────────────────────

describe('errorHandler middleware — AppError', () => {
  // Silenciar console.error durante los tests
  beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterAll(() => console.error.mockRestore());

  it('responde con el statusCode y message del AppError', () => {
    const { req, res, next } = buildReqRes();
    const err = new AppError('No autorizado', 401);

    errorHandler(err, req, res, next);

    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'No autorizado' });
  });

  it('responde 404 para un AppError con ese código', () => {
    const { req, res, next } = buildReqRes();
    const err = new AppError('No encontrado', 404);

    errorHandler(err, req, res, next);

    expect(res._status).toBe(404);
    expect(res._body).toEqual({ error: 'No encontrado' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// errorHandler middleware — Errores de Postgres
// ─────────────────────────────────────────────────────────────────────────────

describe('errorHandler middleware — errores de Postgres', () => {
  beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterAll(() => console.error.mockRestore());

  it('mapea error PG 23505 (unique violation) a 409', () => {
    const { req, res, next } = buildReqRes();
    const err = { code: '23505', message: 'duplicate key', detail: 'Key (correo)=(x) already exists.' };

    errorHandler(err, req, res, next);

    expect(res._status).toBe(409);
    expect(res._body).toMatchObject({ error: 'Registro duplicado' });
  });

  it('mapea error PG 23503 (foreign key violation) a 400', () => {
    const { req, res, next } = buildReqRes();
    const err = { code: '23503', message: 'fk violation', detail: 'Key is not present.' };

    errorHandler(err, req, res, next);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ error: 'Referencia inválida' });
  });

  it('mapea error PG 23514 (check violation) a 400', () => {
    const { req, res, next } = buildReqRes();
    const err = { code: '23514', message: 'check violation', detail: 'Constraint violated.' };

    errorHandler(err, req, res, next);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ error: 'Violación de restricción de datos' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// errorHandler middleware — Errores desconocidos
// ─────────────────────────────────────────────────────────────────────────────

describe('errorHandler middleware — errores desconocidos', () => {
  beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterAll(() => console.error.mockRestore());

  it('retorna 500 con mensaje genérico en producción', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const { req, res, next } = buildReqRes();
    const err = new Error('Algo explotó internamente');

    errorHandler(err, req, res, next);

    expect(res._status).toBe(500);
    expect(res._body).toEqual({ error: 'Error interno del servidor' });

    process.env.NODE_ENV = original;
  });

  it('retorna 500 con el mensaje real en desarrollo', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const { req, res, next } = buildReqRes();
    const err = new Error('Detalle del error en dev');

    errorHandler(err, req, res, next);

    expect(res._status).toBe(500);
    expect(res._body.error).toBe('Detalle del error en dev');
    // En dev también devuelve el stack
    expect(res._body).toHaveProperty('stack');

    process.env.NODE_ENV = original;
  });
});
