// ============================================================================
// EFVM360 Backend — AdamBoot Controller (Proficiency Tracking)
// ============================================================================

import { Request, Response } from 'express';
import { AdamBootPerfil } from '../models';

export const obterPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { userId: number; matricula: string };
    const matricula = req.params.matricula || user.matricula;

    let perfil = await AdamBootPerfil.findOne({ where: { matricula } });
    if (!perfil) {
      perfil = await AdamBootPerfil.create({
        usuario_id: user.userId,
        matricula,
        total_sessoes: 0,
        paginas_visitadas: {},
        acoes_realizadas: 0,
        nivel_proficiencia: 'iniciante',
      });
    }

    res.json({ perfil });
  } catch (error) {
    console.error('[ADAMBOOT] Erro obter perfil:', error);
    res.status(500).json({ error: 'Erro ao obter perfil AdamBoot' });
  }
};

export const registrarAcesso = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { userId: number; matricula: string };
    const { pagina } = req.body;

    let perfil = await AdamBootPerfil.findOne({ where: { matricula: user.matricula } });
    if (!perfil) {
      perfil = await AdamBootPerfil.create({
        usuario_id: user.userId,
        matricula: user.matricula,
        total_sessoes: 1,
        paginas_visitadas: pagina ? { [pagina]: 1 } : {},
        acoes_realizadas: 1,
        nivel_proficiencia: 'iniciante',
        ultimo_acesso: new Date(),
      });
    } else {
      const paginas = (perfil.paginas_visitadas || {}) as Record<string, number>;
      if (pagina) paginas[pagina] = (paginas[pagina] || 0) + 1;

      const totalSessoes = perfil.total_sessoes + 1;
      const nivel = totalSessoes > 20 ? 'avancado' : totalSessoes > 5 ? 'intermediario' : 'iniciante';

      await perfil.update({
        total_sessoes: totalSessoes,
        paginas_visitadas: paginas,
        acoes_realizadas: perfil.acoes_realizadas + 1,
        nivel_proficiencia: nivel,
        ultimo_acesso: new Date(),
      });
    }

    res.json({ message: 'Acesso registrado', perfil });
  } catch (error) {
    console.error('[ADAMBOOT] Erro registrar acesso:', error);
    res.status(500).json({ error: 'Erro ao registrar acesso' });
  }
};
