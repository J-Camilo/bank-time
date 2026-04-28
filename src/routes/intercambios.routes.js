const router = require('express').Router();
const auth   = require('../middlewares/auth.middleware');
const ctrl   = require('../controllers/intercambios.controller');

router.use(auth);

router.get('/',                ctrl.listarMios);   // ?estado=EN_ESPERA|EN_CURSO|COMPLETADO|CANCELADO
router.get('/:id',             ctrl.getById);
router.post('/:id/confirmar',  ctrl.confirmar);
router.post('/:id/cancelar',   ctrl.cancelar);

module.exports = router;
