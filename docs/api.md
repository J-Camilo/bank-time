# API Reference — BOTIme

Base URL: `http://localhost:3000/api/v1`

Rutas protegidas requieren: `Authorization: Bearer <accessToken>`

Todos los errores devuelven `{ "error": "descripción" }`.

---

## Auth — `/api/v1/auth`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/register` | No | Registrar usuario (recibe 8 créditos de bienvenida) |
| POST | `/auth/login` | No | Login — devuelve `accessToken` + `refreshToken` |
| POST | `/auth/refresh` | No | Renovar access token con refresh token |
| POST | `/auth/logout` | Sí | Invalidar sesión actual |

### POST /auth/register
```json
{
  "nombre": "Juan",
  "apellido": "García",
  "correo": "juan@example.com",
  "contrasena": "minimo6chars",
  "departamento": "Antioquia",
  "municipio": "Medellín",
  "direccion": "Calle 10 #20-30"
}
```

### POST /auth/login
```json
{ "correo": "juan@example.com", "contrasena": "mipassword" }
```
Respuesta: `{ "accessToken": "...", "refreshToken": "...", "user": { ... } }`

### POST /auth/refresh
```json
{ "refreshToken": "..." }
```
Respuesta: `{ "accessToken": "...", "refreshToken": "..." }`

---

## Usuarios — `/api/v1/usuarios`

Todos requieren autenticación.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/usuarios/me` | Perfil propio completo |
| PUT | `/usuarios/me` | Editar perfil (nombre, apellido, municipio, dirección) |
| GET | `/usuarios/me/creditos` | Créditos disponibles + movimientos recientes |
| GET | `/usuarios/me/historial` | Historial de intercambios completados |
| GET | `/usuarios/:id` | Perfil público de otro usuario |

---

## Publicaciones — `/api/v1/publicaciones`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/publicaciones` | No | Listar publicaciones activas (`?q`, `?categoria_id`, `?page`, `?limit`) |
| POST | `/publicaciones` | Sí | Crear publicación |
| GET | `/publicaciones/:id` | No | Ver publicación |
| PUT | `/publicaciones/:id` | Sí | Editar publicación propia |
| DELETE | `/publicaciones/:id` | Sí | Eliminar publicación propia |
| GET | `/publicaciones/:id/matches` | Sí | Publicaciones de otros usuarios en la misma categoría |

### POST /publicaciones
```json
{
  "titulo": "Clases de guitarra",
  "descripcion": "Enseño guitarra acústica para principiantes",
  "categoria_id": 3,
  "creditos_hora": 2,
  "fecha_expiracion": "2025-12-31"
}
```

El estado se gestiona automáticamente: `ABIERTO` hasta `fecha_expiracion`, luego `EXPIRADO`.

---

## Solicitudes — `/api/v1/solicitudes`

Todos requieren autenticación.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/solicitudes` | Enviar solicitud a una publicación |
| GET | `/solicitudes/enviadas` | Solicitudes enviadas por el usuario |
| GET | `/solicitudes/recibidas` | Solicitudes recibidas en las publicaciones propias |
| POST | `/solicitudes/:id/aceptar` | Aceptar solicitud → crea intercambio automáticamente |
| POST | `/solicitudes/:id/rechazar` | Rechazar solicitud |
| PATCH | `/solicitudes/:id` | Actualizar mensaje o fecha propuesta (solo si está `PENDIENTE`) |
| DELETE | `/solicitudes/:id` | Cancelar solicitud propia (solo si está `PENDIENTE`) |

### POST /solicitudes
```json
{
  "publicacion_id": 5,
  "mensaje": "Me interesa tu servicio",
  "fecha_propuesta": "2025-07-20T10:00:00Z"
}
```

**Validaciones al aceptar:**
- El solicitante debe tener créditos suficientes.
- La cuenta del solicitante no debe estar bloqueada.
- Ninguno de los dos participantes puede tener otro intercambio activo que se solape con el horario propuesto.

---

## Intercambios — `/api/v1/intercambios`

Todos requieren autenticación.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/intercambios` | Listar intercambios propios (`?estado=EN_ESPERA\|EN_CURSO\|COMPLETADO\|CANCELADO`) |
| GET | `/intercambios/:id` | Ver detalle de un intercambio |
| POST | `/intercambios/:id/confirmar` | Confirmar participación |
| POST | `/intercambios/:id/cancelar` | Cancelar intercambio |

