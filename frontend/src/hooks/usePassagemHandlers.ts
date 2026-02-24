// ============================================================================
// EFVM360 v3.2 — Hook: Passagem Handlers
// Extraído de App.tsx — senha confirmation, entendimento turno, DSS search
// ============================================================================

import { useState, useCallback } from 'react';
import type { UsuarioCadastro, DadosDSS } from '../types';
import { STORAGE_KEYS } from '../utils/constants';

// ── Tipos ───────────────────────────────────────────────────────────────

interface PerguntaEntendimento {
  pergunta: string;
  respostaEsperada: string;
  dica: string;
  campo: string;
}

interface UsePassagemHandlersReturn {
  // Senha Entrada
  mostrarModalSenha: boolean;
  setMostrarModalSenha: (v: boolean) => void;
  senhaConfirmacao: string;
  setSenhaConfirmacao: (v: string) => void;
  erroSenhaConfirmacao: string;
  handleConfirmarSenhaEntrada: () => Promise<void>;

  // Senha Saída
  mostrarModalSenhaSaida: boolean;
  setMostrarModalSenhaSaida: (v: boolean) => void;
  senhaSaida: string;
  setSenhaSaida: (v: string) => void;
  erroSenhaSaida: string;
  handleConfirmarSenhaSaida: () => Promise<void>;

  // Entendimento
  mostrarConfirmacaoEntendimento: boolean;
  perguntaEntendimento: PerguntaEntendimento | null;
  respostaUsuario: string;
  setRespostaUsuario: (v: string) => void;
  entendimentoConfirmado: boolean;
  houveReforco: boolean;
  mostrarFeedbackEntendimento: boolean;
  iniciarConfirmacaoEntendimento: () => void;
  verificarRespostaEntendimento: () => void;
  confirmarAposReforco: () => void;

  // DSS Search
  buscaDSSData: string;
  setBuscaDSSData: (v: string) => void;
  mostrarBuscaDSS: boolean;
  setMostrarBuscaDSS: (v: boolean) => void;
  buscarDSSDoTurno: (dataFiltro?: string) => DadosDSS | null;

  // Password Change
  mostrarAlterarSenha: boolean;
  setMostrarAlterarSenha: (v: boolean) => void;
  senhaAtual: string;
  setSenhaAtual: (v: string) => void;
  novaSenha: string;
  setNovaSenha: (v: string) => void;
  confirmarNovaSenha: string;
  setConfirmarNovaSenha: (v: string) => void;
  erroAlterarSenha: string;
  setErroAlterarSenha: (v: string) => void;
  sucessoAlterarSenha: boolean;
  setSucessoAlterarSenha: (v: boolean) => void;
  handleAlterarSenha: () => Promise<void>;

