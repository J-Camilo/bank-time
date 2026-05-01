const router  = require('express').Router();
const auth    = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/admin.middleware');
const ctrl    = require('../controllers/admin.controller');

router.use(auth, isAdmin);

router.get('/usuarios',                 ctrl.listarUsuarios);
router.patch('/usuarios/:id/activar',   ctrl.toggleActivar);
router.get('/publicaciones',            ctrl.listarPublicaciones);
router.delete('/publicaciones/:id',     ctrl.eliminarPublicacion);
router.get('/stats',                    ctrl.getStats);

module.exports = router;
