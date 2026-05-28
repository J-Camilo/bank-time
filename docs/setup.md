# Setup — BOTIme API

## Opción A — Desarrollo local

### Requisitos

- Node.js 20+
- Acceso a la base de datos (Supabase o PostgreSQL local)

### Instalación

```bash
npm install
# El archivo .env ya contiene los valores correctos de la instancia de Supabase
npm run dev
```

Verificar que la API responde:

```bash
curl http://localhost:3005/health
# → { "status": "ok", "ts": "..." }
```

---

## Opción B — Docker

```bash
# Desde esta carpeta
docker compose up --build
```

La API queda disponible en `http://localhost:3005/api/v1`.

El contenedor lee las variables de entorno directamente del `.env` de esta carpeta. No incluye base de datos local — se conecta a Supabase usando la `DATABASE_URL` del `.env`.

---

## Variables de entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `DATABASE_URL` | Connection string de PostgreSQL (Supabase) | Sí |
| `JWT_SECRET` | Secreto para access tokens | Sí |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens (diferente al anterior) | Sí |
| `JWT_EXPIRES_IN` | Vida útil del access token | No (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Vida útil del refresh token | No (default `7d`) |
| `PORT` | Puerto del servidor | No (default `3000`) |
| `NODE_ENV` | Entorno de ejecución | No (default `development`) |
| `CLIENT_URL` | URL del frontend para CORS | No (default `*`) |

Generar secretos seguros:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Flujo de prueba manual

```bash
# 1. Registrar usuario A
POST /api/v1/auth/register
{
  "nombre": "Juan", "apellido": "García",
  "correo": "juan@test.com", "contrasena": "123456",
  "departamento": "Antioquia", "municipio": "Medellín"
}

# 2. Registrar usuario B
POST /api/v1/auth/register
{ "nombre": "María", ..., "correo": "maria@test.com", "contrasena": "123456" }

# 3. Login con usuario A → guardar accessToken
POST /api/v1/auth/login
{ "correo": "juan@test.com", "contrasena": "123456" }

# 4. Ver categorías disponibles
GET /api/v1/categorias

# 5. Usuario A crea una publicación
POST /api/v1/publicaciones  (con token de A)
{
  "titulo": "Clases de guitarra",
  "descripcion": "Enseño guitarra para principiantes",
  "categoria_id": 1,
  "creditos_hora": 2,
  "fecha_expiracion": "2025-12-31"
}

# 6. Usuario B envía una solicitud (con token de B)
POST /api/v1/solicitudes
{
  "publicacion_id": 1,
  "mensaje": "Me interesa",
  "fecha_propuesta": "2025-07-20T10:00:00Z"
}

# 7. Usuario A acepta la solicitud (con token de A)
POST /api/v1/solicitudes/1/aceptar

# 8. Ambos usuarios confirman el intercambio
POST /api/v1/intercambios/1/confirmar  (con token de A)
POST /api/v1/intercambios/1/confirmar  (con token de B)
# → Al confirmar el segundo, el intercambio pasa a COMPLETADO y se liquidan créditos

# 9. Verificar créditos
GET /api/v1/usuarios/me/creditos   (con token de A → debería tener +2)
GET /api/v1/usuarios/me/creditos   (con token de B → debería tener -2)

# 10. Valorar el intercambio (cada usuario puede hacerlo una sola vez)
POST /api/v1/valoraciones  (con token de A)
{ "intercambio_id": 1, "calificacion": 5, "comentario": "Excelente" }

# 11. Ver valoraciones del intercambio
GET /api/v1/valoraciones/intercambio/1  (con token de cualquiera de los dos)
```
