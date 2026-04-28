# ✅ TODO — Banco de Tiempo API

Lo que falta implementar (~20% de la API). Todo tiene instrucciones detalladas en los archivos.

---

## 1. Valoraciones 
**Archivos:** `src/controllers/valoraciones.controller.js` · `src/services/valoraciones.service.js` · `src/routes/valoraciones.routes.js`

| Endpoint | Método | Auth | Descripción |
|---|---|---|---|
| `/api/v1/valoraciones` | POST | Sí | Valorar un intercambio completado |
| `/api/v1/valoraciones/usuario/:id` | GET | No | Ver valoraciones de un usuario |

**Instrucciones completas:** leer `src/controllers/valoraciones.controller.js`

---

## 2. Panel de Administración 
**Archivos:** `src/controllers/admin.controller.js` · `src/services/admin.service.js` · `src/routes/admin.routes.js`

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/v1/admin/usuarios` | GET | Listar todos los usuarios con filtros |
| `/api/v1/admin/usuarios/:id/activar` | PATCH | Activar/desactivar cuenta |
| `/api/v1/admin/publicaciones` | GET | Listar todas las publicaciones |
| `/api/v1/admin/publicaciones/:id` | DELETE | Eliminar publicación (moderación) |
| `/api/v1/admin/stats` | GET | Estadísticas globales de la plataforma |

**Instrucciones completas:** leer `src/controllers/admin.controller.js`

---

## 3. Notificaciones — marcar todas como leídas 
**Archivo:** `src/services/notificaciones.service.js`

Agregar función:
```js
const marcarTodasLeidas = async (usuarioId) => {
  await pool.query(
    'UPDATE notificaciones SET leida = TRUE WHERE usuario_id = $1 AND leida = FALSE',
    [usuarioId]
  );
};
```

Luego descomentar en `src/routes/notificaciones.routes.js`:
```js
router.patch('/leer-todas', ctrl.marcarTodasLeidas);
```

---

## 4. Categorías — CRUD admin
**Archivo:** `src/routes/categorias.routes.js` · `src/controllers/categorias.controller.js`

Agregar endpoints protegidos con `auth + isAdmin`:
- `POST /api/v1/categorias` → INSERT INTO categorias (nombre, icono)
- `PUT /api/v1/categorias/:id` → UPDATE categorias SET ...
- `DELETE /api/v1/categorias/:id` → verificar que no tenga publicaciones activas → DELETE

---

## 5. Auth avanzado
Si se quiere implementar blacklist de tokens al hacer logout:
- Crear tabla `token_blacklist (token_hash VARCHAR, expires_at TIMESTAMPTZ)`
- En `logout`, insertar `SHA256(token)` con la expiración del JWT
- En `auth.middleware.js`, verificar que el token no esté en la blacklist antes de validar
- Cron job o Postgres trigger para limpiar tokens expirados

---

## Cómo probar la API

```bash
# 1. Clonar e instalar
npm install

# 2. Configurar variables
cp .env.example .env
# Editar .env con DATABASE_URL y JWT_SECRET reales

# 3. Correr en desarrollo
npm run dev

# 4. Verificar salud
curl http://localhost:3000/health
```

**Orden recomendado para probar:**
1. `POST /api/v1/auth/register`
2. `POST /api/v1/auth/login` → guardar accessToken
3. `GET /api/v1/categorias`
4. `POST /api/v1/publicaciones` (con Bearer token)
5. `GET /api/v1/publicaciones`
6. `POST /api/v1/solicitudes`
7. `POST /api/v1/solicitudes/:id/aceptar`
8. `POST /api/v1/intercambios/:id/confirmar` (ambos usuarios)
9. `GET /api/v1/usuarios/me/creditos`
