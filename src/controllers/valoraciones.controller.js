const svc = require('../services/valoraciones.service');

const crear = async (req, res, next) => {
  try {
    const valoracion = await svc.crear(req.user.id, req.body);
    res.status(201).json(valoracion);
  } catch (e) { next(e); }
};

const listarPorUsuario = async (req, res, next) => {
  try {
    const data = await svc.listarPorUsuario(parseInt(req.params.id));
    res.json(data);
  } catch (e) { next(e); }
};

module.exports = { crear, listarPorUsuario };
