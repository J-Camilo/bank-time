# Setup — Banco de Tiempo API

## Requisitos

- Node.js 20+
- PostgreSQL (o cuenta en Supabase)

## Instalación

```bash
npm install
cp .env.example .env
```

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Connection string de PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secreto para access tokens | cadena aleatoria larga |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens | cadena aleatoria diferente |
| `JWT_EXPIRES_IN` | Expiración del access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Expiración del refresh token | `7d` |
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno | `development` \| `production` |
| `CLIENT_URL` | URL del frontend (CORS) | `http://localhost:5173` |

## Correr en desarrollo

```bash
npm run dev
```

## Verificar que funciona

```bash
curl http://localhost:3000/health
```

## Flujo de prueba recomendado

```bash
# 1. Registrar usuario
POST /api/v1/auth/register
{ "nombre": "Juan", "apellido": "García", "correo": "juan@test.com", "password": "123456" }

# 2. Login → guardar accessToken
POST /api/v1/auth/login
{ "correo": "juan@test.com", "password": "123456" }

# 3. Ver categorías disponibles
GET /api/v1/categorias

# 4. Crear publicación (con Bearer token)
POST /api/v1/publicaciones
{ "titulo": "Clases de guitarra", "descripcion": "...", "categoria_id": 1, "fecha_expiracion": "2025-12-31" }

# 5. Ver publicaciones
GET /api/v1/publicaciones

# 6. Solicitar intercambio (con otro usuario)
POST /api/v1/solicitudes
{ "publicacion_id": 1, "mensaje": "Me interesa", "fecha_propuesta": "2025-06-15" }

# 7. Aceptar solicitud (como dueño de la publicación)
POST /api/v1/solicitudes/1/aceptar

# 8. Confirmar intercambio (ambos usuarios, por separado)
POST /api/v1/intercambios/1/confirmar

# 9. Ver créditos
GET /api/v1/usuarios/me/creditos

# 10. Valorar el intercambio
POST /api/v1/valoraciones
{ "intercambio_id": 1, "calificacion": 5, "comentario": "Excelente experiencia" }
```
