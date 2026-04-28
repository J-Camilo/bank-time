// src/routes/notificaciones.routes.js
const router = require('express').Router();
const auth   = require('../middlewares/auth.middleware');
const ctrl   = require('../controllers/notificaciones.controller');

router.use(auth);
router.get('/',            ctrl.listar);       // ?no_leidas=true para filtrar
router.patch('/:id/leer',  ctrl.marcarLeida);
// TODO: router.patch('/leer-todas', ctrl.marcarTodasLeidas); → ver TODO.md

module.exports = router;
