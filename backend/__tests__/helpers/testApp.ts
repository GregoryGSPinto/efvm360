// ============================================================================
// Test Helper — Express App Factory for Integration Tests
// Uses SQLite in-memory (via jest module mocks set up in each test file)
// ============================================================================

import express from 'express';

/**
 * Creates a minimal Express app for integration testing.
 * Module mocks for database/models should be set up BEFORE importing this.
 */
export const createTestApp = () => {
  const app = express();

  // Body parsing
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  return app;
};
