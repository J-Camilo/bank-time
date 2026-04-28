# 🏠 Banco de Tiempo — API REST

API REST para la plataforma de intercambio de servicios entre vecinos.

## Stack
- **Runtime:** Node.js + Express
- **DB:** PostgreSQL (Supabase)
- **Auth:** JWT (access 15min + refresh 7d)
- **Seguridad:** Helmet · CORS · Rate Limiting · bcrypt

## Instalación

```bash
npm install
cp .env.example .env   # completar DATABASE_URL y JWT_SECRET
npm run dev
```

## Endpoints implementados

| Módulo | Ruta base | Estado |
|---|---|---|
| Auth | `/api/v1/auth` |  Completo |
| Usuarios | `/api/v1/usuarios` |  Completo |
| Publicaciones | `/api/v1/publicaciones` |  Completo |
| Solicitudes | `/api/v1/solicitudes` |  Completo |
| Intercambios | `/api/v1/intercambios` |  Completo |
| Match | `GET /publicaciones/:id/matches` |  Completo |
| Notificaciones | `/api/v1/notificaciones` |  Completo |
| Categorías | `GET /api/v1/categorias` |  Read only |
| **Valoraciones** | `/api/v1/valoraciones` | **TODO** |
| **Admin** | `/api/v1/admin` | **TODO** |


## Estructura del proyecto

```
src/
├── app.js                    # Entry point
├── config/
│   ├── db.js                 # Pool PostgreSQL + withTransaction
│   └── env.js                # Validación de variables de entorno
├── middlewares/
│   ├── auth.middleware.js    # JWT verify → req.user
│   ├── admin.middleware.js   # Requiere es_admin = true
│   ├── blocked.middleware.js # Bloquea usuarios con ban activo
│   └── errorHandler.js      # Error handler global + AppError
├── services/                 # Lógica de negocio
│   ├── creditos.service.js   # Liquidación, penalizaciones, bloqueos
│   ├── auth.service.js
│   ├── users.service.js
│   ├── publicaciones.service.js
│   ├── solicitudes.service.js
│   ├── intercambios.service.js
│   ├── match.service.js
│   └── notificaciones.service.js
├── controllers/              # Request/response handling
└── routes/                   # Express routers
```

.env 
DATABASE_URL
JWT_SECRET
JWT_REFRESH_SECRET
JWT_EXPIRES_IN
JWT_REFRESH_EXPIRES_IN
PORT
NODE_ENV
CLIENT_URL