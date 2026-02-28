// ============================================================================
// GESTÃO DE TROCA DE TURNO – EFVM360
// Serviço de Storage (localStorage)
// ============================================================================

import { STORAGE_KEYS } from '../utils/constants';
import type { ConfiguracaoSistema, Usuario, UsuarioCadastro } from '../types';

// ============================================================================
// FUNÇÕES DE CONFIGURAÇÃO
// ============================================================================

export const storageService = {
  // Configuração do sistema
  getConfig: (): ConfiguracaoSistema | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  setConfig: (config: ConfiguracaoSistema): void => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  },

  // Usuário logado
  getUsuarioLogado: (): Usuario | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USUARIO);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  setUsuarioLogado: (usuario: Usuario): void => {
    localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(usuario));
  },

  removeUsuarioLogado: (): void => {
    localStorage.removeItem(STORAGE_KEYS.USUARIO);
  },

  // Lista de usuários cadastrados
  getUsuarios: (): UsuarioCadastro[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USUARIOS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  setUsuarios: (usuarios: UsuarioCadastro[]): void => {
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuarios));
  },

  addUsuario: (usuario: UsuarioCadastro): void => {
    const usuarios = storageService.getUsuarios();
    usuarios.push(usuario);
    storageService.setUsuarios(usuarios);
  },

  findUsuarioByMatricula: (matricula: string): UsuarioCadastro | undefined => {
    const usuarios = storageService.getUsuarios();
    return usuarios.find((u) => u.matricula === matricula);
  },

  // Limpar todos os dados
  clearAll: (): void => {
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
    localStorage.removeItem(STORAGE_KEYS.USUARIO);
    localStorage.removeItem(STORAGE_KEYS.USUARIOS);
  },
};

export default storageService;
