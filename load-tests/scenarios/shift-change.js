// ============================================================================
// VFZ — Shift Change Simulation
// Simulates the critical moment when 2 shifts overlap:
//   - Outgoing shift: finishing/signing passagens
//   - Incoming shift: logging in, reviewing
// Peak: 40 concurrent users for 5 minutes
// ============================================================================
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { loginHelper, authHeaders } from '../helpers/auth.js';

const BASE = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  scenarios: {
    incoming_shift: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },   // Incoming logs in
        { duration: '3m', target: 20 },   // Reviewing
        { duration: '1m', target: 0 },    // Done
      ],
      exec: 'incomingShift',
    },
    outgoing_shift: {
      executor: 'ramping-vus',
      startVUs: 20,
      stages: [
        { duration: '2m', target: 20 },   // Finishing up
        { duration: '2m', target: 5 },    // Signing out
        { duration: '1m', target: 0 },    // Gone
      ],
      exec: 'outgoingShift',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.05'],
  },
};

export function incomingShift() {
  group('incoming_login', () => {
    const token = loginHelper(`VALE${String(__VU + 100).padStart(3, '0')}`, 'Vale@2024');
    if (token) {
      http.get(`${BASE}/api/v1/passagens`, {
        headers: authHeaders(token),
        tags: { name: 'GET /passagens (incoming)' },
      });
    }
  });
  sleep(Math.random() * 3 + 2);
}

export function outgoingShift() {
  group('outgoing_submit', () => {
    const token = loginHelper(`VALE${String(__VU).padStart(3, '0')}`, 'Vale@2024');
    if (token) {
      const headers = authHeaders(token);
      http.post(`${BASE}/api/v1/passagens`, JSON.stringify({
        cabecalho: { data: new Date().toISOString().split('T')[0], turno: 'A', horario: '07:00' },
        patioCima: [], patioBaixo: [],
      }), { headers, tags: { name: 'POST /passagens (outgoing)' } });
    }
  });
  sleep(Math.random() * 2 + 1);
}
