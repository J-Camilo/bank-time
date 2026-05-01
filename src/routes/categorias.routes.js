const router  = require('express').Router();
const auth    = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/admin.middleware');
const ctrl    = require('../controllers/categorias.controller');

router.get('/', ctrl.listar);
router.post('/',     auth, isAdmin, ctrl.crear);
router.put('/:id',   auth, isAdmin, ctrl.actualizar);
router.delete('/:id', auth, isAdmin, ctrl.eliminar);

module.exports = router;
