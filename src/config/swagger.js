import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'BildyApp API',
      version:     '1.0.0',
      description: 'API REST para gestión de albaranes de obra. Permite gestionar usuarios, clientes, proyectos y albaranes con firma digital.',
      contact: {
        name:  'Olmen023',
        email: 'hugoolza1@gmail.com',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Desarrollo local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
          description:  'Token JWT obtenido en /api/user/login',
        },
      },
      schemas: {
        // ── User ──────────────────────────────────────────────────────────────
        UserRegister: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', minLength: 8, example: 'Segura123!' },
          },
        },
        UserLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        TokenResponse: {
          type: 'object',
          properties: {
            accessToken:  { type: 'string' },
            refreshToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                email:  { type: 'string' },
                status: { type: 'string', enum: ['pending', 'verified'] },
                role:   { type: 'string', enum: ['admin', 'guest'] },
              },
            },
          },
        },
        // ── Client ────────────────────────────────────────────────────────────
        ClientCreate: {
          type: 'object',
          required: ['name', 'cif'],
          properties: {
            name:    { type: 'string', example: 'Constructora Pérez SL' },
            cif:     { type: 'string', example: 'B12345678' },
            email:   { type: 'string', format: 'email' },
            phone:   { type: 'string', example: '600123456' },
            address: { $ref: '#/components/schemas/Address' },
          },
        },
        // ── Project ───────────────────────────────────────────────────────────
        ProjectCreate: {
          type: 'object',
          required: ['client', 'name', 'projectCode'],
          properties: {
            client:      { type: 'string', description: 'ObjectId del cliente' },
            name:        { type: 'string', example: 'Reforma oficinas 3ª planta' },
            projectCode: { type: 'string', example: 'PRJ-2026-001' },
            address:     { $ref: '#/components/schemas/Address' },
            email:       { type: 'string', format: 'email' },
            notes:       { type: 'string' },
          },
        },
        // ── DeliveryNote ──────────────────────────────────────────────────────
        DeliveryNoteCreate: {
          type: 'object',
          required: ['project', 'client', 'format', 'workDate'],
          properties: {
            project:     { type: 'string', description: 'ObjectId del proyecto' },
            client:      { type: 'string', description: 'ObjectId del cliente' },
            format:      { type: 'string', enum: ['hours', 'material'] },
            description: { type: 'string' },
            workDate:    { type: 'string', format: 'date-time' },
            hours:       { type: 'number', description: 'Solo para format=hours' },
            workers:     {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name:  { type: 'string' },
                  hours: { type: 'number' },
                },
              },
            },
            material:    { type: 'string', description: 'Solo para format=material' },
            quantity:    { type: 'number' },
            unit:        { type: 'string' },
          },
        },
        // ── Shared ────────────────────────────────────────────────────────────
        Address: {
          type: 'object',
          properties: {
            street:   { type: 'string' },
            number:   { type: 'string' },
            postal:   { type: 'string' },
            city:     { type: 'string' },
            province: { type: 'string' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            totalItems:  { type: 'integer' },
            totalPages:  { type: 'integer' },
            currentPage: { type: 'integer' },
            limit:       { type: 'integer' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status:  { type: 'string', example: 'error' },
            message: { type: 'string' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Token JWT ausente o inválido',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        NotFound: {
          description: 'Recurso no encontrado',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Conflict: {
          description: 'Conflicto con el estado actual del recurso',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        ValidationError: {
          description: 'Error de validación de campos',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Health',       description: 'Estado del servicio' },
      { name: 'User',         description: 'Registro, autenticación y perfil' },
      { name: 'Client',       description: 'Gestión de clientes' },
      { name: 'Project',      description: 'Gestión de proyectos' },
      { name: 'DeliveryNote', description: 'Albaranes: CRUD, firma y PDF' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJSDoc(options);
