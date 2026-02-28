// ============================================================================
// Jest Global Setup — Environment variables for tests
// ============================================================================

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-unit-tests';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-for-unit-tests';
process.env.NODE_ENV = 'test';
