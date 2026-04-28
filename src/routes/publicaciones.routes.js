const router  = require('express').Router();
const { body }= require('express-validator');
const auth    = require('../middlewares/auth.middleware');
const blocked = require('../middlewares/blocked.middleware');
const ctrl    = require('../controllers/publicaciones.controller');

// ── Public ────────────────────────────────────────────────────
// IMPORTANTE: /mis debe ir ANTES de /:id para evitar que Express lo capture como id
router.get('/', ctrl.list);

// ── Protected ─────────────────────────────────────────────────
router.get('/mis',    auth, blocked, ctrl.getMine);   // ?expired=true para incluir expiradas

router.get('/:id',         ctrl.getById);
router.get('/:id/matches', auth, ctrl.getMatches);

router.post('/', auth, blocked, [
  body('titulo').trim().notEmpty().withMessage('Título requerido'),
  body('descripcion').trim().notEmpty().withMessage('Descripción requerida'),
  body('fecha_expiracion').isDate().withMessage('Fecha de expiración inválida (YYYY-MM-DD)'),
  body('creditos_hora').optional().isInt({ min: 1 }).withMessage('creditos_hora debe ser entero positivo'),
  body('categoria_id').optional().isInt({ min: 1 }),
], ctrl.create);

router.put('/:id',    auth, blocked, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
