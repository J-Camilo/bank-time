1. Valoraciones — src/controllers/valoraciones.controller.js

POST /api/v1/valoraciones → calificar un intercambio completado (1–5 estrellas)
GET /api/v1/valoraciones/usuario/:id → ver valoraciones recibidas por un usuario


2. Admin — src/controllers/admin.controller.js

GET /api/v1/admin/usuarios → listar todos los usuarios con filtros y paginación
PATCH /api/v1/admin/usuarios/:id/activar → activar o desactivar una cuenta
GET /api/v1/admin/publicaciones → listar todas las publicaciones (sin filtro de estado)
DELETE /api/v1/admin/publicaciones/:id → eliminar cualquier publicación (moderación)
GET /api/v1/admin/stats → estadísticas globales (usuarios, intercambios, créditos en circulación)


3. Notificaciones — src/services/notificaciones.service.js

PATCH /api/v1/notificaciones/leer-todas → marcar todas como leídas de un solo golpe


4. Categorías CRUD admin — src/controllers/categorias.controller.js

POST /api/v1/categorias → crear categoría (solo admin)
PUT /api/v1/categorias/:id → editar categoría (solo admin)
DELETE /api/v1/categorias/:id → eliminar categoría (solo admin)