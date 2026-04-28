const pubService   = require('../services/publicaciones.service');
const matchService = require('../services/match.service');

const create = async (req, res, next) => {
  try {
    const pub = await pubService.create(req.user.id, req.body);
    res.status(201).json(pub);
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const result = await pubService.findAll(req.query);
    res.json(result);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const pub = await pubService.findById(parseInt(req.params.id));
    res.json(pub);
  } catch (err) { next(err); }
};

const getMine = async (req, res, next) => {
  try {
    const pubs = await pubService.findByUser(req.user.id, {
      includeExpired: req.query.expired === 'true',
    });
    res.json(pubs);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const pub = await pubService.update(parseInt(req.params.id), req.user.id, req.body);
    res.json(pub);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await pubService.remove(parseInt(req.params.id), req.user.id);
    res.status(204).send();
  } catch (err) { next(err); }
};

const getMatches = async (req, res, next) => {
  try {
    const matches = await matchService.findByPublicacion(parseInt(req.params.id), req.user.id);
    res.json(matches);
  } catch (err) { next(err); }
};

module.exports = { create, list, getById, getMine, update, remove, getMatches };
