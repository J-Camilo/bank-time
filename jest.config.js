module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/services/creditos.service.js',
    'src/services/auth.service.js',
    'src/middlewares/errorHandler.js',
  ],
  coverageThreshold: { global: { functions: 85 } },
};
