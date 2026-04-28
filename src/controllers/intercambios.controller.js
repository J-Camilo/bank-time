const svc = require('../services/intercambios.service');

const getById    = async (req, res, next) => { try { res.json(await svc.findById(parseInt(req.params.id), req.user.id)); } catch (e) { next(e); } };
const listarMios = async (req, res, next) => { try { res.json(await svc.listarMios(req.user.id, req.query)); } catch (e) { next(e); } };
const confirmar  = async (req, res, next) => { try { res.json(await svc.confirmar(parseInt(req.params.id), req.user.id)); } catch (e) { next(e); } };
const cancelar   = async (req, res, next) => { try { res.json(await svc.cancelar(parseInt(req.params.id), req.user.id)); } catch (e) { next(e); } };

module.exports = { getById, listarMios, confirmar, cancelar };
