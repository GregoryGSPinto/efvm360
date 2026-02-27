// ============================================================================
// EFVM360 – Hook de Estilos — Visual Corporativo Sólido Vale S.A.
// ZERO glassmorphism, ZERO backdrop-filter, ZERO imagem de fundo
// ============================================================================
import { useMemo } from 'react';
import type { TemaEstilos, ConfiguracaoSistema } from '../types';

type CSSProperties = React.CSSProperties;

export interface StylesObject {
  container: CSSProperties; overlay: CSSProperties; content: CSSProperties;
  header: CSSProperties; headerLogo: CSSProperties; headerTitle: CSSProperties;
  headerSubtitle: CSSProperties; headerActions: CSSProperties; headerBadge: CSSProperties;
  themeToggle: CSSProperties; mainLayout: CSSProperties; sidebar: CSSProperties;
  bottomNav: CSSProperties; bottomNavItem: CSSProperties; bottomNavItemHover: CSSProperties;
  bottomNavItemActive: CSSProperties; bottomNavIcon: CSSProperties; bottomNavIconHover: CSSProperties;
  bottomNavLabel: CSSProperties; menuItem: CSSProperties; menuItemActive: CSSProperties;
  mainContent: CSSProperties; card: CSSProperties; cardHover: CSSProperties; cardTitle: CSSProperties;
  gridRow: CSSProperties; label: CSSProperties; input: CSSProperties; inputFocus: CSSProperties;
  select: CSSProperties; selectFocus: CSSProperties; textarea: CSSProperties; textareaFocus: CSSProperties;
  button: CSSProperties; buttonHover: CSSProperties; buttonPrimary: CSSProperties;
  buttonPrimaryHover: CSSProperties; buttonSecondary: CSSProperties; buttonSecondaryHover: CSSProperties;
  buttonDanger: CSSProperties; buttonDangerHover: CSSProperties;
  table: CSSProperties; th: CSSProperties; td: CSSProperties; trHover: CSSProperties;
  alertBox: CSSProperties; alertCritico: CSSProperties; alertAviso: CSSProperties;
  adambootPanel: CSSProperties; adambootButton: CSSProperties; chatHeader: CSSProperties;
  chatMessages: CSSProperties; chatBubble: CSSProperties; chatBubbleBot: CSSProperties;
  chatBubbleUser: CSSProperties; chatInput: CSSProperties;
  statusBadge: CSSProperties; statusLivre: CSSProperties; statusOcupada: CSSProperties;
  statusInterditada: CSSProperties;
}

