// EFVM360 – DESIGN TOKENS — PALETA OFICIAL VALE S.A.
export const VALE = {
  verdePetroleo:  '#007e7a',
  verdeVibrante:  '#69be28',
  azulCiano:      '#00b0ca',
  amareloOuro:    '#edb111',
  cinza:          '#747678',
} as const;

export const TOKENS = {
  btnPrimario: VALE.verdePetroleo,
  btnPrimarioHover: '#006b68',
  btnSecundario: VALE.verdeVibrante,
  btnSecundarioHover: '#5aa824',
  info: VALE.azulCiano, alerta: VALE.amareloOuro, perigo: '#dc2626', sucesso: VALE.verdeVibrante,
  light: {
    bg:'#ffffff', bgSec:'#f5f5f5', card:'#ffffff', cardBorda:'#e5e5e5',
    cardSombra:'0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    texto:'#222222', textoSec:'#555555',
    input:'#ffffff', inputBorda:'#d4d4d4', inputFoco:VALE.verdePetroleo,
    sidebar:'#ffffff', sidebarTexto:'#333333',
    headerBg:'#ffffff', headerBorda:'#e5e5e5',
    overlay:'rgba(255,255,255,0.97)',
  },
  dark: {
    bg:'#121212', bgSec:'#1e1e1e', card:'#1e1e1e', cardBorda:'#333333',
    cardSombra:'0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
    texto:'#e0e0e0', textoSec:'#a0a0a0',
    input:'#2a2a2a', inputBorda:'#404040', inputFoco:VALE.verdeVibrante,
    sidebar:'#1a1a1a', sidebarTexto:'#d0d0d0',
    headerBg:'#1a1a1a', headerBorda:'#333333',
    overlay:'rgba(18,18,18,0.97)',
  },
} as const;
export default TOKENS;
