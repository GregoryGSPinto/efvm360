// ============================================================================
// VFZ — Login Burst Test
// Simula rajada de logins na troca de turno (20 operadores em 2 minutos)
// Threshold: p95 < 500ms, error rate < 1%
// ============================================================================
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const loginDuration = new Trend('vfz_login_duration', true);
const loginFailures = new Counter('vfz_login_failures');

const BASE = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  scenarios: {
    shift_change: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },  // Ramp up
        { duration: '60s', target: 20 },  // Sustain
        { duration: '30s', target: 0 },   // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    vfz_login_failures: ['count<5'],
  },
};

export default function () {
  const payload = JSON.stringify({
    matricula: `VALE${String(__VU).padStart(3, '0')}`,
    senha: 'Vale@2024',
  });

  const start = Date.now();
  const res = http.post(`${BASE}/api/v1/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST /auth/login' },
  });
  loginDuration.add(Date.now() - start);

  const ok = check(res, {
    'login: status 200 ou 401': (r) => [200, 401].includes(r.status),
    'login: response has body': (r) => r.body.length > 0,
  });
  if (!ok) loginFailures.add(1);

  sleep(Math.random() * 2 + 1);
}
