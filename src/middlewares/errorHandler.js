/**
 * Error personalizado de la aplicación.
 * Usar en services/controllers: throw new AppError('mensaje', 400)
 */
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware global de manejo de errores.
 * Mapea errores de Postgres y errores propios a respuestas HTTP consistentes.
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} →`, err.message);

  // ── Postgres constraint violations ───────────────────────
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Registro duplicado', detail: err.detail });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referencia inválida', detail: err.detail });
  }
  if (err.code === '23514') {
    return res.status(400).json({ error: 'Violación de restricción de datos', detail: err.detail });
  }

  // ── App errors ───────────────────────────────────────────
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // ── Unexpected error ─────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
  res.status(500).json({ error: 'Error interno del servidor' });
};

module.exports = errorHandler;
module.exports.AppError = AppError;
