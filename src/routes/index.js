const router = require('express').Router();

router.use('/auth',           require('./auth.routes'));
router.use('/usuarios',       require('./users.routes'));
router.use('/publicaciones',  require('./publicaciones.routes'));
router.use('/solicitudes',    require('./solicitudes.routes'));
router.use('/intercambios',   require('./intercambios.routes'));
router.use('/notificaciones', require('./notificaciones.routes'));
router.use('/categorias',     require('./categorias.routes'));
router.use('/valoraciones',   require('./valoraciones.routes'));
router.use('/admin',          require('./admin.routes'));

module.exports = router;
