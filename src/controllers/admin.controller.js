// ╔══════════════════════════════════════════════════════════════╗
// ║  TODO — Panel de Administración                              ║
// ║  Dificultad: BAJA  |  Estimado: ~2h                         ║
// ╚══════════════════════════════════════════════════════════════╝
//
// Todos los endpoints requieren auth + isAdmin (ya aplicados en la ruta).
//
// ─────────────────────────────────────────────────────────────
// 1. GET /api/v1/admin/usuarios      [ADMIN]
// ─────────────────────────────────────────────────────────────
// Query params opcionales: ?activo=true|false  ?page=1  ?limit=20
//
// SELECT id, nombre, apellido, correo, activo, es_admin,
//        creditos_disponibles, cancelaciones_acumuladas,
//        fecha_bloqueo_hasta, created_at
// FROM usuarios
// WHERE activo = $1  (solo si se pasa el filtro)
// ORDER BY created_at DESC
// LIMIT $2 OFFSET $3
//
// ─────────────────────────────────────────────────────────────
// 2. PATCH /api/v1/admin/usuarios/:id/activar      [ADMIN]
// ─────────────────────────────────────────────────────────────
// Body: { activo: boolean }
// Activar o desactivar un usuario.
// Restricción: no permitir desactivar a otros admins (es_admin = true).
//
// UPDATE usuarios SET activo = $1 WHERE id = $2 RETURNING id, nombre, activo
//
// ─────────────────────────────────────────────────────────────
// 3. GET /api/v1/admin/publicaciones      [ADMIN]
// ─────────────────────────────────────────────────────────────
// Igual que GET /publicaciones pero SIN filtrar por estado.
// Soportar ?estado=ABIERTO|EXPIRADO  ?page  ?limit
//
// ─────────────────────────────────────────────────────────────
// 4. DELETE /api/v1/admin/publicaciones/:id      [ADMIN]
// ─────────────────────────────────────────────────────────────
// Eliminar cualquier publicación (moderación).
// Verificar que no tenga intercambios activos (estado NOT IN ('CANCELADO','COMPLETADO')).
// Si tiene → 409.
// Si no → DELETE FROM publicaciones WHERE id = $1
//
// ─────────────────────────────────────────────────────────────
// 5. GET /api/v1/admin/stats      [ADMIN]
// ─────────────────────────────────────────────────────────────
// Retorna estadísticas globales de la plataforma:
//
// SELECT
//   (SELECT COUNT(*) FROM usuarios WHERE activo = TRUE)             AS usuarios_activos,
//   (SELECT COUNT(*) FROM publicaciones WHERE estado = 'ABIERTO')   AS publicaciones_abiertas,
//   (SELECT COUNT(*) FROM intercambios WHERE estado = 'COMPLETADO') AS intercambios_completados,
//   (SELECT SUM(creditos_disponibles) FROM usuarios)                AS creditos_en_circulacion
//
// ─────────────────────────────────────────────────────────────
// Archivos a modificar:
//   - src/services/admin.service.js    (lógica de queries)
//   - src/routes/admin.routes.js       (descomentar rutas)
// ─────────────────────────────────────────────────────────────

module.exports = {};
