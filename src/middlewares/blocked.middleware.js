/**
 * Bloquea usuarios con fecha_bloqueo_hasta en el futuro.
 * Aplicar DESPUÉS de authMiddleware en rutas que requieran cuenta activa (publicar, solicitar, etc.).
 */
const blockedMiddleware = (req, res, next) => {
  const { fecha_bloqueo_hasta } = req.user;
  if (fecha_bloqueo_hasta && new Date(fecha_bloqueo_hasta) > new Date()) {
    return res.status(403).json({
      error: 'Cuenta bloqueada temporalmente por cancelaciones acumuladas',
      bloqueado_hasta: fecha_bloqueo_hasta,
      code: 'USER_BLOCKED',
    });
  }
  next();
};

module.exports = blockedMiddleware;
