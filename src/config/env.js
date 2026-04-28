const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\n❌ Variables de entorno faltantes: ${missing.join(', ')}`);
  console.error('   Copia .env.example → .env y completa los valores\n');
  process.exit(1);
}
