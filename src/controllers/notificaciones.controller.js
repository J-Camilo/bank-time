const svc = require('../services/notificaciones.service');

const listar = async (req, res, next) => {
  try {
    const data = await svc.listarPorUsuario(req.user.id, { soloNoLeidas: req.query.no_leidas === 'true' });
    res.json(data);
  } catch (e) { next(e); }
};

const marcarLeida = async (req, res, next) => {
  try {
    const ok = await svc.marcarLeida(parseInt(req.params.id), req.user.id);
    if (!ok) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json({ message: 'Marcada como leída' });
  } catch (e) { next(e); }
};

const marcarTodasLeidas = async (req, res, next) => {
  try {
    await svc.marcarTodasLeidas(req.user.id);
    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (e) { next(e); }
};

module.exports = { listar, marcarLeida, marcarTodasLeidas };
