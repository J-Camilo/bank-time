# API Reference — Banco de Tiempo

Base URL: `http://localhost:3000/api/v1`

Headers para rutas protegidas: `Authorization: Bearer <accessToken>`

---

## Auth — `/api/v1/auth`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Registrar usuario |
| POST | `/auth/login` | No | Login → devuelve `accessToken` + `refreshToken` |
| POST | `/auth/refresh` | No | Renovar access token con refresh token |
| POST | `/auth/logout` | Sí | Invalidar sesión |

### POST /auth/register
```json
{ "nombre": "...", "apellido": "...", "correo": "...", "password": "..." }
```

### POST /auth/login
```json
{ "correo": "...", "password": "..." }
```
Respuesta: `{ accessToken, refreshToken }`

---

## Usuarios — `/api/v1/usuarios`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/usuarios/me` | Sí | Perfil propio |
| PUT | `/usuarios/me` | Sí | Editar perfil propio |
| GET | `/usuarios/me/creditos` | Sí | Ver créditos disponibles |
| GET | `/usuarios/:id` | No | Perfil público de un usuario |

---

## Publicaciones — `/api/v1/publicaciones`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/publicaciones` | No | Listar publicaciones abiertas (`?categoria_id`, `?page`, `?limit`) |
| POST | `/publicaciones` | Sí | Crear publicación |
| GET | `/publicaciones/:id` | No | Ver publicación |
| PUT | `/publicaciones/:id` | Sí | Editar publicación propia |
| DELETE | `/publicaciones/:id` | Sí | Eliminar publicación propia |
| GET | `/publicaciones/:id/matches` | Sí | Ver matches por categoría |

### POST /publicaciones
```json
{
  "titulo": "...",
  "descripcion": "...",
  "categoria_id": 1,
  "fecha_expiracion": "2025-12-31",
  "creditos_hora": 2
}
```

---

## Solicitudes — `/api/v1/solicitudes`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/solicitudes` | Sí | Crear solicitud de intercambio |
| GET | `/solicitudes/mias` | Sí | Ver solicitudes propias |
| POST | `/solicitudes/:id/aceptar` | Sí | Aceptar solicitud (crea intercambio) |
| POST | `/solicitudes/:id/rechazar` | Sí | Rechazar solicitud |

### POST /solicitudes
```json
{ "publicacion_id": 1, "mensaje": "...", "fecha_propuesta": "2025-06-15" }
```

---

## Intercambios — `/api/v1/intercambios`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/intercambios` | Sí | Listar intercambios propios (`?estado`) |
| GET | `/intercambios/:id` | Sí | Ver intercambio |
| POST | `/intercambios/:id/confirmar` | Sí | Confirmar participación |
| POST | `/intercambios/:id/cancelar` | Sí | Cancelar intercambio |

**Estados posibles:** `EN_ESPERA` → `EN_CURSO` → `COMPLETADO` / `CANCELADO`

Ambas partes deben confirmar para completar el intercambio. Al completar se liquidan créditos automáticamente.

---

## Valoraciones — `/api/v1/valoraciones`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/valoraciones` | Sí | Valorar un intercambio completado |
| GET | `/valoraciones/usuario/:id` | No | Ver valoraciones de un usuario |

### POST /valoraciones
```json
{ "intercambio_id": 1, "calificacion": 5, "comentario": "Excelente!" }
```

- `calificacion`: entero del 1 al 5
- Solo participantes del intercambio pueden valorar
- El intercambio debe estar `COMPLETADO`
- Cada participante puede valorar una sola vez por intercambio

---

## Notificaciones — `/api/v1/notificaciones`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/notificaciones` | Sí | Listar notificaciones (`?no_leidas=true`) |
| PATCH | `/notificaciones/leer-todas` | Sí | Marcar todas como leídas |
| PATCH | `/notificaciones/:id/leer` | Sí | Marcar una como leída |

---

## Categorías — `/api/v1/categorias`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/categorias` | No | Listar categorías |
| POST | `/categorias` | Admin | Crear categoría |
| PUT | `/categorias/:id` | Admin | Editar categoría |
| DELETE | `/categorias/:id` | Admin | Eliminar categoría |

### POST /categorias
```json
{ "nombre": "Jardinería", "icono": "🌿" }
```

---

## Admin — `/api/v1/admin`

Todos los endpoints requieren `Authorization: Bearer <accessToken>` de un usuario con `es_admin = true`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/usuarios` | Listar usuarios (`?activo=true\|false`, `?page`, `?limit`) |
| PATCH | `/admin/usuarios/:id/activar` | Activar/desactivar usuario |
| GET | `/admin/publicaciones` | Listar todas las publicaciones (`?estado`, `?page`, `?limit`) |
| DELETE | `/admin/publicaciones/:id` | Eliminar publicación (moderación) |
| GET | `/admin/stats` | Estadísticas globales de la plataforma |

### PATCH /admin/usuarios/:id/activar
```json
{ "activo": false }
```

### GET /admin/stats — Respuesta
```json
{
  "usuarios_activos": 120,
  "publicaciones_abiertas": 45,
  "intercambios_completados": 310,
  "creditos_en_circulacion": 1840
}
```

---

## Códigos de error comunes

| Código | Significado |
|--------|-------------|
| 400 | Bad request — datos inválidos |
| 401 | No autenticado — token ausente o expirado |
| 403 | Sin permiso |
| 404 | Recurso no encontrado |
| 409 | Conflicto — duplicado o restricción de negocio |
| 500 | Error interno del servidor |

Todos los errores devuelven `{ "error": "descripción" }`.
