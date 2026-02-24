// ============================================================================
// EFVM360 — Skip to Content (WCAG 2.1 AA)
// ============================================================================
import React from 'react';
export const SkipToContent: React.FC = () => (
  <a href="#main-content" className="skip-to-content" style={{
    position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden',
  }} onFocus={(e) => { (e.target as HTMLElement).style.cssText = 'position:fixed;top:0;left:0;z-index:10000;padding:16px 24px;background:#00843D;color:#fff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:0 0 8px 0;'; }}
    onBlur={(e) => { (e.target as HTMLElement).style.cssText = 'position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;'; }}>
    Pular para o conteúdo principal
  </a>
);
