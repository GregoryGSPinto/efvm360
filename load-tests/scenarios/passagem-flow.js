// ============================================================================
// VFZ — Passagem Flow Test
// Simula fluxo completo: login → criar passagem → listar → assinar
// 10 operadores simultâneos por 5 minutos
// Threshold: p95 < 1000ms para operações de passagem
// ============================================================================
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { loginHelper, authHeaders } from '../helpers/auth.js';

const passagemDuration = new Trend('vfz_passagem_create_duration', true);
const passagemErrors = new Counter('vfz_passagem_errors');

const BASE = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  scenarios: {
    operational_flow: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
    vfz_passagem_errors: ['count<10'],
  },
};

export default function () {
  let token;

  group('01_login', () => {
    token = loginHelper('VALE001', 'Vale@2024');
    check(token, { 'login success': (t) => t !== null });
  });

  if (!token) { passagemErrors.add(1); return; }
  const headers = authHeaders(token);

  sleep(1);

  group('02_criar_passagem', () => {
    const payload = JSON.stringify({
      cabecalho: {
        data: new Date().toISOString().split('T')[0],
        turno: __ITER % 2 === 0 ? 'A' : 'B',
        horario: __ITER % 2 === 0 ? '07:00' : '19:00',
      },
      patioCima: [
        { numero: 1, status: 'livre', trem: '', observacao: '' },
        { numero: 2, status: 'ocupada', trem: 'PRE-001', observacao: 'Teste carga' },
      ],
      patioBaixo: [],
    });

    const start = Date.now();
    const res = http.post(`${BASE}/api/v1/passagens`, payload, {
      headers,
      tags: { name: 'POST /passagens' },
    });
    passagemDuration.add(Date.now() - start);

    check(res, { 'passagem created': (r) => r.status === 201 || r.status === 200 });
  });

  sleep(2);

  group('03_listar_passagens', () => {
    const res = http.get(`${BASE}/api/v1/passagens`, {
      headers,
      tags: { name: 'GET /passagens' },
    });
    check(res, { 'list success': (r) => r.status === 200 });
  });

  sleep(1);

  group('04_health_check', () => {
    const res = http.get(`${BASE}/api/v1/health`, {
      tags: { name: 'GET /health' },
    });
    check(res, { 'health ok': (r) => r.status === 200 });
  });

  sleep(Math.random() * 3 + 1);
}
