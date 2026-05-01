# Arquitectura — Banco de Tiempo API

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 20+ |
| Framework | Express 4 |
| Base de datos | PostgreSQL (Supabase) |
| Auth | JWT — access 15min + refresh 7d |
| Seguridad | Helmet · CORS · express-rate-limit · bcrypt |

## Estructura de capas

```
Request → Router → Middleware → Controller → Service → DB
                                    ↑
                              errorHandler
```

- **Router** (`src/routes/`): Define rutas y aplica middlewares de autenticación.
- **Middleware** (`src/middlewares/`): JWT auth, admin check, blocked users, error handler global.
- **Controller** (`src/controllers/`): Recibe `req`, delega al service, responde con `res`. No contiene lógica de negocio.
- **Service** (`src/services/`): Toda la lógica de negocio y acceso a la DB. Lanza `AppError` para errores controlados.
- **Config** (`src/config/`): Pool de conexión PostgreSQL con soporte para transacciones (`withTransaction`).

## Flujo de errores

Los services lanzan `new AppError('mensaje', statusCode)`.  
El `errorHandler` global captura todo y mapea errores de Postgres (23505, 23503, 23514) a respuestas HTTP consistentes.

## Módulos de negocio

```
auth          → registro, login, refresh, logout
usuarios      → perfil, edición, créditos
publicaciones → CRUD + expiración automática
solicitudes   → propuesta de intercambio
intercambios  → confirmación dual, cancelación con penalización
creditos      → liquidación al completar, penalización tardía, bloqueo
valoraciones  → calificación post-intercambio, trigger actualiza promedio
notificaciones → mensajes internos, lectura individual y masiva
categorias    → taxonomía de servicios
match         → sugerencias por categoría entre publicaciones
admin         → moderación, estadísticas, gestión de usuarios
```

## Transacciones

`withTransaction(async (client) => { ... })` en `src/config/db.js` maneja `BEGIN / COMMIT / ROLLBACK` automáticamente. Se usa en operaciones críticas: confirmar intercambio, cancelar (penalización + historial), liquidar créditos.

## Seguridad

- Contraseñas hasheadas con bcrypt (salt rounds = 10).
- JWT firmado con secreto de entorno, tiempo de vida corto para access token.
- Rate limiting global en `src/app.js`.
- Helmet para headers HTTP seguros.
- CORS configurado por `CLIENT_URL` de entorno.
- Usuarios bloqueados (`fecha_bloqueo_hasta`) son rechazados por `blocked.middleware.js`.
