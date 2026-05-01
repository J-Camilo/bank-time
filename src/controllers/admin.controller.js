const svc = require('../services/admin.service');

const listarUsuarios = async (req, res, next) => {
  try {
    const data = await svc.listarUsuarios(req.query);
    res.json(data);
  } catch (e) { next(e); }
};

const toggleActivar = async (req, res, next) => {
  try {
    const data = await svc.toggleActivar(parseInt(req.params.id), req.body.activo);
    res.json(data);
  } catch (e) { next(e); }
};

const listarPublicaciones = async (req, res, next) => {
  try {
    const data = await svc.listarPublicaciones(req.query);
    res.json(data);
  } catch (e) { next(e); }
};

const eliminarPublicacion = async (req, res, next) => {
  try {
    await svc.eliminarPublicacion(parseInt(req.params.id));
    res.status(204).send();
  } catch (e) { next(e); }
};

const getStats = async (req, res, next) => {
  try {
    const data = await svc.getStats();
    res.json(data);
  } catch (e) { next(e); }
};

module.exports = { listarUsuarios, toggleActivar, listarPublicaciones, eliminarPublicacion, getStats };
