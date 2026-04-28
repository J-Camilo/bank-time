const router = require('express').Router();
const ctrl   = require('../controllers/categorias.controller');

router.get('/', ctrl.listar);
// TODO: POST / → crear categoría (admin) → ver TODO.md
// TODO: PUT /:id → editar categoría (admin) → ver TODO.md
// TODO: DELETE /:id → eliminar categoría (admin) → ver TODO.md

module.exports = router;
