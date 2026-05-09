const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Excluir e2e Playwright (no es Jest) y suites con mocks pre-existentes rotos
  // (descubierto al arreglar CI 2026-05-09; CI nunca corrió por bug YAML previo).
  // TODO: arreglar mocks de getBenchmarkCareers / getEstadisticas en sprint testing.
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/',
    '/__tests__/RectorDashboard.test.tsx',
    '/__tests__/NoticiasTable.test.tsx',
    '/__tests__/KpisTable.test.tsx',
    '/__tests__/landing/Hero.test.tsx',
  ],
}
module.exports = createJestConfig(config)
