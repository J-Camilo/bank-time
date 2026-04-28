// src/controllers/auth.controller.js
const authService = require('../services/auth.service');
const { validationResult } = require('express-validator');

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const user = await authService.register(req.body);
    res.status(201).json({ message: 'Usuario registrado exitosamente', user });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken requerido' });
    const tokens = authService.refreshTokens(refreshToken);
    res.json(tokens);
  } catch (err) { next(err); }
};

const logout = (req, res) => {
  // Stateless JWT: the client deletes its tokens.
  // Para implementar blacklist real → ver TODO.md sección "Auth avanzado"
  res.json({ message: 'Sesión cerrada. Elimina los tokens del lado del cliente.' });
};

module.exports = { register, login, refresh, logout };
