const { pool } = require('../config/db');

const listar = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM categorias ORDER BY nombre');
    res.json(rows);
  } catch (e) { next(e); }
};

// TODO: crear, actualizar, eliminar — solo admin — ver TODO.md

module.exports = { listar };
