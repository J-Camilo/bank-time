# Pruebas de Integración — BOTIme API

Las pruebas de integración validan el comportamiento de la API con una base de datos real. A diferencia de las pruebas unitarias (que mockean el DB), estas pruebas verifican que las consultas SQL, las transacciones y las reglas de negocio funcionan correctamente de extremo a extremo entre la capa de servicio y PostgreSQL.

---

## Stack recomendado

| Herramienta | Propósito |
|---|---|
| **Jest** | Framework de tests (ya instalado) |
| **Supertest** | HTTP client para testear endpoints Express sin levantar servidor |
| **testcontainers** | Levanta una instancia de PostgreSQL en Docker para cada suite de tests |

```bash
npm install --save-dev supertest testcontainers @testcontainers/postgresql
```

---

## Estrategia

### Base de datos de test

Cada suite de integración usa una instancia de PostgreSQL efímera levantada con **testcontainers**. Al finalizar la suite, el contenedor se destruye automáticamente. Esto garantiza:

- Aislamiento total entre suites
- Sin estado residual entre corridas
- Sin necesidad de un servidor PostgreSQL instalado localmente

```js
// src/__integration__/helpers/db.js
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { Pool } = require('pg');

let container;
let pool;

const startDb = async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  pool = new Pool({ connectionString: container.getConnectionUri() });
  // correr migraciones / seed inicial
  await runMigrations(pool);
  return pool;
};

const stopDb = async () => {
  await pool.end();
  await container.stop();
};

module.exports = { startDb, stopDb };
```

### Estructura de archivos

```
src/
└── __integration__/
    ├── helpers/
    │   ├── db.js          # Setup y teardown del contenedor
    │   └── seed.js        # Datos de prueba reutilizables
    ├── auth.integration.test.js
    ├── publicaciones.integration.test.js
    ├── solicitudes.integration.test.js
    ├── intercambios.integration.test.js
    └── creditos.integration.test.js
```

---

## Casos de prueba planificados

### `auth.integration.test.js`

| # | Caso | Descripción |
|---|---|---|
| 1 | `POST /auth/register` éxito | Crea el usuario, inserta 8 créditos, registra movimiento `ASIGNACION_INICIAL` |
| 2 | `POST /auth/register` correo duplicado | Devuelve 409 sin crear usuario |
| 3 | `POST /auth/login` éxito | Devuelve `accessToken` y `refreshToken` válidos |
| 4 | `POST /auth/login` contraseña incorrecta | Devuelve 401 |
| 5 | `POST /auth/refresh` token válido | Devuelve nuevos tokens |
| 6 | `POST /auth/refresh` token expirado | Devuelve 401 |

### `publicaciones.integration.test.js`

| # | Caso | Descripción |
|---|---|---|
| 1 | `POST /publicaciones` | Crea publicación y aparece en el listado |
| 2 | `GET /publicaciones` | Filtra por categoría y devuelve solo las activas |
| 3 | `DELETE /publicaciones/:id` | Solo el dueño puede eliminar |
| 4 | `GET /publicaciones/:id/matches` | Devuelve publicaciones de la misma categoría |

### `solicitudes.integration.test.js`

| # | Caso | Descripción |
|---|---|---|
| 1 | `POST /solicitudes` éxito | Crea solicitud y notifica al dueño de la publicación |
| 2 | `POST /solicitudes` créditos insuficientes | Devuelve 400 sin crear la solicitud |
| 3 | `POST /solicitudes/:id/aceptar` | Crea intercambio y cambia estado de solicitud a `ACEPTADA` |
| 4 | `POST /solicitudes/:id/aceptar` conflicto de horario | Devuelve 409 si uno de los participantes ya tiene intercambio en ese horario |
| 5 | `POST /solicitudes/:id/rechazar` | Cambia estado a `RECHAZADA` y notifica al solicitante |

### `intercambios.integration.test.js`

| # | Caso | Descripción |
|---|---|---|
| 1 | `POST /intercambios/:id/confirmar` primera confirmación | Estado pasa a `EN_CURSO` |
| 2 | `POST /intercambios/:id/confirmar` segunda confirmación | Estado pasa a `COMPLETADO`, se liquidan créditos |
| 3 | `POST /intercambios/:id/cancelar` sin penalización | Cancelación con > 3 días de anticipación |
| 4 | `POST /intercambios/:id/cancelar` con penalización | Cancelación con < 3 días — descuenta créditos |
| 5 | `GET /intercambios` auto-transición `EN_ESPERA → EN_CURSO` | Al listar, intercambios con `fecha_acordada <= NOW()` pasan a `EN_CURSO` |
| 6 | `GET /intercambios` auto-completado `EN_CURSO → COMPLETADO` | Intercambios cuya duración ya expiró se completan y liquidan automáticamente |

### `creditos.integration.test.js`

| # | Caso | Descripción |
|---|---|---|
| 1 | Liquidación completa | Prestador gana N, receptor pierde N, ambos movimientos en historial |
| 2 | Receptor con créditos insuficientes | `GREATEST(0, ...)` previene créditos negativos |
| 3 | Penalización por cancelación tardía | Descuenta `CEIL(N × 10%)`, registra movimiento `PENALIZACION` |
| 4 | Bloqueo por 3 cancelaciones tardías | Tercer cancelación tardía bloquea la cuenta 3 días |
| 5 | Penalización idempotente | Una segunda llamada en la misma transacción no descuenta doble |

---

## Configuración de Jest para integración

Agregar al `jest.config.js`:

```js
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/__tests__/**/*.test.js'],
      testEnvironment: 'node',
    },
    {
      displayName: 'integration',
      testMatch: ['**/__integration__/**/*.test.js'],
      testEnvironment: 'node',
      testTimeout: 30000, // testcontainers puede tardar en arrancar
    },
  ],
};
```

Agregar scripts en `package.json`:

```json
"test:unit": "jest --selectProjects unit --coverage",
"test:integration": "jest --selectProjects integration",
"test:all": "jest --coverage"
```

---

## Consideraciones

- **Migraciones**: Las pruebas de integración requieren el esquema completo de la base de datos. Se debe mantener un script SQL o usar una herramienta de migraciones (ej. `node-pg-migrate`) que se ejecute en el setup del contenedor.
- **Tiempo de ejecución**: Cada suite tarda ~5–10 segundos extras por el arranque del contenedor. En CI usar `--runInBand` para evitar conflictos de puertos.
- **Variables de entorno**: En integración el `DATABASE_URL` apunta al contenedor efímero, no a Supabase. Usar `jest.config.js` con `setupFiles` para sobreescribir solo esa variable.
- **Orden de tests**: Los tests de integración no deben depender del orden de ejecución. Cada `describe` debe limpiar sus datos en `afterEach` o usar transacciones que hagan rollback.
