// ============================================================================
// EFVM360 — Endurance Test (Soak Test)
// 20 VUs for 30 minutes — detects memory leaks and connection pool exhaustion
// ============================================================================
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { loginHelper, authHeaders } from '../helpers/auth.js';

const BASE = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  group('health', () => {
    const res = http.get(`${BASE}/api/v1/health`);
    check(res, { 'healthy': (r) => r.status === 200 });
  });

  sleep(2);

  // Periodic login to test session management under sustained load
  if (__ITER % 10 === 0) {
    group('periodic_login', () => {
      const token = loginHelper();
      if (token) {
        const res = http.get(`${BASE}/api/v1/passagens`, {
          headers: authHeaders(token),
          tags: { name: 'GET /passagens (soak)' },
        });
        check(res, { 'list ok': (r) => r.status === 200 });
      }
    });
  }

  sleep(Math.random() * 2 + 1);
}
