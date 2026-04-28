require('dotenv').config();
require('./config/env'); // Fails fast if required env vars are missing

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const routes       = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ── Security headers ─────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// ── Global rate limit (100 req / 15 min / IP) ────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta más tarde.' },
}));

// ── Body parser ───────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/v1', routes);

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// ── 404 ──────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// ── Global error handler ─────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Banco de Tiempo API corriendo en http://localhost:${PORT}/api/v1`);
  console.log(`   Modo: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
