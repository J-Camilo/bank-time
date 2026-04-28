// ╔══════════════════════════════════════════════════════════════╗
// ║  TODO — Módulo de Valoraciones                               ║
// ║  Dificultad: BAJA-MEDIA  |  Estimado: ~1.5h                 ║
// ╚══════════════════════════════════════════════════════════════╝
//
// IMPLEMENTAR los siguientes dos endpoints:
//
// ─────────────────────────────────────────────────────────────
// 1. POST /api/v1/valoraciones     [PROTEGIDO]
// ─────────────────────────────────────────────────────────────
// Body esperado:
//   { intercambio_id: number, calificacion: number (1-5), comentario?: string }
//
// Pasos:
//   a) Obtener intercambio; verificar que estado === 'COMPLETADO'.
//      Si no → 400 "El intercambio no está completado"
//
//   b) Verificar que req.user.id sea prestador_id O receptor_id.
//      Si no → 403 "Sin permiso para valorar este intercambio"
//
//   c) Determinar usuario_valorado_id:
//      - Si req.user.id === prestador_id → usuario_valorado_id = receptor_id
//      - Si req.user.id === receptor_id  → usuario_valorado_id = prestador_id
//
//   d) INSERT en tabla `valoraciones`:
//        (intercambio_id, usuario_id, usuario_valorado_id, calificacion, comentario)
//      La constraint uq_valoracion_por_intercambio en la DB ya previene duplicados.
//      Si viola la constraint (error Postgres 23505) → 409 "Ya valoraste este intercambio"
//
//   e) La DB trigger fn_actualizar_promedio_valoracion actualizará automáticamente
//      promedio_valoracion y total_valoraciones en la tabla usuarios. No hay nada más que hacer.
//
//   f) Retornar 201 con la valoración creada.
//
// ─────────────────────────────────────────────────────────────
// 2. GET /api/v1/valoraciones/usuario/:id     [PÚBLICO]
// ─────────────────────────────────────────────────────────────
// Retorna las valoraciones RECIBIDAS por un usuario.
//
// Query sugerida:
//   SELECT v.id, v.calificacion, v.comentario, v.fecha,
//          u.nombre AS evaluador_nombre, u.apellido AS evaluador_apellido
//   FROM valoraciones v
//   JOIN usuarios u ON u.id = v.usuario_id
//   WHERE v.usuario_valorado_id = $1
//   ORDER BY v.fecha DESC
//   LIMIT 20
//
// ─────────────────────────────────────────────────────────────
// Archivos a modificar/crear:
//   - src/services/valoraciones.service.js  (lógica)
//   - src/routes/valoraciones.routes.js     (descomentar rutas)
// ─────────────────────────────────────────────────────────────

module.exports = {};
