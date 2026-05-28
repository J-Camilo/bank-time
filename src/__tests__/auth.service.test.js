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

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

jest.mock('../services/creditos.service', () => ({
  asignarCreditosIniciales: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, withTransaction } = require('../config/db');
const { asignarCreditosIniciales } = require('../services/creditos.service');
const { register, login, refreshTokens } = require('../services/auth.service');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const mockClient = { query: jest.fn() };

const validUserRow = {
  id: 1,
  nombre: 'Juan',
  apellido: 'López',
  correo: 'juan@example.com',
  contrasena: 'hashed_password',
  es_admin: false,
  activo: true,
  creditos_disponibles: 8,
};

// ─────────────────────────────────────────────────────────────────────────────
// register
// ─────────────────────────────────────────────────────────────────────────────

describe('register', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // withTransaction ejecuta el callback con el mockClient
    withTransaction.mockImplementation((cb) => cb(mockClient));

    // bcrypt.hash devuelve un hash falso
    bcrypt.hash.mockResolvedValue('hashed_password');
  });

  it('registra un usuario nuevo y retorna sus datos sin contraseña', async () => {
    const newUser = {
      id: 1,
      nombre: 'María',
      apellido: 'García',
      correo: 'maria@example.com',
      creditos_disponibles: 8,
      created_at: new Date().toISOString(),
    };

    // pool.query: verificar que no existe el correo → vacío
    pool.query.mockResolvedValueOnce({ rows: [] });

    // client.query dentro de la transacción: INSERT usuario
    mockClient.query.mockResolvedValueOnce({ rows: [newUser] });

    // asignarCreditosIniciales es un mock que no hace nada
    asignarCreditosIniciales.mockResolvedValue(undefined);

    const result = await register({
      nombre: 'María',
      apellido: 'García',
      correo: 'maria@example.com',
      contrasena: 'secret123',
    });

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][1]).toEqual(['maria@example.com']);

    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 12);

    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(mockClient.query).toHaveBeenCalledTimes(1);
    expect(mockClient.query.mock.calls[0][0]).toMatch(/INSERT INTO usuarios/);

    expect(asignarCreditosIniciales).toHaveBeenCalledWith(mockClient, newUser.id);

    expect(result).toEqual(newUser);
  });

  it('lanza AppError 409 si el correo ya está registrado', async () => {
    // pool.query: correo ya existe
    pool.query.mockResolvedValueOnce({ rows: [{ id: 99 }] });

    await expect(
      register({
        nombre: 'Otro',
        apellido: 'Usuario',
        correo: 'existente@example.com',
        contrasena: 'pass',
      })
    ).rejects.toMatchObject({
      message: 'El correo ya está registrado',
      statusCode: 409,
    });

    expect(withTransaction).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// login
// ─────────────────────────────────────────────────────────────────────────────

describe('login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna el usuario y tokens con credenciales correctas', async () => {
    pool.query.mockResolvedValueOnce({ rows: [validUserRow] });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign
      .mockReturnValueOnce('access_token_mock')
      .mockReturnValueOnce('refresh_token_mock');

    const result = await login({ correo: 'juan@example.com', contrasena: 'correct' });

    expect(pool.query.mock.calls[0][1]).toEqual(['juan@example.com']);
    expect(bcrypt.compare).toHaveBeenCalledWith('correct', 'hashed_password');

    // La contraseña no debe aparecer en la respuesta
    expect(result.user).not.toHaveProperty('contrasena');
    expect(result.user.correo).toBe('juan@example.com');

    expect(result.accessToken).toBe('access_token_mock');
    expect(result.refreshToken).toBe('refresh_token_mock');
  });

  it('lanza AppError 401 si el usuario no existe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      login({ correo: 'noexiste@example.com', contrasena: 'cualquiera' })
    ).rejects.toMatchObject({
      message: 'Credenciales inválidas',
      statusCode: 401,
    });

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('lanza AppError 401 con contraseña incorrecta', async () => {
    pool.query.mockResolvedValueOnce({ rows: [validUserRow] });
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      login({ correo: 'juan@example.com', contrasena: 'wrong' })
    ).rejects.toMatchObject({
      message: 'Credenciales inválidas',
      statusCode: 401,
    });
  });

  it('lanza AppError 403 si el usuario está inactivo', async () => {
    const inactiveUser = { ...validUserRow, activo: false };
    pool.query.mockResolvedValueOnce({ rows: [inactiveUser] });

    await expect(
      login({ correo: 'juan@example.com', contrasena: 'correct' })
    ).rejects.toMatchObject({
      message: 'Cuenta desactivada. Contacta al administrador.',
      statusCode: 403,
    });

    // Ni siquiera compara la contraseña si el usuario está inactivo
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refreshTokens
// ─────────────────────────────────────────────────────────────────────────────

describe('refreshTokens', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lanza AppError 401 con un refresh token inválido', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });

    expect(() => refreshTokens('token_invalido')).toThrow(
      expect.objectContaining({
        message: 'Refresh token inválido o expirado',
        statusCode: 401,
      })
    );
  });

  it('genera nuevos tokens con un refresh token válido', () => {
    const payload = { id: 1, es_admin: false };
    jwt.verify.mockReturnValue(payload);
    jwt.sign
      .mockReturnValueOnce('new_access_token')
      .mockReturnValueOnce('new_refresh_token');

    const result = refreshTokens('valid_refresh_token');

    expect(jwt.verify).toHaveBeenCalledWith('valid_refresh_token', process.env.JWT_REFRESH_SECRET);
    expect(result).toEqual({
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
    });
  });
});
