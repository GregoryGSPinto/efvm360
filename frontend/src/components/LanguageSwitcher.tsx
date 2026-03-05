import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="bg-transparent border border-white/20 rounded px-2 py-1 text-sm"
      style={{
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '6px',
        padding: '4px 8px',
        fontSize: '0.8rem',
        color: 'inherit',
        cursor: 'pointer',
      }}
    >
      <option value="pt-BR">PT-BR</option>
      <option value="en">EN</option>
    </select>
  );
}