  // Helpers
  verificarMatriculaCadastrada: (matricula: string) => { cadastrada: boolean; usuario?: Pick<UsuarioCadastro, 'nome' | 'funcao' | 'matricula'> };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function usePassagemHandlers(
  usuarioLogado: UsuarioCadastro | null,
  dadosCabecalho: { matriculaEntra?: string; matriculaSai?: string },
  historicoDSS: DadosDSS[],
  registrarAuditoria: (tipo: string, area: string, detalhe: string) => void,
): UsePassagemHandlersReturn {

  // ── Senha Entrada ─────────────────────────────────────────────────────
  const [mostrarModalSenha, setMostrarModalSenha] = useState(false);
  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');
  const [erroSenhaConfirmacao, setErroSenhaConfirmacao] = useState('');

  // ── Senha Saída ───────────────────────────────────────────────────────
  const [mostrarModalSenhaSaida, setMostrarModalSenhaSaida] = useState(false);
  const [senhaSaida, setSenhaSaida] = useState('');
  const [erroSenhaSaida, setErroSenhaSaida] = useState('');

  // ── Entendimento ──────────────────────────────────────────────────────
  const [mostrarConfirmacaoEntendimento, setMostrarConfirmacaoEntendimento] = useState(false);
  const [perguntaEntendimento, setPerguntaEntendimento] = useState<PerguntaEntendimento | null>(null);
  const [respostaUsuario, setRespostaUsuario] = useState('');
  const [entendimentoConfirmado, setEntendimentoConfirmado] = useState(false);
  const [houveReforco, setHouveReforco] = useState(false);
  const [mostrarFeedbackEntendimento, setMostrarFeedbackEntendimento] = useState(false);

  // ── DSS Search ────────────────────────────────────────────────────────
  const [buscaDSSData, setBuscaDSSData] = useState('');
  const [mostrarBuscaDSS, setMostrarBuscaDSS] = useState(false);

  // ── Password Change ───────────────────────────────────────────────────
  const [mostrarAlterarSenha, setMostrarAlterarSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [erroAlterarSenha, setErroAlterarSenha] = useState('');
  const [sucessoAlterarSenha, setSucessoAlterarSenha] = useState(false);

  // ── Verificação de senha (shared) ─────────────────────────────────────
  const verificarSenhaUsuario = useCallback(async (matricula: string, senha: string): Promise<boolean> => {
    try {
      const { verificarSenhaHash, hashSenha } = await import('../services/security');
      const usuarios: UsuarioCadastro[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIOS) || '[]');
      const usuario = usuarios.find((u) => u.matricula.trim() === matricula.trim());
      if (!usuario) return false;

      if ((usuario as unknown as Record<string, unknown>).senhaHash) {
        return await verificarSenhaHash(senha, matricula.trim(), (usuario as unknown as Record<string, unknown>).senhaHash as string);
      } else if ((usuario as unknown as Record<string, unknown>).senha) {
        const valido = (usuario as unknown as Record<string, unknown>).senha === senha;
        if (valido) {
          (usuario as unknown as Record<string, unknown>).senhaHash = await hashSenha(senha, matricula.trim());
          delete (usuario as unknown as Record<string, unknown>).senha;
          localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuarios));
        }
        return valido;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleConfirmarSenhaEntrada = useCallback(async () => {
    const matriculaEntra = dadosCabecalho.matriculaEntra || usuarioLogado?.matricula || '';
    if (!senhaConfirmacao.trim()) {
      setErroSenhaConfirmacao('Digite sua senha para confirmar');
      return;
    }
    const valida = await verificarSenhaUsuario(matriculaEntra, senhaConfirmacao);
    if (valida) {
      setMostrarModalSenha(false);
      setSenhaConfirmacao('');
      setErroSenhaConfirmacao('');
      registrarAuditoria('ASSINATURA_ENTRADA', 'passagem', `Confirmação: ${matriculaEntra}`);
    } else {
      setErroSenhaConfirmacao('Senha incorreta');
    }
  }, [senhaConfirmacao, dadosCabecalho, usuarioLogado, verificarSenhaUsuario, registrarAuditoria]);

  const handleConfirmarSenhaSaida = useCallback(async () => {
    const matriculaSai = dadosCabecalho.matriculaSai || '';
    if (!senhaSaida.trim()) {
      setErroSenhaSaida('Digite a senha do operador que está saindo');
      return;
    }
    const valida = await verificarSenhaUsuario(matriculaSai, senhaSaida);
    if (valida) {
      setMostrarModalSenhaSaida(false);
      setSenhaSaida('');
      setErroSenhaSaida('');
      registrarAuditoria('ASSINATURA_SAIDA', 'passagem', `Confirmação: ${matriculaSai}`);
    } else {
      setErroSenhaSaida('Senha incorreta');
    }
  }, [senhaSaida, dadosCabecalho, verificarSenhaUsuario, registrarAuditoria]);

  const gerarPerguntaEntendimento = useCallback((): PerguntaEntendimento => {
    const perguntas: PerguntaEntendimento[] = [
      { pergunta: 'Qual turno está assumindo?', respostaEsperada: 'turno', dica: 'Verifique o cabeçalho', campo: 'turno' },
      { pergunta: 'Há alguma restrição operacional ativa?', respostaEsperada: 'restricao', dica: 'Verifique a seção de segurança', campo: 'restricao' },
      { pergunta: 'Existem linhas interditadas?', respostaEsperada: 'interditada', dica: 'Verifique o layout do pátio', campo: 'linhas' },
    ];
    return perguntas[Math.floor(Math.random() * perguntas.length)];
  }, []);

  const iniciarConfirmacaoEntendimento = useCallback(() => {
    const pergunta = gerarPerguntaEntendimento();
    setPerguntaEntendimento(pergunta);
    setRespostaUsuario('');
    setMostrarConfirmacaoEntendimento(true);
    setHouveReforco(false);
    setMostrarFeedbackEntendimento(false);
  }, [gerarPerguntaEntendimento]);

  const verificarRespostaEntendimento = useCallback(() => {
    if (respostaUsuario.trim().length > 0) {
      setEntendimentoConfirmado(true);
      setMostrarConfirmacaoEntendimento(false);
      setMostrarFeedbackEntendimento(true);
      registrarAuditoria('ENTENDIMENTO_CONFIRMADO', 'passagem', `Resposta: ${respostaUsuario.substring(0, 50)}`);
      setTimeout(() => setMostrarFeedbackEntendimento(false), 3000);
    }
  }, [respostaUsuario, registrarAuditoria]);

  const confirmarAposReforco = useCallback(() => {
    setHouveReforco(true);
    setEntendimentoConfirmado(true);
    setMostrarConfirmacaoEntendimento(false);
    registrarAuditoria('ENTENDIMENTO_REFORCO', 'passagem', 'Confirmado após reforço');
  }, [registrarAuditoria]);

  const buscarDSSDoTurno = useCallback((dataFiltro?: string): DadosDSS | null => {
    const data = dataFiltro || buscaDSSData;
    if (!data) return null;
    return historicoDSS.find((d) => d.data === data) || null;
  }, [buscaDSSData, historicoDSS]);

  const handleAlterarSenha = useCallback(async () => {
    setErroAlterarSenha('');
    if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
      setErroAlterarSenha('Preencha todos os campos');
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      setErroAlterarSenha('Nova senha e confirmação não conferem');
      return;
    }
    if (novaSenha.length < 6) {
      setErroAlterarSenha('Nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    try {
      const { verificarSenhaHash, hashSenha } = await import('../services/security');
      const usuarios: UsuarioCadastro[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIOS) || '[]');
      const idx = usuarios.findIndex((u) => u.matricula === usuarioLogado?.matricula);
      if (idx === -1) { setErroAlterarSenha('Usuário não encontrado'); return; }

      const usuario = usuarios[idx];
      let senhaValida = false;
      if ((usuario as unknown as Record<string, unknown>).senhaHash) {
        senhaValida = await verificarSenhaHash(senhaAtual, usuario.matricula, (usuario as unknown as Record<string, unknown>).senhaHash as string);
      } else if ((usuario as unknown as Record<string, unknown>).senha) {
        senhaValida = (usuario as unknown as Record<string, unknown>).senha === senhaAtual;
      }
      if (!senhaValida) { setErroAlterarSenha('Senha atual incorreta'); return; }

      (usuarios[idx] as unknown as Record<string, unknown>).senhaHash = await hashSenha(novaSenha, usuario.matricula);
      delete (usuarios[idx] as unknown as Record<string, unknown>).senha;
      localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuarios));
      registrarAuditoria('SENHA_ALTERADA', 'configuracoes', `Matrícula: ${usuario.matricula}`);

      setSucessoAlterarSenha(true);
      setSenhaAtual(''); setNovaSenha(''); setConfirmarNovaSenha('');
      setTimeout(() => { setMostrarAlterarSenha(false); setSucessoAlterarSenha(false); }, 2000);
    } catch {
      setErroAlterarSenha('Erro ao alterar senha');
    }
  }, [senhaAtual, novaSenha, confirmarNovaSenha, usuarioLogado, registrarAuditoria]);

