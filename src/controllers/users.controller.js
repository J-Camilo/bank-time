const usersService = require('../services/users.service');

const getProfile = async (req, res, next) => {
  try {
    const user = await usersService.getProfile(req.user.id);
    res.json(user);
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await usersService.updateProfile(req.user.id, req.body);
    res.json(user);
  } catch (err) { next(err); }
};

const getCreditos = async (req, res, next) => {
  try {
    const data = await usersService.getCreditos(req.user.id);
    res.json(data);
  } catch (err) { next(err); }
};

const getHistorial = async (req, res, next) => {
  try {
    const data = await usersService.getHistorial(req.user.id, req.query);
    res.json(data);
  } catch (err) { next(err); }
};

module.exports = { getProfile, updateProfile, getCreditos, getHistorial };
