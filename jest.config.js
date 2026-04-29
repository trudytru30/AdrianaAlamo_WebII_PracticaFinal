export default {
  testEnvironment:        'node',
  transform:              {},           // ESM nativo — sin Babel
  testMatch:              ['**/tests/**/*.test.js'],
  testTimeout:            30000,
  verbose:                true,
  // Cobertura
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',                       // entry point — no se testea directamente
    '!src/config/database.js',             // conexión real a MongoDB (tests usan memory-server)
    '!src/services/storage.service.js',    // requiere Cloudinary real (mockeado en tests)
    '!src/services/logger.service.js',     // requiere Slack webhook real
    '!src/sockets/**',                     // requiere conexiones Socket.IO reales
    '!src/middleware/role.middleware.js',  // middleware admin — no hay rutas admin en los tests
  ],
  coverageThreshold: {
    global: {
      lines:     70,
      functions: 70,
      branches:  60,
    },
  },
};
