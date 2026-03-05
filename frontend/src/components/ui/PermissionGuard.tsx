// ============================================================================
// EFVM360 — PermissionGuard Component
// Conditionally renders children based on user role
// ============================================================================

import { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface PermissionGuardProps {
  perfisPermitidos: string[];
  children: React.ReactNode;
  funcaoUsuario?: string;
  mensagemBloqueio?: string;
}

export const PermissionGuard = memo<PermissionGuardProps>(({
  perfisPermitidos,
  children,
  funcaoUsuario,
  mensagemBloqueio,
}) => {
  const { t } = useTranslation();
  const bloqueioText = mensagemBloqueio || t('permissionGuard.accessRestricted');
  const funcao = funcaoUsuario || (() => {
    try {
      const u = JSON.parse(localStorage.getItem('efvm360-usuario') || '{}');
      return u.funcao || '';
    } catch { return ''; }
  })();

  if (perfisPermitidos.includes(funcao)) {
    return <>{children}</>;
  }

  return (
    <div style={{
      padding: '20px',
      background: 'rgba(220,38,38,0.05)',
      border: '1px solid rgba(220,38,38,0.15)',
      borderRadius: '12px',
      textAlign: 'center',
      color: '#888',
      fontSize: '13px',
    }}>
      {bloqueioText}
    </div>
  );
});

PermissionGuard.displayName = 'PermissionGuard';
export default PermissionGuard;
