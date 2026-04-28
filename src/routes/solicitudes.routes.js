// src/routes/solicitudes.routes.js
const router  = require('express').Router();
const { body }= require('express-validator');
const auth    = require('../middlewares/auth.middleware');
const blocked = require('../middlewares/blocked.middleware');
const ctrl    = require('../controllers/solicitudes.controller');

router.use(auth);

router.get('/recibidas',      ctrl.listarRecibidas);
router.get('/enviadas',       ctrl.listarEnviadas);
router.post('/', blocked, [
  body('publicacion_id').isInt({ min: 1 }).withMessage('publicacion_id inválido'),
  body('fecha_propuesta').optional().isISO8601().withMessage('Fecha inválida (ISO 8601)'),
  body('mensaje').optional().isLength({ max: 500 }),
], ctrl.crear);
router.post('/:id/aceptar',   ctrl.aceptar);
router.post('/:id/rechazar',  ctrl.rechazar);

module.exports = router;
