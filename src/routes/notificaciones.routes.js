const router = require('express').Router();
const auth   = require('../middlewares/auth.middleware');
const ctrl   = require('../controllers/notificaciones.controller');

router.use(auth);
router.get('/',              ctrl.listar);
router.patch('/leer-todas',  ctrl.marcarTodasLeidas);
router.patch('/:id/leer',    ctrl.marcarLeida);

module.exports = router;
