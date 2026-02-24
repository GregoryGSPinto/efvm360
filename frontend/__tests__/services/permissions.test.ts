// ============================================================================
// VFZ Frontend — Tests: Permissions Service
// ============================================================================
import { describe, it, expect } from 'vitest';
import {
  mapearFuncaoParaPerfil,
  verificarPermissao,
  verificarAcessoRota,
  obterPermissoesPerfil,
  verificarNivelHierarquico,
  PERFIS_PERMISSAO,
} from '../../src/services/permissions';

describe('permissions.ts', () => {
  describe('mapearFuncaoParaPerfil', () => {
    it('deve mapear maquinista → operador', () => {
      expect(mapearFuncaoParaPerfil('maquinista')).toBe('operador');
    });

    it('deve mapear supervisor → gestor', () => {
      expect(mapearFuncaoParaPerfil('supervisor')).toBe('gestor');
    });

    it('deve mapear administrador → administrador', () => {
      expect(mapearFuncaoParaPerfil('administrador')).toBe('administrador');
    });

    it('deve mapear admin → administrador', () => {
      expect(mapearFuncaoParaPerfil('admin')).toBe('administrador');
    });

    it('deve mapear função desconhecida → operador (padrão seguro)', () => {
      expect(mapearFuncaoParaPerfil('funcao_inventada')).toBe('operador');
      expect(mapearFuncaoParaPerfil('')).toBe('operador');
    });

    it('deve ser case-insensitive', () => {
      expect(mapearFuncaoParaPerfil('MAQUINISTA')).toBe('operador');
      expect(mapearFuncaoParaPerfil('Supervisor')).toBe('gestor');
    });
  });

  describe('verificarPermissao', () => {
    it('operador pode visualizar passagem', () => {
      expect(verificarPermissao('operador', 'passagem', 'visualizar')).toBe(true);
    });

    it('operador NÃO pode exportar passagem', () => {
      expect(verificarPermissao('operador', 'passagem', 'exportar')).toBe(false);
    });

    it('administrador pode configurar tudo', () => {
      expect(verificarPermissao('administrador', 'sistema', 'configurar')).toBe(true);
      expect(verificarPermissao('administrador', 'usuarios', 'editar')).toBe(true);
    });
  });

  describe('verificarAcessoRota', () => {
    it('operador pode acessar passagem', () => {
      expect(verificarAcessoRota('operador', 'passagem')).toBe(true);
    });

    it('operador NÃO pode acessar rota de usuarios', () => {
      expect(verificarAcessoRota('operador', 'usuarios')).toBe(false);
    });

    it('administrador pode acessar todas as rotas', () => {
      expect(verificarAcessoRota('administrador', 'sistema')).toBe(true);
      expect(verificarAcessoRota('administrador', 'auditoria')).toBe(true);
    });
  });

  describe('obterPermissoesPerfil', () => {
    it('deve retornar objeto completo para perfil válido', () => {
      const perms = obterPermissoesPerfil('gestor');
      expect(perms).not.toBeNull();
      expect(perms!.nivel).toBe(4);
      expect(perms!.permissoes.passagem.editar).toBe(true);
    });

    it('deve retornar null para perfil inválido', () => {
      expect(obterPermissoesPerfil('invalido' as any)).toBeNull();
    });
  });

  describe('Hierarquia', () => {
    it('deve respeitar hierarquia: operador(1) < oficial(2) < inspetor(3) < gestor(4) < administrador(5)', () => {
      expect(PERFIS_PERMISSAO.operador.nivel).toBe(1);
      expect(PERFIS_PERMISSAO.oficial.nivel).toBe(2);
      expect(PERFIS_PERMISSAO.inspetor.nivel).toBe(3);
      expect(PERFIS_PERMISSAO.gestor.nivel).toBe(4);
      expect(PERFIS_PERMISSAO.administrador.nivel).toBe(5);
    });

    it('verificarNivelHierarquico verifica nível correto', () => {
      expect(verificarNivelHierarquico('gestor', 3)).toBe(true);
      expect(verificarNivelHierarquico('operador', 3)).toBe(false);
    });
  });
});
