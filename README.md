# BildyApp API — Práctica Final

API REST desarrollada con **Node.js 22 + Express 5** para la gestión de albaranes de obra: clientes, proyectos, partes de horas/materiales y firma digital.

---

## Stack

| Capa           | Tecnología                                              |
|----------------|---------------------------------------------------------|
| Runtime        | Node.js 22, ESM nativo                                  |
| Framework      | Express 5                                               |
| Base de datos  | MongoDB + Mongoose 8                                    |
| Autenticación  | JWT (access 15 m + refresh 7 d) + bcryptjs              |
| Validación     | Zod 3                                                   |
| Upload         | Multer (memoryStorage) + Sharp + Cloudinary             |
| PDF            | pdfkit                                                  |
| Tiempo real    | Socket.IO v4 (rooms por compañía)                       |
| Email          | Nodemailer                                              |
| Seguridad      | Helmet, express-rate-limit, express-mongo-sanitize, hpp |
| Docs           | swagger-jsdoc + swagger-ui-express                      |
| Tests          | Jest 29 + Supertest + mongodb-memory-server             |
| Infra          | Docker multi-stage + Docker Compose + GitHub Actions    |

---

## Requisitos

- Node.js **≥ 22**
- MongoDB (local o Atlas)
- (Opcional) Docker + Docker Compose

---

## Instalación rápida

```bash
git clone <repo>
cd Practica_final
npm install
cp .env.example .env
# → Editar .env con tus credenciales
npm run dev
```

Servidor: `http://localhost:3000`  
Docs Swagger: `http://localhost:3000/api-docs`

---

## Variables de entorno (`.env`)

| Variable                | Descripción                                  | Por defecto |
|-------------------------|----------------------------------------------|-------------|
| `PORT`                  | Puerto del servidor                          | `3000`      |
| `NODE_ENV`              | `development` / `production` / `test`        | `development` |
| `MONGO_URI`             | Cadena de conexión MongoDB                   | localhost   |
| `JWT_SECRET`            | Secreto para access token                    | —           |
| `JWT_EXPIRES_IN`        | Caducidad access token                       | `15m`       |
| `JWT_REFRESH_SECRET`    | Secreto para refresh token                   | —           |
| `JWT_REFRESH_EXPIRES_IN`| Caducidad refresh token                      | `7d`        |
| `BCRYPT_SALT_ROUNDS`    | Rondas de bcrypt                             | `12`        |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                        | —           |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                           | —           |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret                        | —           |
| `SMTP_HOST`             | Host SMTP para emails                        | —           |
| `SMTP_PORT`             | Puerto SMTP                                  | `587`       |
| `SMTP_USER`             | Usuario SMTP                                 | —           |
| `SMTP_PASS`             | Contraseña SMTP                              | —           |
| `SLACK_WEBHOOK_URL`     | Webhook de Slack para alertas 5XX            | —           |

---

## Endpoints

### Health
| Método | Ruta      | Descripción                        |
|--------|-----------|------------------------------------|
| GET    | `/health` | Estado del servidor y MongoDB      |

### User (`/api/user`)
| Método | Ruta             | Auth | Descripción                    |
|--------|------------------|------|--------------------------------|
| POST   | `/register`      | —    | Registro + envío de código     |
| PUT    | `/validation`    | ✓    | Verificar email con código     |
| POST   | `/login`         | —    | Login → access + refresh token |
| POST   | `/refresh`       | —    | Renovar access token           |
| POST   | `/logout`        | ✓    | Cerrar sesión                  |
| GET    | `/`              | ✓    | Perfil del usuario             |
| DELETE | `/`              | ✓    | Eliminar cuenta                |

### Client (`/api/client`)
| Método | Ruta              | Descripción                     |
|--------|-------------------|---------------------------------|
| POST   | `/`               | Crear cliente                   |
| GET    | `/`               | Listar con paginación y filtros |
| GET    | `/archived`       | Listar archivados               |
| GET    | `/:id`            | Obtener por id                  |
| PUT    | `/:id`            | Actualizar                      |
| PATCH  | `/:id/restore`    | Restaurar archivado             |
| DELETE | `/:id[?soft=true]`| Eliminar (hard) o archivar      |

### Project (`/api/project`)
Mismos endpoints que Client, añade:
- `GET /archived`, `PATCH /:id/restore`

### DeliveryNote (`/api/deliverynote`)
| Método | Ruta            | Descripción                                  |
|--------|-----------------|----------------------------------------------|
| POST   | `/`             | Crear albarán (hours/material)               |
| GET    | `/`             | Listar con filtros: project, client, signed… |
| GET    | `/pdf/:id`      | Descargar PDF (redirige a Cloudinary o genera)|
| GET    | `/:id`          | Obtener con populate                         |
| PATCH  | `/:id/sign`     | Firmar: sube imagen → genera PDF             |
| DELETE | `/:id`          | Eliminar (rechaza si firmado)                |

---

## Scripts

```bash
npm run dev          # Servidor con --watch (Node.js 22)
npm start            # Producción
npm test             # Tests con Jest + mongodb-memory-server
npm run test:coverage # Tests con cobertura (≥70%)
```

---

## Docker

```bash
# Levantar API + MongoDB
docker compose up --build

# Solo producción (sin hot-reload)
docker compose up -d
```

---

## Tests

Los tests de integración usan `mongodb-memory-server`: no requieren MongoDB instalado.

```bash
npm test
# → auth.test.js  (registro, login, verificación)
# → client.test.js
# → project.test.js
# → deliverynote.test.js
```

---

## Estructura del proyecto

```
src/
├── config/          DB, swagger, env (Zod)
├── controllers/     user, client, project, deliverynote
├── middleware/       auth, validate, error-handler, upload, rate-limit
├── models/          User, Company, Client, Project, DeliveryNote
├── routes/          index + rutas por recurso
├── services/        storage, pdf, mail, logger, realtime
├── sockets/         Socket.IO init + JWT auth middleware
├── utils/           AppError, asyncHandler
├── validators/      Zod schemas
├── app.js
└── index.js         Arranque + graceful shutdown
tests/
├── setup.js         MongoDB in-memory helpers
├── helpers/         factories.js, auth.js
├── auth.test.js
├── client.test.js
├── project.test.js
└── deliverynote.test.js
```

---

## Autor

**Olmen023** — Práctica Final · Bootcamp Desarrollo Web Backend
