const router    = require('express').Router();
const { body }  = require('express-validator');
const rateLimit = require('express-rate-limit');
const ctrl      = require('../controllers/auth.controller');

// Stricter rate limit for auth endpoints (10 attempts / 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de autenticación. Espera 15 minutos.' },
});

router.post('/register', authLimiter, [
  body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
  body('apellido').trim().notEmpty().withMessage('Apellido requerido'),
  body('correo').isEmail().normalizeEmail().withMessage('Correo electrónico inválido'),
  body('contrasena')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('La contraseña debe contener letras y números'),
  body('departamento').optional().trim().isLength({ max: 100 }),
  body('municipio').optional().trim().isLength({ max: 100 }),
  body('direccion').optional().trim().isLength({ max: 255 }),
], ctrl.register);

router.post('/login', authLimiter, [
  body('correo').isEmail().normalizeEmail().withMessage('Correo inválido'),
  body('contrasena').notEmpty().withMessage('Contraseña requerida'),
], ctrl.login);

router.post('/refresh', ctrl.refresh);
router.post('/logout',  ctrl.logout);

module.exports = router;
