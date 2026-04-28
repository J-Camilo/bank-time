const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { pool, withTransaction } = require('../config/db');
const { asignarCreditosIniciales } = require('./creditos.service');
const { AppError } = require('../middlewares/errorHandler');

const SALT_ROUNDS = 12;

// ── Token generation ─────────────────────────────────────────
const generateTokens = (user) => {
  const payload = { id: user.id, es_admin: user.es_admin };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

  return { accessToken, refreshToken };
};

// ── Register ─────────────────────────────────────────────────
const register = async ({ nombre, apellido, correo, contrasena, departamento, municipio, direccion }) => {
  // Unique email check
  const { rows: existing } = await pool.query(
    'SELECT id FROM usuarios WHERE correo = $1',
    [correo]
  );
  if (existing.length) throw new AppError('El correo ya está registrado', 409);

  const hash = await bcrypt.hash(contrasena, SALT_ROUNDS);

  return withTransaction(async (client) => {
    const { rows: [user] } = await client.query(
      `INSERT INTO usuarios (nombre, apellido, correo, contrasena, departamento, municipio, direccion)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nombre, apellido, correo, creditos_disponibles, created_at`,
      [nombre, apellido, correo, hash, departamento || null, municipio || null, direccion || null]
    );

    // Audit credit assignment (DB already sets creditos_disponibles = 8 by default)
    await asignarCreditosIniciales(client, user.id);

    return user;
  });
};

// ── Login ─────────────────────────────────────────────────────
const login = async ({ correo, contrasena }) => {
  const { rows: [user] } = await pool.query(
    `SELECT id, nombre, apellido, correo, contrasena, es_admin, activo, creditos_disponibles
     FROM usuarios WHERE correo = $1`,
    [correo]
  );

  // Same error message for both "not found" and "wrong password" (prevents user enumeration)
  if (!user) throw new AppError('Credenciales inválidas', 401);
  if (!user.activo) throw new AppError('Cuenta desactivada. Contacta al administrador.', 403);

  const match = await bcrypt.compare(contrasena, user.contrasena);
  if (!match) throw new AppError('Credenciales inválidas', 401);

  const tokens = generateTokens(user);

  // Strip password hash from response
  const { contrasena: _, ...safeUser } = user;
  return { user: safeUser, ...tokens };
};

// ── Refresh ───────────────────────────────────────────────────
const refreshTokens = (refreshToken) => {
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    return generateTokens({ id: payload.id, es_admin: payload.es_admin });
  } catch {
    throw new AppError('Refresh token inválido o expirado', 401);
  }
};

module.exports = { register, login, refreshTokens };
