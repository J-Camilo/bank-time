const { pool } = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');

const listar = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM categorias ORDER BY nombre');
    res.json(rows);
  } catch (e) { next(e); }
};

const crear = async (req, res, next) => {
  try {
    const { nombre, icono } = req.body;
    const { rows: [cat] } = await pool.query(
      'INSERT INTO categorias (nombre, icono) VALUES ($1, $2) RETURNING *',
      [nombre, icono || null]
    );
    res.status(201).json(cat);
  } catch (e) { next(e); }
};

const actualizar = async (req, res, next) => {
  try {
    const { nombre, icono } = req.body;
    const { rows: [cat] } = await pool.query(
      'UPDATE categorias SET nombre = COALESCE($1, nombre), icono = COALESCE($2, icono) WHERE id = $3 RETURNING *',
      [nombre || null, icono || null, parseInt(req.params.id)]
    );
    if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(cat);
  } catch (e) { next(e); }
};

const eliminar = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { rows: activas } = await pool.query(
      "SELECT id FROM publicaciones WHERE categoria_id = $1 AND estado = 'ABIERTO'",
      [id]
    );
    if (activas.length) throw new AppError('No se puede eliminar: tiene publicaciones activas asociadas', 409);

    const { rowCount } = await pool.query('DELETE FROM categorias WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.status(204).send();
  } catch (e) { next(e); }
};

module.exports = { listar, crear, actualizar, eliminar };
