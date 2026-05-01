const router = require('express').Router();
const auth   = require('../middlewares/auth.middleware');
const ctrl   = require('../controllers/valoraciones.controller');

router.post('/',             auth, ctrl.crear);
router.get('/usuario/:id',        ctrl.listarPorUsuario);

module.exports = router;
