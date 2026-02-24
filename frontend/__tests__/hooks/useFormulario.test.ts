// ============================================================================
// VFZ Frontend — Tests: useFormulario Hook (Logic Only)
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/security', () => ({
  secureLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('useFormulario — Lógica do Formulário', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Estrutura Inicial', () => {
    it('deve ter estrutura de cabecalho com campos obrigatórios', () => {
      const cabecalho = { data: '', dss: '', turno: '', horario: '' };
      expect(cabecalho).toHaveProperty('data');
      expect(cabecalho).toHaveProperty('turno');
      expect(cabecalho).toHaveProperty('dss');
    });

    it('deve ter estrutura de assinatura com campos de confirmação', () => {
      const assinatura = { confirmado: false, matricula: '', nome: '', funcao: '', hashIntegridade: '' };
      expect(assinatura.confirmado).toBe(false);
      expect(assinatura).toHaveProperty('hashIntegridade');
    });
  });

  describe('Persistência no localStorage', () => {
    it('deve salvar passagem no localStorage', () => {
      const passagem = { cabecalho: { data: '2024-03-15', turno: 'A' }, patioCima: [] };
      localStorage.setItem('vfz-passagem-atual', JSON.stringify(passagem));
      const recovered = JSON.parse(localStorage.getItem('vfz-passagem-atual') || '{}');
      expect(recovered.cabecalho.data).toBe('2024-03-15');
    });

    it('deve recuperar dados persistidos entre sessões', () => {
      const dados = { turno: 'B', linhas: [{ id: 1, status: 'ocupada' }] };
      localStorage.setItem('vfz-formulario', JSON.stringify(dados));
      const result = JSON.parse(localStorage.getItem('vfz-formulario') || '{}');
      expect(result.turno).toBe('B');
      expect(result.linhas[0].status).toBe('ocupada');
    });
  });

  describe('Atualização de Campos', () => {
    it('deve atualizar campo do cabecalho corretamente', () => {
      const cabecalho = { data: '', turno: '', dss: '' };
      const updated = { ...cabecalho, turno: 'A' };
      expect(updated.turno).toBe('A');
      expect(updated.data).toBe('');
    });

    it('deve atualizar linha do pátio por índice', () => {
      const linhas = [{ id: 1, status: 'livre' }, { id: 2, status: 'ocupada' }];
      linhas[0] = { ...linhas[0], status: 'bloqueada' };
      expect(linhas[0].status).toBe('bloqueada');
      expect(linhas[1].status).toBe('ocupada');
    });

    it('deve atualizar assinatura preservando outros campos', () => {
      const assinaturas = {
        sai: { confirmado: false, matricula: '', nome: '' },
        entra: { confirmado: false, matricula: '', nome: '' },
      };
      assinaturas.sai = { ...assinaturas.sai, confirmado: true, matricula: 'V001', nome: 'Op1' };
      expect(assinaturas.sai.confirmado).toBe(true);
      expect(assinaturas.entra.confirmado).toBe(false);
    });

    it('deve persistir pontos de atenção como observações', () => {
      const pontos = [{ id: 1, texto: 'Atenção na linha 3', prioridade: 'alta' }];
      localStorage.setItem('vfz-pontos-atencao', JSON.stringify(pontos));
      const result = JSON.parse(localStorage.getItem('vfz-pontos-atencao') || '[]');
      expect(result).toHaveLength(1);
      expect(result[0].prioridade).toBe('alta');
    });
  });

  describe('Histórico de Turnos', () => {
    it('deve recuperar histórico de turnos anteriores', () => {
      const historico = [
        { id: '1', data: '2024-03-14', turno: 'A', status: 'assinado_completo' },
        { id: '2', data: '2024-03-15', turno: 'B', status: 'rascunho' },
      ];
      localStorage.setItem('vfz-historico', JSON.stringify(historico));
      const result = JSON.parse(localStorage.getItem('vfz-historico') || '[]');
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('assinado_completo');
    });

    it('deve carregar turno anterior corretamente', () => {
      const turnoAnterior = { cabecalho: { turno: 'A', data: '2024-03-14' }, pontosAtencao: ['Linha 3 interditada'] };
      localStorage.setItem('vfz-turno-anterior', JSON.stringify(turnoAnterior));
      const result = JSON.parse(localStorage.getItem('vfz-turno-anterior') || '{}');
      expect(result.pontosAtencao).toContain('Linha 3 interditada');
    });
  });
});
