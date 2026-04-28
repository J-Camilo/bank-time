// src/controllers/notificaciones.controller.js
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

// TODO: marcarTodasLeidas → ver TODO.md

module.exports = { listar, marcarLeida };
