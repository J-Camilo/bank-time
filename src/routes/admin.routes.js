const router   = require('express').Router();
const auth     = require('../middlewares/auth.middleware');
const isAdmin  = require('../middlewares/admin.middleware');
// const ctrl  = require('../controllers/admin.controller'); // TODO: descomentar

// Auth + admin check ya aplicados a todas las rutas de este módulo
router.use(auth, isAdmin);

// TODO: Implementar el controller y descomentar estas rutas
// router.get('/usuarios',                  ctrl.listarUsuarios);
// router.patch('/usuarios/:id/activar',    ctrl.toggleActivar);
// router.get('/publicaciones',             ctrl.listarPublicaciones);
// router.delete('/publicaciones/:id',      ctrl.eliminarPublicacion);
// router.get('/stats',                     ctrl.getStats);

module.exports = router;