  const verificarMatriculaCadastrada = useCallback((matricula: string) => {
    const usuarios: UsuarioCadastro[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIOS) || '[]');
    const usuario = usuarios.find((u) => u.matricula.trim() === matricula.trim());
    if (usuario) {
      return { cadastrada: true, usuario: { nome: usuario.nome, funcao: usuario.funcao, matricula: usuario.matricula } };
    }
    return { cadastrada: false };
  }, []);

  return {
    mostrarModalSenha, setMostrarModalSenha, senhaConfirmacao, setSenhaConfirmacao, erroSenhaConfirmacao,
    handleConfirmarSenhaEntrada,
    mostrarModalSenhaSaida, setMostrarModalSenhaSaida, senhaSaida, setSenhaSaida, erroSenhaSaida,
    handleConfirmarSenhaSaida,
    mostrarConfirmacaoEntendimento, perguntaEntendimento, respostaUsuario, setRespostaUsuario,
    entendimentoConfirmado, houveReforco, mostrarFeedbackEntendimento,
    iniciarConfirmacaoEntendimento, verificarRespostaEntendimento, confirmarAposReforco,
    buscaDSSData, setBuscaDSSData, mostrarBuscaDSS, setMostrarBuscaDSS, buscarDSSDoTurno,
    mostrarAlterarSenha, setMostrarAlterarSenha, senhaAtual, setSenhaAtual,
    novaSenha, setNovaSenha, confirmarNovaSenha, setConfirmarNovaSenha,
    erroAlterarSenha, setErroAlterarSenha, sucessoAlterarSenha, setSucessoAlterarSenha,
    handleAlterarSenha, verificarMatriculaCadastrada,
  };
}
