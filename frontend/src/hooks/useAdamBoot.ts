// ============================================================================
// PASSAGEM DE SERVIÇO – EFVM360
// Hook do AdamBoot - Assistente IA
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import type { MensagemChat, DadosFormulario, AlertaIA } from '../types';
import { STATUS_LINHA } from '../utils/constants';

interface UseAdamBootReturn {
  mensagensChat: MensagemChat[];
  inputChat: string;
  chatRef: React.RefObject<HTMLDivElement>;
  setInputChat: (value: string) => void;
  enviarMensagem: () => void;
}

const MENSAGEM_INICIAL: MensagemChat = {
  tipo: 'bot',
  texto: 'Olá! Sou o AdamBoot, seu assistente de passagem de serviço. Como posso ajudar?',
};

export function useAdamBoot(
  dadosFormulario: DadosFormulario,
  alertasIA: AlertaIA[]
): UseAdamBootReturn {
  const [mensagensChat, setMensagensChat] = useState<MensagemChat[]>([MENSAGEM_INICIAL]);
  const [inputChat, setInputChat] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll do chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [mensagensChat]);

  // Processa mensagem e gera resposta
  const processarMensagem = useCallback(
    (mensagem: string): string => {
      const msg = mensagem.toLowerCase();
      let resposta = '';

      if (msg.includes('linha') && msg.includes('interditada')) {
        const linhasInterditadas = [
          ...dadosFormulario.patioCima,
          ...dadosFormulario.patioBaixo,
        ].filter((l) => l.status === STATUS_LINHA.INTERDITADA);

        if (linhasInterditadas.length > 0) {
          resposta = `Linhas interditadas: ${linhasInterditadas
            .map((l) => l.linha)
            .join(', ')}. Verifique se todas possuem descrição do motivo.`;
        } else {
          resposta = 'Não há linhas interditadas no momento.';
        }
      } else if (
        msg.includes('equipamento') ||
        msg.includes('rádio') ||
        msg.includes('lanterna')
      ) {
        const eqProblema = dadosFormulario.equipamentos.filter((e) => !e.emCondicoes);
        if (eqProblema.length > 0) {
          resposta = `Equipamentos com problema: ${eqProblema
            .map((e) => e.nome)
            .join(', ')}. Registre as observações necessárias.`;
        } else {
          resposta = 'Todos os equipamentos estão em condições de uso.';
        }
      } else if (msg.includes('intervenção') || msg.includes('vp')) {
        if (dadosFormulario.intervencoes.temIntervencao === true) {
          resposta = `Há intervenção VP registrada: ${
            dadosFormulario.intervencoes.local || 'local não especificado'
          }. ${dadosFormulario.intervencoes.descricao || 'Adicione descrição.'}`;
        } else if (dadosFormulario.intervencoes.temIntervencao === false) {
          resposta = 'Não há intervenções VP registradas para este turno.';
        } else {
          resposta = 'O campo de intervenções ainda não foi preenchido. Acesse a seção 6 do formulário.';
        }
      } else if (msg.includes('manobra') || msg.includes('manobras')) {
        if (dadosFormulario.segurancaManobras.houveManobras?.resposta === true) {
          resposta = `Houve manobras críticas: ${
            dadosFormulario.segurancaManobras.tipoManobra || 'tipo não informado'
          } em ${dadosFormulario.segurancaManobras.localManobra || 'local não informado'}.`;
        } else if (dadosFormulario.segurancaManobras.houveManobras?.resposta === false) {
          resposta = 'Não houve manobras críticas neste turno.';
        } else {
          resposta = 'O campo de manobras ainda não foi preenchido. Acesse a seção 9 - Segurança Manobras.';
        }
      } else if (msg.includes('freio') || msg.includes('freios')) {
        const freios = dadosFormulario.segurancaManobras.freios;
        const aplicados: string[] = [];
        if (freios.automatico) aplicados.push('automático');
        if (freios.independente) aplicados.push('independente');
        if (freios.manuaisCalcos) aplicados.push('manuais/calços');
        if (freios.naoAplicavel) aplicados.push('N/A');

        if (aplicados.length > 0) {
          resposta = `Freios na entrega: ${aplicados.join(', ')}.`;
        } else {
          resposta = 'Condição de freios não informada. Acesse a seção 9 - Segurança Manobras.';
        }
      } else if (msg.includes('restrição') || msg.includes('restricao')) {
        if (dadosFormulario.segurancaManobras.restricaoAtiva?.resposta === true) {
          resposta = `Restrição ativa: ${
            dadosFormulario.segurancaManobras.restricaoTipo || 'tipo não informado'
          } em ${
            dadosFormulario.segurancaManobras.restricaoLocal || 'local não informado'
          }. Atenção na movimentação!`;
        } else if (dadosFormulario.segurancaManobras.restricaoAtiva?.resposta === false) {
          resposta = 'Não há restrições operacionais ativas.';
        } else {
          resposta = 'Campo de restrições não preenchido. Acesse a seção 9 - Segurança Manobras.';
        }
      } else if (
        msg.includes('comunicação') ||
        msg.includes('comunicacao') ||
        msg.includes('cco')
      ) {
        const com = dadosFormulario.segurancaManobras.comunicacao;
        const confirmados: string[] = [];
        if (com.ccoCpt) confirmados.push('CCO/CPT');
        if (com.oof) confirmados.push('OOF');
        if (com.operadorSilo) confirmados.push('Operador Silo');

        if (confirmados.length > 0) {
          resposta = `Comunicação confirmada com: ${confirmados.join(', ')}.`;
        } else {
          resposta = 'Comunicação operacional não confirmada. Acesse a seção 9 - Segurança Manobras.';
        }
      } else if (msg.includes('segurança') || msg.includes('seguranca')) {
        const seg = dadosFormulario.segurancaManobras;
        const status: string[] = [];
        if (seg.houveManobras?.resposta === true) status.push('✓ Manobras críticas registradas');
        if (seg.restricaoAtiva?.resposta === true) status.push('⚠️ Restrição ativa');
        if (seg.linhaLimpa?.resposta === true) status.push('✓ Linha liberada');
        if (seg.linhaLimpa?.observacao === 'parcial') status.push('⚠️ Linha parcial');
        if (seg.pontoCriticoProximoTurno?.resposta === true) status.push('✓ Ponto crítico informado');

        resposta =
          status.length > 0
            ? `Segurança: ${status.join(', ')}.`
            : 'Campos de segurança pendentes. Acesse a seção 9 - Segurança Manobras.';
      } else if (
        msg.includes('pendência') ||
        msg.includes('falta') ||
        msg.includes('completar')
      ) {
        const alertasCriticos = alertasIA.filter((a) => a.tipo === 'critico');
        if (alertasCriticos.length > 0) {
          resposta = `Pendências críticas: ${alertasCriticos.length}. ${alertasCriticos[0].mensagem}`;
        } else {
          resposta = 'Não há pendências críticas no momento. Continue o preenchimento normalmente.';
        }
      } else if (msg.includes('ajuda') || msg.includes('como')) {
        resposta =
          'Posso ajudar com: linhas interditadas, equipamentos, intervenções VP, manobras, freios, restrições, comunicação, segurança. O que precisa?';
      } else if (msg.includes('turno') || msg.includes('passagem')) {
        const { turno, data } = dadosFormulario.cabecalho;
        resposta = `Passagem de serviço: ${data || 'data não definida'}, ${
          turno || 'turno não selecionado'
        }. ${alertasIA.length} alertas pendentes.`;
      } else {
        resposta =
          'Posso verificar: linhas, equipamentos, intervenções, manobras, freios, restrições ou comunicação. Digite sua dúvida.';
      }

      return resposta;
    },
    [dadosFormulario, alertasIA]
  );

  // Envia mensagem para o chat
  const enviarMensagem = useCallback(() => {
    if (!inputChat.trim()) return;

    const novaMensagem: MensagemChat = { tipo: 'usuario', texto: inputChat };
    const resposta: MensagemChat = { tipo: 'bot', texto: processarMensagem(inputChat) };

    setMensagensChat((prev) => [...prev, novaMensagem, resposta]);
    setInputChat('');
  }, [inputChat, processarMensagem]);

  return {
    mensagensChat,
    inputChat,
    chatRef,
    setInputChat,
    enviarMensagem,
  };
}
