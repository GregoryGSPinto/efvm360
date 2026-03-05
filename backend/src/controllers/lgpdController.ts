// ============================================================================
// VFZ Backend — Controller LGPD (Direitos do Titular)
// ============================================================================
import { Request, Response } from 'express';
import { Usuario, Passagem, AuditTrail } from '../models';

export const meusDados = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }
    const usuario = await Usuario.findByPk(req.user.userId);
    if (!usuario) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }

    const passagens = await Passagem.findAll({ where: { operador_sai_id: usuario.id }, attributes: ['uuid', 'data_passagem', 'turno', 'status', 'created_at'] });
    const auditLogs = await AuditTrail.findAll({ where: { matricula: usuario.matricula }, attributes: ['acao', 'recurso', 'created_at'], limit: 100, order: [['id', 'DESC']] });

    res.json({
      dadosPessoais: { nome: usuario.nome, matricula: usuario.matricula, funcao: usuario.funcao, turno: usuario.turno, ativo: usuario.ativo, dataCadastro: usuario.getDataValue('created_at') },
      passagensRegistradas: passagens.length,
      passagens: passagens.map(p => ({ uuid: p.uuid, data: p.data_passagem, turno: p.turno, status: p.status })),
      registrosAuditoria: auditLogs.length,
      ultimasAcoes: auditLogs.map(a => ({ acao: a.acao, recurso: a.recurso, data: a.getDataValue('created_at') })),
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao obter dados pessoais' });
  }
};

export const exportar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }
    const usuario = await Usuario.findByPk(req.user.userId);
    if (!usuario) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }

    const passagens = await Passagem.findAll({ where: { operador_sai_id: usuario.id } });
    const audit = await AuditTrail.findAll({ where: { matricula: usuario.matricula } });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=lgpd_export_${usuario.matricula}_${new Date().toISOString().slice(0,10)}.json`);
    res.json({ usuario: usuario.toSafeJSON(), passagens, auditoria: audit, exportadoEm: new Date().toISOString() });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao exportar dados' });
  }
};

export const anonimizar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }
    const { matriculaAlvo } = req.body;
    if (!matriculaAlvo) { res.status(400).json({ error: 'Matrícula do usuário a anonimizar é obrigatória' }); return; }

    const usuario = await Usuario.findOne({ where: { matricula: matriculaAlvo } });
    if (!usuario) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }

    const crypto = require('crypto');
    const hashMatricula = crypto.createHash('sha256').update(matriculaAlvo).digest('hex').substring(0, 12);

    await usuario.update({ nome: 'Usuário Anonimizado', matricula: `ANON_${hashMatricula}`, ativo: false, azure_ad_oid: null });
    await AuditTrail.update({ matricula: `ANON_${hashMatricula}` } as Partial<AuditTrail>, { where: { matricula: matriculaAlvo } });

    res.json({ message: 'Dados anonimizados com sucesso', matriculaAnonimizada: `ANON_${hashMatricula}` });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao anonimizar dados' });
  }
};
