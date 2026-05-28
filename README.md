# BOTIme — API REST

API REST de la plataforma de intercambio de servicios comunitarios **Banco de Tiempo**. Gestiona usuarios, publicaciones de servicios, solicitudes, intercambios, créditos, valoraciones y notificaciones.

---

## Stack

| Tecnología | Uso |
|---|---|
| Node.js 20 + Express 4 | Runtime y framework HTTP |
| PostgreSQL 16 | Base de datos relacional |
| JWT (access 15m + refresh 7d) | Autenticación stateless |
| bcryptjs | Hash de contraseñas |
| Helmet + CORS + rate-limit | Seguridad HTTP |
| express-validator | Validación de entradas |

---

## Estructura del proyecto

```
src/
├── app.js                    # Entry point — configura Express y monta rutas
├── config/
│   ├── db.js                 # Pool de conexión PostgreSQL + withTransaction()
│   └── env.js                # Falla rápido si faltan variables de entorno
├── middlewares/
│   ├── auth.middleware.js    # Verifica JWT → popula req.user
│   ├── admin.middleware.js   # Requiere es_admin = true
│   ├── blocked.middleware.js # Rechaza usuarios con ban activo
│   └── errorHandler.js      # Handler global + clase AppError
├── routes/                   # Express routers — un archivo por módulo
├── controllers/              # Reciben req/res, delegan al service
└── services/                 # Toda la lógica de negocio y acceso a DB
    ├── auth.service.js
    ├── users.service.js
    ├── publicaciones.service.js
    ├── solicitudes.service.js
    ├── intercambios.service.js
    ├── creditos.service.js       # Liquidación, penalizaciones y bloqueos
    ├── valoraciones.service.js
    ├── notificaciones.service.js
    ├── match.service.js          # Sugerencias por categoría
    └── admin.service.js
```

---

## Variables de entorno

Copiar `.env.example` → `.env` y completar:

| Variable | Descripción | Requerida |
|---|---|---|
| `DATABASE_URL` | Connection string PostgreSQL | Sí |
| `JWT_SECRET` | Secreto para access tokens | Sí |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens (diferente al anterior) | Sí |
| `JWT_EXPIRES_IN` | Vida útil del access token | No (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Vida útil del refresh token | No (default `7d`) |
| `PORT` | Puerto del servidor | No (default `3000`) |
| `NODE_ENV` | Entorno de ejecución | No (default `development`) |
| `CLIENT_URL` | URL del frontend para CORS | No (default `*`) |

Generar secretos JWT:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Instalación y desarrollo

**Requisitos:** Node.js 20+ y una instancia de PostgreSQL.

```bash
npm install
cp .env.example .env   # completar DATABASE_URL, JWT_SECRET y JWT_REFRESH_SECRET
npm run dev            # nodemon — recarga automática
```

Verificar que la API responde:
```bash
curl http://localhost:3000/health
# → { "status": "ok", "ts": "..." }
```

---

## Deploy con Docker

```bash
# Desde esta carpeta
docker compose up --build
```

La API queda disponible en `http://localhost:3005/api/v1`.

El contenedor lee las variables del `.env` de esta misma carpeta. No incluye base de datos local — se conecta a Supabase con la `DATABASE_URL` del `.env`.

---

## Documentación técnica

| Documento | Contenido |
|---|---|
| [`docs/api.md`](./docs/api.md) | Referencia completa de todos los endpoints |
| [`docs/architecture.md`](./docs/architecture.md) | Arquitectura, capas y decisiones de diseño |
| [`docs/setup.md`](./docs/setup.md) | Guía de instalación y flujo de prueba manual |

---

## Resumen de módulos

| Módulo | Ruta base | Descripción |
|---|---|---|
| Auth | `/api/v1/auth` | Registro, login, refresh, logout |
| Usuarios | `/api/v1/usuarios` | Perfil, edición, créditos, historial de movimientos |
| Publicaciones | `/api/v1/publicaciones` | CRUD de servicios ofrecidos |
| Solicitudes | `/api/v1/solicitudes` | Propuestas de intercambio |
| Intercambios | `/api/v1/intercambios` | Confirmación dual y cancelación |
| Valoraciones | `/api/v1/valoraciones` | Calificaciones post-intercambio |
| Notificaciones | `/api/v1/notificaciones` | Mensajes internos del sistema |
| Categorías | `/api/v1/categorias` | Taxonomía de servicios |
| Admin | `/api/v1/admin` | Moderación y estadísticas (solo admins) |