### Flujo de estados

```
EN_ESPERA
   │
   ├─ fecha_acordada llega → EN_CURSO  (auto al listar)
   │
EN_CURSO
   │
   ├─ ambas partes confirman           → COMPLETADO + liquidación de créditos
   ├─ fecha + duración ya pasó         → COMPLETADO automático (al listar)
   └─ cualquier parte cancela          → CANCELADO
```

### Cancelación con penalización

Si se cancela dentro de los 3 días previos a `fecha_acordada`:
- Penalización = `CEIL(creditos_acordados × 10%)`
- Acumulando 3 cancelaciones tardías → bloqueo de cuenta por 3 días.

---

## Valoraciones — `/api/v1/valoraciones`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/valoraciones` | Sí | Valorar un intercambio completado |
| GET | `/valoraciones/intercambio/:id` | Sí | Ver valoraciones de ambas partes en un intercambio |
| GET | `/valoraciones/usuario/:id` | No | Ver todas las valoraciones recibidas por un usuario |

### POST /valoraciones
```json
{
  "intercambio_id": 12,
  "calificacion": 5,
  "comentario": "Excelente servicio, muy puntual"
}
```

- `calificacion`: entero del 1 al 5.
- Solo participantes del intercambio pueden valorar.
- El intercambio debe estar en estado `COMPLETADO`.
- Cada participante puede valorar una sola vez por intercambio.
- Al crear una valoración se recalcula el `promedio_valoracion` del usuario valorado.

### GET /valoraciones/intercambio/:id

Devuelve las valoraciones de ambas partes. Requiere ser participante del intercambio.

```json
[
  {
    "id": 1,
    "calificacion": 5,
    "comentario": "Muy buen servicio",
    "fecha": "2025-06-15T14:30:00Z",
    "evaluador_nombre": "Juan",
    "evaluador_apellido": "García",
    "evaluado_nombre": "María",
    "evaluado_apellido": "López"
  }
]
```

---

## Notificaciones — `/api/v1/notificaciones`

Todos requieren autenticación.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/notificaciones` | Listar notificaciones propias (`?no_leidas=true`) |
| PATCH | `/notificaciones/:id/leer` | Marcar una notificación como leída |
| PATCH | `/notificaciones/leer-todas` | Marcar todas como leídas |

---

## Categorías — `/api/v1/categorias`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/categorias` | No | Listar todas las categorías |
| POST | `/categorias` | Admin | Crear categoría |
| PUT | `/categorias/:id` | Admin | Editar categoría |
| DELETE | `/categorias/:id` | Admin | Eliminar categoría |

### POST /categorias
```json
{ "nombre": "Jardinería", "icono": "🌿" }
```

---

## Admin — `/api/v1/admin`

Todos requieren token de usuario con `es_admin = true`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/admin/usuarios` | Listar usuarios (`?activo=true\|false`, `?page`, `?limit`) |
| PATCH | `/admin/usuarios/:id/activar` | Activar o desactivar un usuario |
| GET | `/admin/publicaciones` | Listar todas las publicaciones (`?estado`, `?page`, `?limit`) |
| DELETE | `/admin/publicaciones/:id` | Eliminar publicación (moderación) |
| GET | `/admin/stats` | Estadísticas globales de la plataforma |

### GET /admin/stats — Respuesta
```json
{
  "total_usuarios": 150,
  "usuarios_activos": 120,
  "total_publicaciones": 85,
  "publicaciones_activas": 45,
  "total_intercambios": 410,
  "intercambios_completados": 310
}
```

---

## Códigos de respuesta

| Código | Significado |
|---|---|
| 200 | OK |
| 201 | Recurso creado |
| 400 | Datos inválidos o regla de negocio violada |
| 401 | No autenticado — token ausente o expirado |
| 403 | Sin permiso — usuario bloqueado o no es admin |
| 404 | Recurso no encontrado |
| 409 | Conflicto — duplicado o restricción de negocio (ej: horario solapado) |
| 500 | Error interno del servidor |
