const { Pool } = require('pg');

const isServerless = !!process.env.VERCEL;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: isServerless ? 1 : 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});
console.log(pool);

pool.on('error', (err) => {
  console.error('DB idle client error:', err.message);
  process.exit(-1);
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') console.log('🗄️  DB conectada');
});

/**
 * Ejecuta un callback dentro de una transacción.
 * Si el callback lanza, hace ROLLBACK automático.
 * @param {(client: import('pg').PoolClient) => Promise<any>} callback
 */
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, withTransaction };
