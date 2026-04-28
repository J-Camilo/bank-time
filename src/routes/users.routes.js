// src/routes/users.routes.js
const router  = require('express').Router();
const auth    = require('../middlewares/auth.middleware');
const ctrl    = require('../controllers/users.controller');

router.use(auth);

router.get('/me',           ctrl.getProfile);
router.put('/me',           ctrl.updateProfile);
router.get('/me/creditos',  ctrl.getCreditos);
router.get('/me/historial', ctrl.getHistorial);

module.exports = router;
