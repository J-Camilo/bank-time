// src/controllers/solicitudes.controller.js
const svc = require('../services/solicitudes.service');

const crear          = async (req, res, next) => { try { res.status(201).json(await svc.crear(req.user.id, req.body)); } catch (e) { next(e); } };
const listarRecibidas= async (req, res, next) => { try { res.json(await svc.listarRecibidas(req.user.id)); } catch (e) { next(e); } };
const listarEnviadas = async (req, res, next) => { try { res.json(await svc.listarEnviadas(req.user.id)); } catch (e) { next(e); } };
const aceptar        = async (req, res, next) => { try { res.status(201).json(await svc.aceptar(parseInt(req.params.id), req.user.id)); } catch (e) { next(e); } };
const rechazar       = async (req, res, next) => { try { res.json(await svc.rechazar(parseInt(req.params.id), req.user.id)); } catch (e) { next(e); } };
const cancelar       = async (req, res, next) => { try { res.json(await svc.cancelar(parseInt(req.params.id), req.user.id)); } catch (e) { next(e); } };
const actualizar     = async (req, res, next) => { try { res.json(await svc.actualizar(parseInt(req.params.id), req.user.id, req.body)); } catch (e) { next(e); } };

module.exports = { crear, listarRecibidas, listarEnviadas, aceptar, rechazar, cancelar, actualizar };