export function useStyles(
  tema: TemaEstilos,
  config: ConfiguracaoSistema,
  menuMobileAberto: boolean
): StylesObject {
  const isDark = config.tema === 'escuro';
  return useMemo<StylesObject>(
    () => ({
      // ── Container: fundo SÓLIDO, sem imagem ──
      container: {
        minHeight: '100vh', width: '100%',
        backgroundColor: tema.background,
        fontFamily: "'Segoe UI', 'Inter', -apple-system, sans-serif",
        color: tema.texto,
        position: 'relative', overflow: 'hidden',
        transition: 'background-color 0.3s ease, color 0.3s ease',
      },

      // ── Overlay: não mais necessário, mas mantido para compatibilidade ──
      overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'transparent', zIndex: 0, pointerEvents: 'none',
      },

      content: {
        position: 'relative', zIndex: 1,
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
      },

      // ── Header: sólido branco/escuro com borda sutil ──
      header: {
        background: isDark ? '#1a1a1a' : '#ffffff',
        padding: '12px 24px',
        margin: '12px 16px 0 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: tema.cardSombra,
        border: `1px solid ${tema.cardBorda}`,
        borderRadius: '12px',
        position: 'relative', zIndex: 10,
      },

      headerLogo: { display: 'flex', alignItems: 'center', gap: '12px' },
      headerTitle: { color: tema.texto, fontSize: '16px', fontWeight: '700', letterSpacing: '0.5px' },
      headerSubtitle: { color: tema.textoSecundario, fontSize: '11px', letterSpacing: '0.3px' },
      headerActions: { display: 'flex', alignItems: 'center', gap: '10px' },

      headerBadge: {
        background: tema.backgroundSecundario,
        padding: '6px 14px', borderRadius: '20px', fontSize: '12px',
        color: tema.texto, border: `1px solid ${tema.cardBorda}`,
      },

      themeToggle: {
        background: tema.backgroundSecundario,
        border: `1px solid ${tema.cardBorda}`,
        borderRadius: '8px', padding: '8px', cursor: 'pointer',
        fontSize: '18px', color: tema.texto, transition: 'all 0.2s ease',
      },

      mainLayout: {
        display: 'flex', flexDirection: 'column', flex: 1,
        overflow: 'hidden', position: 'relative',
      },

      sidebar: { display: 'none' },

      // ── Barra inferior: sólida ──
      bottomNav: {
        position: 'fixed', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
        height: '64px',
        background: isDark ? '#1a1a1a' : '#ffffff',
        border: `1px solid ${tema.cardBorda}`,
        borderRadius: '16px',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: '4px', padding: '0 12px',
        boxShadow: isDark ? '0 -2px 12px rgba(0,0,0,0.3)' : '0 -2px 12px rgba(0,0,0,0.08)',
        zIndex: 100,
      },

      bottomNavItem: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '8px 14px', borderRadius: '10px',
        cursor: 'pointer', transition: 'all 0.2s ease',
        color: tema.textoSecundario, minWidth: '60px', gap: '3px',
      },

      bottomNavItemHover: {
        color: '#007e7a',
        background: isDark ? 'rgba(0,126,122,0.12)' : 'rgba(0,126,122,0.06)',
      },

      bottomNavItemActive: {
        background: isDark ? 'rgba(0,126,122,0.18)' : 'rgba(0,126,122,0.10)',
        color: '#007e7a', fontWeight: '600',
      },

      bottomNavIcon: { fontSize: '18px', transition: 'transform 0.2s ease' },
      bottomNavIconHover: { transform: 'scale(1.05)' },

      bottomNavLabel: {
        fontSize: '9px', fontWeight: '600', textTransform: 'uppercase',
        letterSpacing: '0.4px', whiteSpace: 'nowrap',
      },

      menuItem: {
        padding: '14px 20px', color: tema.sidebarTexto, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px',
        transition: 'all 0.2s ease', borderLeft: '3px solid transparent',
      },

      menuItemActive: {
        background: isDark ? 'rgba(0,126,122,0.12)' : 'rgba(0,126,122,0.06)',
        color: '#007e7a', borderLeftColor: '#007e7a', fontWeight: '600',
      },

      // ── Conteúdo principal ──
      mainContent: {
        flex: 1, padding: '20px 16px 100px 16px', overflowY: 'auto',
        maxWidth: '1400px', width: '100%', margin: '0 auto',
      },

      // ── Card: SÓLIDO, borda sutil, sombra leve ──
      card: {
        background: tema.card,
        borderRadius: '12px',
        border: `1px solid ${tema.cardBorda}`,
        boxShadow: tema.cardSombra,
        padding: '20px',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      },

      cardHover: {
        boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.10)',
        borderColor: '#007e7a',
      },

      cardTitle: {
        fontSize: '16px', fontWeight: '600', color: tema.texto,
        marginBottom: '16px', paddingBottom: '12px',
        borderBottom: `1px solid ${tema.cardBorda}`,
      },

      gridRow: {
        display: 'grid', gap: '16px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
      },

      label: {
        display: 'block', fontSize: '13px', fontWeight: '600',
        color: tema.textoSecundario, marginBottom: '6px', letterSpacing: '0.3px',
      },

      // ── Inputs: fundo sólido, borda cinza ──
      input: {
        width: '100%', padding: '12px 14px',
        background: tema.input, border: `1.5px solid ${tema.inputBorda}`,
        borderRadius: '8px', color: tema.texto, fontSize: '14px',
        outline: 'none', boxSizing: 'border-box' as const,
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        colorScheme: isDark ? 'dark' : 'light',
      },
      inputFocus: { borderColor: '#007e7a', boxShadow: '0 0 0 3px rgba(0,126,122,0.12)' },

      select: {
        width: '100%', padding: '12px 14px',
        background: tema.input, border: `1.5px solid ${tema.inputBorda}`,
        borderRadius: '8px', color: tema.texto, fontSize: '14px',
        outline: 'none', boxSizing: 'border-box' as const,
        transition: 'border-color 0.2s ease',
        colorScheme: isDark ? 'dark' : 'light',
      },
      selectFocus: { borderColor: '#007e7a', boxShadow: '0 0 0 3px rgba(0,126,122,0.12)' },

      textarea: {
        width: '100%', padding: '12px 14px',
        background: tema.input, border: `1.5px solid ${tema.inputBorda}`,
        borderRadius: '8px', color: tema.texto, fontSize: '14px',
        fontFamily: 'inherit', resize: 'vertical' as const, minHeight: '80px',
        outline: 'none', boxSizing: 'border-box' as const,
        transition: 'border-color 0.2s ease',
        colorScheme: isDark ? 'dark' : 'light',
      },
      textareaFocus: { borderColor: '#007e7a', boxShadow: '0 0 0 3px rgba(0,126,122,0.12)' },

      // ── Botões: Vale sólido ──
      button: {
        padding: '12px 20px', borderRadius: '8px', border: 'none',
        fontSize: '14px', fontWeight: '600', cursor: 'pointer',
        transition: 'all 0.2s ease', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      },
      buttonHover: { transform: 'translateY(-1px)' },

      buttonPrimary: {
        background: '#007e7a', color: '#fff',
        boxShadow: '0 2px 8px rgba(0,126,122,0.25)',
      },
      buttonPrimaryHover: {
        background: '#006b68',
        boxShadow: '0 4px 14px rgba(0,126,122,0.35)',
        transform: 'translateY(-1px)',
      },

      buttonSecondary: {
        background: tema.backgroundSecundario, color: tema.texto,
        border: `1.5px solid ${tema.cardBorda}`,
      },
      buttonSecondaryHover: {
        background: isDark ? '#2a2a2a' : '#e8e8e8',
        borderColor: '#007e7a', transform: 'translateY(-1px)',
      },

      buttonDanger: {
        background: '#dc2626', color: '#fff',
        boxShadow: '0 2px 8px rgba(220,38,38,0.25)',
      },
      buttonDangerHover: {
        background: '#b91c1c',
        boxShadow: '0 4px 14px rgba(220,38,38,0.35)',
        transform: 'translateY(-1px)',
      },

      // ── Tabela: limpa ──
      table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
      th: {
        padding: '12px', background: '#007e7a', color: '#fff',
        textAlign: 'left' as const, fontWeight: '600', fontSize: '12px',
        textTransform: 'uppercase' as const, letterSpacing: '0.5px',
      },
      td: {
        padding: '10px 12px', borderBottom: `1px solid ${tema.cardBorda}`,
        background: 'transparent',
      },
      trHover: { background: isDark ? '#252525' : '#f9f9f9' },

      // ── Alertas ──
      alertBox: {
        padding: '12px 16px', borderRadius: '8px', marginBottom: '8px',
        fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px',
      },
      alertCritico: {
        background: isDark ? 'rgba(220,38,38,0.12)' : 'rgba(220,38,38,0.06)',
        border: '1px solid rgba(220,38,38,0.3)', color: isDark ? '#fca5a5' : '#dc2626',
      },
      alertAviso: {
        background: isDark ? 'rgba(237,177,17,0.12)' : 'rgba(237,177,17,0.06)',
        border: '1px solid rgba(237,177,17,0.3)', color: isDark ? '#fcd34d' : '#d9a010',
      },

      // ── AdamBoot Chat ──
      adambootPanel: {
        position: 'fixed', bottom: '170px', right: '20px',
        width: '360px', maxHeight: '400px',
        background: tema.card, borderRadius: '16px',
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
        border: `1px solid ${tema.cardBorda}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1000,
      },
      adambootButton: {
        position: 'fixed', bottom: '95px', right: '20px',
        width: '56px', height: '56px', borderRadius: '50%',
        background: '#007e7a', border: '3px solid #007e7a',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0,126,122,0.3)',
        transition: 'transform 0.3s ease', overflow: 'hidden', zIndex: 1000, padding: '2px',
      },
      chatHeader: {
        padding: '16px', background: '#007e7a', color: '#fff',
        display: 'flex', alignItems: 'center', gap: '12px',
      },
      chatMessages: {
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px',
        background: tema.backgroundSecundario,
      },
      chatBubble: { padding: '12px 16px', borderRadius: '12px', maxWidth: '85%', fontSize: '13px', lineHeight: '1.5' },
      chatBubbleBot: { background: tema.card, color: tema.texto, alignSelf: 'flex-start', borderBottomLeftRadius: '4px' },
      chatBubbleUser: { background: '#007e7a', color: '#fff', alignSelf: 'flex-end', borderBottomRightRadius: '4px' },
      chatInput: {
        padding: '12px', borderTop: `1px solid ${tema.cardBorda}`,
        display: 'flex', gap: '8px', background: tema.card,
      },

      // ── Status badges ──
      statusBadge: { padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' as const },
      statusLivre: { background: 'rgba(105,190,40,0.12)', color: '#69be28' },
      statusOcupada: { background: 'rgba(237,177,17,0.12)', color: '#edb111' },
      statusInterditada: { background: 'rgba(220,38,38,0.12)', color: '#dc2626' },
    }),
    [tema, config, menuMobileAberto]
  );
}
