# Arquitectura — BOTIme API

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 4 |
| Base de datos | PostgreSQL 16 |
| Auth | JWT — access 15min + refresh 7d |
| Seguridad | Helmet · CORS · express-rate-limit · bcryptjs |
| Validación | express-validator |

---

## Estructura de capas

```
Request → Router → Middleware → Controller → Service → DB (pg Pool)
                                                 ↑
                                           errorHandler
```

| Capa | Responsabilidad |
|---|---|
| **Router** | Define rutas y aplica middlewares de autenticación/permisos |
| **Middleware** | JWT auth, admin check, blocked user check, error handler global |
| **Controller** | Extrae parámetros de `req`, llama al service, responde con `res`. Sin lógica de negocio |
| **Service** | Toda la lógica de negocio y SQL. Lanza `AppError` para errores controlados |
| **Config/DB** | Pool de conexión PostgreSQL con helper `withTransaction()` para transacciones |

---

## Módulos de negocio

```
auth          → registro con 8 créditos de bienvenida, login, refresh, logout
usuarios      → perfil público/privado, edición, créditos disponibles, historial
publicaciones → CRUD + expiración automática por fecha
solicitudes   → propuesta de intercambio entre dos usuarios
intercambios  → máquina de estados con transiciones automáticas
creditos      → liquidación al completar, penalización por cancelación tardía, bloqueo
valoraciones  → calificación 1-5 estrellas post-intercambio
notificaciones → mensajes internos del sistema
categorias    → taxonomía de servicios ofrecidos
match         → sugerencias por categoría entre publicaciones
admin         → moderación de usuarios y publicaciones, estadísticas
```

---

## Máquina de estados de intercambios

```
EN_ESPERA ──── fecha_acordada <= NOW() ──────────────────────────► EN_CURSO
                (trigger lazy al listar)

EN_CURSO  ──── ambas partes confirman ──────────────────────────► COMPLETADO
          ──── fecha + creditos_acordados horas ya pasó ─────────► COMPLETADO (lazy)
          ──── cualquier parte cancela ──────────────────────────► CANCELADO
```

Las transiciones automáticas (`EN_ESPERA → EN_CURSO` y `EN_CURSO → COMPLETADO`) se ejecutan de forma **lazy** en `listarMios()` — se evalúan cuando un usuario consulta sus intercambios, no en un cron job. Esto evita la necesidad de procesos externos de scheduling.

La idempotencia del auto-completado se garantiza con un `LEFT JOIN historial_intercambio ... AND h.id IS NULL`: solo se procesan intercambios que aún no tienen historial.

---

## Transacciones

`withTransaction(async (client) => { ... })` en `src/config/db.js` envuelve operaciones en `BEGIN / COMMIT / ROLLBACK` automático.

Se usa obligatoriamente en:
- Aceptar solicitud (crear intercambio + notificar)
- Confirmar intercambio (actualizar estado + liquidar créditos + notificar)
- Cancelar intercambio (actualizar + historial + penalización + notificar)
- Auto-completado lazy (actualizar + liquidar + notificar)
- Aplicar penalización (descontar créditos + registrar + evaluar bloqueo)

---

## Flujo de créditos

```
Registro                → +8 créditos (ASIGNACION_INICIAL)
Completar intercambio   → prestador +N, receptor -N  (GANANCIA / CONSUMO)
Cancelación tardía      → quien cancela -CEIL(N×10%) (PENALIZACION)
```

Todo movimiento se registra en `historial_creditos` con `tipo`, `cantidad` y `descripcion`.

---

## Seguridad

- **Contraseñas**: bcrypt con salt rounds = 10. Nunca se almacena texto plano.
- **JWT**: access token con vida corta (15m), refresh token (7d). Ambos firmados con secretos distintos definidos en variables de entorno.
- **Rate limiting**: 100 requests / 15 min / IP a nivel global (`src/app.js`).
- **Helmet**: headers HTTP seguros (CSP, HSTS, X-Frame-Options, etc.).
- **CORS**: dominio permitido configurable via `CLIENT_URL`.
- **Usuarios bloqueados**: `blocked.middleware.js` rechaza requests de usuarios con `fecha_bloqueo_hasta > NOW()`.
- **Validación de entradas**: `express-validator` en rutas que reciben datos del cliente.
- **AppError**: todos los errores de negocio viajan como instancias de `AppError(message, statusCode)`, capturados por el handler global que nunca expone stack traces en producción.

---

## Flujo de errores

```
Service lanza AppError(message, statusCode)
    ↓
errorHandler.js
    ├── AppError → { error: message } con su statusCode
    ├── PG 23505 (unique)   → 409
    ├── PG 23503 (fk)       → 400
    ├── PG 23514 (check)    → 400
    └── resto               → 500 sin exponer detalles
```
