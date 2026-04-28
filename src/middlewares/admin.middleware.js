/**
 * Requiere que req.user.es_admin sea true.
 * Aplicar DESPUÉS de authMiddleware.
 */
const adminMiddleware = (req, res, next) => {
  if (!req.user?.es_admin) {
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }
  next();
};

module.exports = adminMiddleware;
