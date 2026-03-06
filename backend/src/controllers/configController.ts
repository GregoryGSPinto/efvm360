// ============================================================================
// EFVM360 Backend — Config Controller (User Preferences)
// ============================================================================

import { Request, Response } from 'express';
import { UsuarioConfig } from '../models';

export const obter = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { userId: number };

    let config = await UsuarioConfig.findOne({ where: { usuario_id: user.userId } });
    if (!config) {
      config = await UsuarioConfig.create({
        usuario_id: user.userId,
        tema: 'automatico',
        idioma: 'pt-BR',
      });
    }

    res.json({ config });
  } catch (error) {
    console.error('[CONFIG] Erro obter:', error);
    res.status(500).json({ error: 'Erro ao obter configurações' });
  }
};

export const atualizar = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { userId: number };
    const { tema, idioma, preferenciasOperacionais, preferenciasNotificacao, preferenciasAcessibilidade, adambotConfig } = req.body;

    let config = await UsuarioConfig.findOne({ where: { usuario_id: user.userId } });
    if (!config) {
      config = await UsuarioConfig.create({ usuario_id: user.userId });
    }

    const updates: Record<string, unknown> = {};
    if (tema !== undefined) updates.tema = tema;
    if (idioma !== undefined) updates.idioma = idioma;
    if (preferenciasOperacionais !== undefined) updates.preferencias_operacionais = preferenciasOperacionais;
    if (preferenciasNotificacao !== undefined) updates.preferencias_notificacao = preferenciasNotificacao;
    if (preferenciasAcessibilidade !== undefined) updates.preferencias_acessibilidade = preferenciasAcessibilidade;
    if (adambotConfig !== undefined) updates.adamboot_config = adambotConfig;

    await config.update(updates);
    res.json({ config, message: 'Configurações atualizadas' });
  } catch (error) {
    console.error('[CONFIG] Erro atualizar:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
};
