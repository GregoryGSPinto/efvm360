// ============================================================================
// EFVM360 — Auto-provisioning de Pátios
// Cria estrutura completa + usuários demo ao criar um novo pátio
// ============================================================================

const STORAGE_KEY = 'efvm360-usuarios';

/**
 * Provisiona 4 usuários demo para um novo pátio:
 * - Maquinista (cod + 1001)
 * - Inspetor (cod + 2001)
 * - Gestor (cod + 3001)
 * - Oficial (cod + 4001)
 *
 * Retorna os usuários criados (para exibição no feedback).
 */
export function provisionarUsuariosPatio(
  codigoPatio: string,
  nomePatio: string,
): Array<{ matricula: string; funcao: string }> {
  const usuarios = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const cod = codigoPatio.replace(/[^A-Z0-9]/gi, '').substring(0, 3).toUpperCase();
  const now = new Date().toISOString();

  const novosUsuarios = [
    {
      matricula: `${cod}1001`,
      nome: `Maquinista ${nomePatio.replace(/^Pátio (de |do |da )?/i, '')}`,
      funcao: 'maquinista',
      turno: 'A',
      horarioTurno: '07-19',
      primaryYard: codigoPatio,
      allowedYards: [codigoPatio],
      senha: '123456',
      status: 'active',
      dataCadastro: now,
    },
    {
      matricula: `${cod}2001`,
      nome: `Inspetor ${nomePatio.replace(/^Pátio (de |do |da )?/i, '')}`,
      funcao: 'inspetor',
      turno: 'A',
      horarioTurno: '07-19',
      primaryYard: codigoPatio,
      allowedYards: [codigoPatio],
      senha: '123456',
      status: 'active',
      dataCadastro: now,
    },
    {
      matricula: `${cod}3001`,
      nome: `Gestor ${nomePatio.replace(/^Pátio (de |do |da )?/i, '')}`,
      funcao: 'gestor',
      primaryYard: codigoPatio,
      allowedYards: [codigoPatio],
      senha: '123456',
      status: 'active',
      dataCadastro: now,
    },
    {
      matricula: `${cod}4001`,
      nome: `Oficial ${nomePatio.replace(/^Pátio (de |do |da )?/i, '')}`,
      funcao: 'oficial',
      turno: 'B',
      horarioTurno: '19-07',
      primaryYard: codigoPatio,
      allowedYards: [codigoPatio],
      senha: '123456',
      status: 'active',
      dataCadastro: now,
    },
  ];

  const criados: Array<{ matricula: string; funcao: string }> = [];

  for (const novo of novosUsuarios) {
    const existe = usuarios.find((u: { matricula: string }) => u.matricula === novo.matricula);
    if (!existe) {
      usuarios.push(novo);
      criados.push({ matricula: novo.matricula, funcao: novo.funcao });
    }
  }

  if (criados.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usuarios));
  }

  return criados;
}

/**
 * Verifica se existem pátios ativos sem nenhum usuário vinculado.
 * Se encontrar, provisiona automaticamente.
 */
export function verificarPatiosOrfaos(): void {
  try {
    const patios = JSON.parse(localStorage.getItem('efvm360-patios') || '[]');
    const usuarios = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    for (const patio of patios) {
      if (!patio.ativo) continue;
      const temUsuario = usuarios.some(
        (u: { primaryYard: string; status?: string }) =>
          u.primaryYard === patio.codigo && u.status !== 'inactive',
      );
      if (!temUsuario) {
        provisionarUsuariosPatio(patio.codigo, patio.nome);
      }
    }
  } catch {
    // Fail silently — non-critical operation
  }
}
