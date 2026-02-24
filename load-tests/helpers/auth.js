import http from 'k6/http';

const BASE = __ENV.BASE_URL || 'http://localhost:3001';

export function loginHelper(matricula = 'VALE001', senha = 'Vale@2024') {
  const res = http.post(`${BASE}/api/v1/auth/login`,
    JSON.stringify({ matricula, senha }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } }
  );
  return res.status === 200 ? res.json('accessToken') : null;
}

export function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}
