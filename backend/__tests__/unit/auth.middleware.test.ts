// ============================================================================
// Unit Tests — src/middleware/auth.ts
// Mocks jwt.verify — no database needed
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize } from '../../src/middleware/auth';
import type { JWTPayload } from '../../src/middleware/auth';

// Mock Express objects factory
const mockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  headers: {},
  ...overrides,
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = jest.fn();

// JWT secret — must match what the middleware uses (set in __tests__/setup.ts)
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-unit-tests';

// Helper: create a valid access token
const createValidToken = (overrides: Partial<JWTPayload> = {}): string => {
  const payload: JWTPayload = {
    userId: 1,
    uuid: 'test-uuid-123',
    matricula: 'VALE001',
    funcao: 'operador',
    primaryYard: 'VFZ',
    type: 'access',
    ...overrides,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

describe('authenticate middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject request without Authorization header', () => {
    const req = mockRequest({ headers: {} });
    const res = mockResponse();

    authenticate(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AUTH_MISSING_TOKEN' })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject request with malformed Authorization header (no Bearer)', () => {
    const req = mockRequest({ headers: { authorization: 'Token abc123' } });
    const res = mockResponse();

    authenticate(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AUTH_MISSING_TOKEN' })
    );
  });

  it('should reject request with invalid Bearer token', () => {
    const req = mockRequest({ headers: { authorization: 'Bearer invalid.token.here' } });
    const res = mockResponse();

    authenticate(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AUTH_INVALID_TOKEN' })
    );
  });

  it('should reject request with expired token', () => {
    // Create a token that expires immediately
    const expiredToken = jwt.sign(
      { userId: 1, uuid: 'x', matricula: 'V001', funcao: 'op', type: 'access' },
      JWT_SECRET,
      { expiresIn: '0s' }
    );

    const req = mockRequest({ headers: { authorization: `Bearer ${expiredToken}` } });
    const res = mockResponse();

    // Small delay to ensure expiry
    authenticate(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AUTH_TOKEN_EXPIRED' })
    );
  });

  it('should reject request with token type "refresh" (not "access")', () => {
    const refreshToken = jwt.sign(
      { userId: 1, uuid: 'x', matricula: 'V001', funcao: 'op', type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const req = mockRequest({ headers: { authorization: `Bearer ${refreshToken}` } });
    const res = mockResponse();

    authenticate(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AUTH_INVALID_TOKEN_TYPE' })
    );
  });

  it('should accept valid access token and populate req.user', () => {
    const token = createValidToken({ userId: 42, matricula: 'VALE042' });
    const req = mockRequest({ headers: { authorization: `Bearer ${token}` } });
    const res = mockResponse();

    authenticate(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect((req as any).user).toBeDefined();
    expect((req as any).user.userId).toBe(42);
    expect((req as any).user.matricula).toBe('VALE042');
    expect((req as any).user.type).toBe('access');
  });
});

describe('authorize middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if req.user is not set', () => {
    const req = mockRequest({});
    const res = mockResponse();
    const middleware = authorize('administrador');

    middleware(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AUTH_REQUIRED' })
    );
  });

  it('should accept user with sufficient profile level', () => {
    const req = mockRequest({}) as any;
    req.user = { userId: 1, uuid: 'x', matricula: 'V001', funcao: 'administrador', type: 'access' };
    const res = mockResponse();
    const middleware = authorize('gestor');

    middleware(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject user with insufficient profile level', () => {
    const req = mockRequest({}) as any;
    req.user = { userId: 1, uuid: 'x', matricula: 'V001', funcao: 'operador', type: 'access' };
    const res = mockResponse();
    const middleware = authorize('administrador');

    middleware(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AUTH_FORBIDDEN' })
    );
  });

  // ── Function → Profile mapping tests ──────────────────────────────────

  it('should map "maquinista" to "operador" profile', () => {
    const req = mockRequest({}) as any;
    req.user = { userId: 1, uuid: 'x', matricula: 'V001', funcao: 'maquinista', type: 'access' };
    const res = mockResponse();

    // operador (level 1) should access operador-level routes
    authorize('operador')(req as Request, res as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should map "supervisor" to "supervisor" profile', () => {
    const req = mockRequest({}) as any;
    req.user = { userId: 1, uuid: 'x', matricula: 'V001', funcao: 'supervisor', type: 'access' };
    const res = mockResponse();

    // supervisor (level 3) should access inspetor-level routes (level 2)
    authorize('inspetor')(req as Request, res as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should map "administrador" directly to "administrador" profile', () => {
    const req = mockRequest({}) as any;
    req.user = { userId: 1, uuid: 'x', matricula: 'V001', funcao: 'administrador', type: 'access' };
    const res = mockResponse();

    authorize('administrador')(req as Request, res as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should map unknown function to "operador" (safe default)', () => {
    const req = mockRequest({}) as any;
    req.user = { userId: 1, uuid: 'x', matricula: 'V001', funcao: 'funcao_desconhecida', type: 'access' };
    const res = mockResponse();

    // Should have operador level (1) → cannot access gestor level (4)
    authorize('gestor')(req as Request, res as Response, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  // ── Hierarchy order tests ─────────────────────────────────────────────

  it('should enforce 8-level hierarchy: operador < inspetor < supervisor < coordenador < gerente < diretor < administrador < suporte', () => {
    // Matches the actual middleware mapping (v3.3 — 8 níveis)
    // Note: oficial maps to level 1 (same as operador)
    const roles = [
      { funcao: 'operador', level: 1 },
      { funcao: 'inspetor', level: 2 },
      { funcao: 'supervisor', level: 3 },
      { funcao: 'coordenador', level: 4 },
      { funcao: 'gerente', level: 5 },
      { funcao: 'diretor', level: 6 },
      { funcao: 'administrador', level: 7 },
    ];

    // Each role should be able to access its own level and below, but not above
    for (let i = 0; i < roles.length; i++) {
      const req = mockRequest({}) as any;
      req.user = { userId: 1, uuid: 'x', matricula: 'V001', funcao: roles[i].funcao, type: 'access' };

      // Should access own level
      const resOwn = mockResponse();
      const nextOwn = jest.fn();
      authorize(roles[i].funcao)(req as Request, resOwn as Response, nextOwn);
      expect(nextOwn).toHaveBeenCalled();

      // Should NOT access the next higher level (except last)
      if (i < roles.length - 1) {
        const resHigher = mockResponse();
        const nextHigher = jest.fn();
        authorize(roles[i + 1].funcao)(req as Request, resHigher as Response, nextHigher);
        expect(resHigher.status).toHaveBeenCalledWith(403);
      }
    }
  });
});
