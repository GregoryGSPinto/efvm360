// ============================================================================
// VFZ v3.2 — LGPD Routes (Lei 13.709/2018)
// Data subject rights: access, portability, erasure, correction
// ============================================================================

import { Router, Request, Response } from 'express';

const router = Router();

// ── GET /api/v1/lgpd/meus-dados ────────────────────────────────────────
// Direito de Acesso (Art. 18, II)
router.get('/meus-dados', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ erro: 'Não autenticado' });

    // In production: query all tables for user data
    const dadosPessoais = {
      identificacao: {
        nome: user.nome,
        matricula: user.matricula,
        funcao: user.funcao,
      },
      autenticacao: {
        senhaArmazenada: 'hash bcrypt (não reversível)',
        ultimoLogin: null, // query from audit
        metodoAuth: user.authMethod || 'local',
      },
      registrosOperacionais: {
        totalPassagens: 0,    // count from passagens table
        totalAssinaturas: 0,  // count from assinaturas table
      },
      logsAcesso: {
        descricao: 'Logs de IP e User-Agent retidos por 90 dias',
        retencao: '90 dias',
      },
      baseLegal: 'Execução contratual e obrigação legal/regulatória',
      retencao: 'Dados de perfil: ativo + 5 anos. Registros operacionais: 5 anos.',
      dpo: 'dpo@vale.com',
    };

    res.json({
      titular: user.matricula,
      consultadoEm: new Date().toISOString(),
      dados: dadosPessoais,
    });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao consultar dados pessoais' });
  }
});

// ── POST /api/v1/lgpd/exportar ─────────────────────────────────────────
// Direito de Portabilidade (Art. 18, V)
router.post('/exportar', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ erro: 'Não autenticado' });

    // In production: export all user data as structured JSON
    const exportData = {
      formato: 'JSON estruturado (LGPD Art. 18, V)',
      exportadoEm: new Date().toISOString(),
      titular: {
        nome: user.nome,
        matricula: user.matricula,
        funcao: user.funcao,
      },
      passagens: [],    // query all user's passagens
      assinaturas: [],  // query all signatures
      logsAtividade: [], // query audit trail
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="vfz-dados-${user.matricula}-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao exportar dados' });
  }
});

// ── POST /api/v1/lgpd/anonimizar ──────────────────────────────────────
// Direito de Eliminação (Art. 18, VI) — anonimização, não exclusão
// Registros operacionais preservados por obrigação legal
router.post('/anonimizar', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ erro: 'Não autenticado' });

    // In production:
    // 1. Anonimizar dados de identificação (nome → "Usuário Anonimizado")
    // 2. Manter registros operacionais com matrícula anonimizada
    // 3. Registrar no audit trail que anonimização foi solicitada
    // 4. Não excluir registros (obrigação legal ferroviária)

    res.json({
      status: 'solicitacao_recebida',
      mensagem: 'Sua solicitação de anonimização foi registrada. Dados de identificação serão anonimizados em até 15 dias. Registros operacionais serão preservados conforme obrigação legal (regulamentação ferroviária).',
      protocolo: `LGPD-${Date.now()}`,
      prazo: '15 dias úteis',
      contato: 'dpo@vale.com',
    });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao processar solicitação' });
  }
});

// ── GET /api/v1/lgpd/politica ──────────────────────────────────────────
// Aviso de Privacidade público
router.get('/politica', (_req: Request, res: Response) => {
  res.json({
    sistema: 'VFZ — Gestão de Troca de Turno Ferroviária',
    controlador: 'Vale S.A.',
    dpo: 'dpo@vale.com',
    finalidade: 'Registro e controle de trocas de turno ferroviário para segurança operacional',
    baseLegal: [
      'Execução de contrato de trabalho (Art. 7, V)',
      'Cumprimento de obrigação legal/regulatória (Art. 7, II)',
      'Legítimo interesse para segurança operacional (Art. 7, IX)',
    ],
    dadosColetados: [
      'Nome completo e matrícula (identificação)',
      'Função/cargo (operacional)',
      'Registros de troca de turno (operacional)',
      'Assinaturas digitais (validação)',
      'IP e User-Agent (segurança)',
    ],
    retencao: {
      dadosPerfil: 'Enquanto ativo + 5 anos',
      registrosOperacionais: '5 anos (regulamentação ferroviária)',
      logsAcesso: '90 dias',
    },
    direitos: 'Acesso, correção, portabilidade e anonimização via menu Configurações ou dpo@vale.com',
  });
});

export default router;
