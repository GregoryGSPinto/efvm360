// ============================================================================
// VFZ — Stress Test
// Ramps from 10 to 200 VUs to find breaking point
// Monitors error rate and latency degradation
// ============================================================================
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  stages: [
    { duration: '1m', target: 10 },    // Warm up
    { duration: '2m', target: 50 },    // Normal load
    { duration: '2m', target: 100 },   // High load
    { duration: '2m', target: 200 },   // Stress
    { duration: '1m', target: 300 },   // Breaking point
    { duration: '2m', target: 0 },     // Recovery
  ],
  thresholds: {
    http_req_failed: ['rate<0.10'],   // Allow 10% errors under extreme stress
    http_req_duration: ['p(99)<5000'], // p99 under 5s even under stress
  },
};

export default function () {
  const res = http.get(`${BASE}/api/v1/health`, {
    tags: { name: 'GET /health' },
    timeout: '10s',
  });

  check(res, {
    'status 200': (r) => r.status === 200,
    'response < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(Math.random() * 0.5 + 0.3);
}
