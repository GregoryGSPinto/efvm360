// ============================================================================
// EFVM360 — Help Center Page
// Getting Started, Feature Docs, Troubleshooting, FAQ
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import {
  BookOpen, Rocket, TrainFront, Map, AlertTriangle, Wrench,
  BarChart3, Bot, Settings, Users, Shield, WifiOff,
  Monitor, HelpCircle, Search, ChevronRight,
  ArrowLeft, FileText,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────

interface Article {
  id: string;
  title: string;
  icon: typeof BookOpen;
  content: string[];
}

interface Section {
  id: string;
  title: string;
  icon: typeof BookOpen;
  color: string;
  articles: Article[];
}

// ── Content ─────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Rocket,
    color: '#22c55e',
    articles: [
      {
        id: 'quick-start',
        title: 'Quick Start Guide',
        icon: Rocket,
        content: [
          'Welcome to EFVM360! This guide will help you get up and running in minutes.',
          '1. Log in with the credentials provided by your administrator. Your matricula (employee ID) serves as your username.',
          '2. On first login, you will see the Dashboard with an overview of your yard operations, including current shift status, alerts, and recent activity.',
          '3. Navigate to "Shift Handover" (Passagem de Servico) to create or review shift transitions.',
          '4. Fill in each of the 12 sections: Header, Yard Status, Safety, Equipment, Points of Attention, and Signature.',
          '5. Once all sections are complete, the digital signature seals the handover with a tamper-proof SHA-256 hash.',
          'Tip: Use AdamBot (the AI assistant) to get real-time guidance and validation as you work through each section.',
        ],
      },
      {
        id: 'first-login',
        title: 'First Login',
        icon: Shield,
        content: [
          'Your administrator will provide your matricula and initial password.',
          'Navigate to the login page and enter your credentials.',
          'On first login, you may be prompted to complete a guided tour of the platform.',
          'You can revisit the tour anytime from Settings > About > Restart Tour.',
          'If you forget your password, contact your yard manager or use the password reset flow.',
        ],
      },
      {
        id: 'creating-handover',
        title: 'Creating Your First Handover',
        icon: FileText,
        content: [
          'Navigate to "Passagem de Servico" from the sidebar or bottom navigation.',
          'The handover form has structured sections that guide you through the shift transition:',
          '- Header (Cabecalho): Shift times, operators entering/leaving, yard selection',
          '- Yard Status (Situacao do Patio): Current track occupancy and train positions',
          '- Safety (Seguranca): Active interdictions, safety alerts, DDS themes',
          '- Equipment (Equipamentos): Locomotive and wagon conditions',
          '- Points of Attention: Free-text observations for the incoming shift',
          '- Signature: Digital seal with SHA-256 integrity hash',
          'AdamBot validates each section and alerts you to missing or inconsistent data.',
          'Once signed, the handover is sealed and cannot be modified (write-once integrity).',
        ],
      },
      {
        id: 'dashboard-overview',
        title: 'Understanding the Dashboard',
        icon: BarChart3,
        content: [
          'The Dashboard is your operational command center.',
          'Key widgets include:',
          '- Shift Timer: Shows elapsed time in the current shift and shift window (A: 07-19, B: 19-07)',
          '- Completion Gauge: Percentage of handover form sections completed',
          '- Active Alerts: Critical, warning, and informational alerts for the current shift',
          '- Recent Activity: Timeline of recent handovers and operational events',
          '- AdamBot Briefing: AI-generated situational summary with voice readout',
          'The dashboard adapts to your role: operators see operational data, supervisors see team metrics.',
        ],
      },
    ],
  },
  {
    id: 'features',
    title: 'Feature Documentation',
    icon: BookOpen,
    color: '#3b82f6',
    articles: [
      {
        id: 'shift-handover',
        title: 'Shift Handover',
        icon: TrainFront,
        content: [
          'The Shift Handover module is the core of EFVM360, digitalizing the paper-based shift transition process.',
          'Each handover captures 12 structured sections covering all aspects of the shift transition.',
          'Key features:',
          '- Domain-driven design with event sourcing for complete audit trail',
          '- Tamper-proof SHA-256 integrity chain (write-once after signing)',
          '- Digital signatures with password confirmation',
          '- Conflict resolution for offline edits (first-writer-wins for sealed records)',
          '- AdamBot copilot validates each section in real-time',
          '- PDF export for regulatory documentation',
        ],
      },
      {
        id: 'yard-layout',
        title: 'Yard Layout Management',
        icon: Map,
        content: [
          'The Yard Layout module provides interactive visualization of your railway yard.',
          '- View and update track status (available, occupied, maintenance, interdicted)',
          '- Track train positions and compositions across yard lines',
          '- Manage AMV (switch) configurations',
          '- Role-based access: Inspectors can rename, Managers can delete with double confirmation',
          '- Changes are tracked via domain events and synced offline',
        ],
      },
      {
        id: 'risk-assessment',
        title: 'Risk Assessment',
        icon: AlertTriangle,
        content: [
          'The Risk Assessment module implements an industry-standard 5x5 risk matrix.',
          '- Grade risks by probability (1-5) and severity (1-5)',
          '- Map risks to NR (Norma Regulamentadora) safety standards',
          '- Track mitigation actions and responsible parties',
          '- Historical trend analysis shows risk evolution over time',
          '- Color-coded matrix visualization: green (low), yellow (medium), orange (high), red (critical)',
        ],
      },
      {
        id: 'equipment-mgmt',
        title: 'Equipment Management',
        icon: Wrench,
        content: [
          'Track the condition and status of locomotives, wagons, and other railway equipment.',
          '- Record equipment status during shift handover',
          '- Track maintenance schedules and certifications',
          '- Flag safety-critical issues with alert generation',
          '- Equipment data is integrated directly into the shift handover form',
        ],
      },
      {
        id: 'bi-analytics',
        title: 'BI+ Analytics',
        icon: BarChart3,
        content: [
          'The BI+ Analytics dashboard provides operational intelligence and trend detection.',
          '- Heatmaps showing activity patterns across shifts and yards',
          '- Trend analysis for handover completion times and quality',
          '- Team performance metrics (support-oriented, not surveillance)',
          '- PDF report generation for management reviews',
          '- KPI tracking: handovers/day, completion rate, average time, risk scores',
        ],
      },
      {
        id: 'adambot',
        title: 'AdamBot AI Assistant',
        icon: Bot,
        content: [
          'AdamBot is your AI-powered operational copilot.',
          '- Automatic briefings: Situational summary generated on dashboard load',
          '- Copilot mode: Section-by-section validation during handover creation',
          '- Voice interaction: Speech-to-text input and text-to-speech output',
          '- Trend analysis: Historical pattern detection and alerts',
          '- Natural Brazilian Portuguese voice with optimized pitch and rate',
          'AdamBot focuses on operational guidance — "Which track has the most problems?" not "Who worked less?"',
        ],
      },
    ],
  },
  {
    id: 'administration',
    title: 'Administration',
    icon: Settings,
    color: '#8b5cf6',
    articles: [
      {
        id: 'user-mgmt',
        title: 'User Management',
        icon: Users,
        content: [
          'Administrators and managers can manage users from the Gestao page.',
          '- Create new user accounts with role assignment',
          '- Approve pending registrations and password resets',
          '- Assign users to yards and shifts',
          '- RBAC: 4 hierarchy levels (Operador, Inspetor, Gestor, Administrador)',
          '- Supervisors see their team; Administrators see all yards',
        ],
      },
      {
        id: 'role-permissions',
        title: 'Role Permissions',
        icon: Shield,
        content: [
          'EFVM360 uses a 4-level role hierarchy:',
          '- Operador/Maquinista: Create and view handovers, access DSS and BI',
          '- Inspetor: All above + team management, rankings, equipment oversight',
          '- Gestor/Supervisor: All above + approvals, yard configuration, user management',
          '- Administrador: Full platform access across all yards',
          'Permissions are enforced both in the UI and API middleware.',
        ],
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: HelpCircle,
    color: '#f97316',
    articles: [
      {
        id: 'offline-mode',
        title: 'Offline Mode',
        icon: WifiOff,
        content: [
          'EFVM360 is designed to work fully offline.',
          'When offline, all data is stored in IndexedDB on your device.',
          'A green indicator shows online status; red means offline.',
          'When connectivity returns, the SyncEngine automatically syncs pending changes.',
          'Conflict resolution strategies:',
          '- APPEND_ONLY events: auto-merged',
          '- WRITE_ONCE sealed records: first-writer-wins',
          '- STATE changes: version check',
          '- CONFIG changes: server-wins',
        ],
      },
      {
        id: 'sync-issues',
        title: 'Sync Issues',
        icon: WifiOff,
        content: [
          'If you experience sync issues:',
          '1. Check the online indicator in the top bar',
          '2. Ensure you have a stable network connection',
          '3. Wait for the automatic sync cycle (runs every 30 seconds when online)',
          '4. If sync remains stuck, try refreshing the page',
          '5. For persistent issues, clear the cache: Settings > Advanced > Clear Cache',
          'Important: Offline data is preserved even after cache clearing.',
        ],
      },
      {
        id: 'login-problems',
        title: 'Login Problems',
        icon: Shield,
        content: [
          'Common login issues and solutions:',
          '- Wrong password: Use the password reset flow or contact your manager',
          '- Account locked: After 5 failed attempts, wait 15 minutes or contact admin',
          '- Session expired: JWT tokens expire after 1 hour; refresh tokens after 7 days',
          '- Cache issues: Clear browser cache and reload, or run in console:',
          '  localStorage.clear(); sessionStorage.clear(); location.reload();',
        ],
      },
      {
        id: 'browser-compat',
        title: 'Browser Compatibility',
        icon: Monitor,
        content: [
          'EFVM360 supports modern browsers:',
          '- Chrome 90+ (recommended)',
          '- Firefox 90+',
          '- Safari 15+',
          '- Edge 90+',
          '- Mobile: Chrome for Android, Safari for iOS',
          'The platform is a Progressive Web App (PWA) and can be installed on mobile devices.',
          'For the best experience on tablets in the field, use Chrome in fullscreen/kiosk mode.',
        ],
      },
    ],
  },
];

// ── Colors ──────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#0a0f1a',
  bgCard: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  text: '#f0f0f0',
  textMuted: '#9ca3af',
  green: '#22c55e',
};

const SCOPED_CSS = `
.help-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
@media (max-width: 768px) {
  .help-grid { grid-template-columns: 1fr; }
}
`;

// ── Component ───────────────────────────────────────────────────────────

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<string | null>(null);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    const q = searchQuery.toLowerCase();
    return SECTIONS.map(s => ({
      ...s,
      articles: s.articles.filter(
        a => a.title.toLowerCase().includes(q) || a.content.some(c => c.toLowerCase().includes(q)),
      ),
    })).filter(s => s.articles.length > 0);
  }, [searchQuery]);

  const currentSection = useMemo(
    () => filteredSections.find(s => s.id === activeSection),
    [filteredSections, activeSection],
  );

  const currentArticle = useMemo(() => {
    if (!currentSection || !activeArticle) return null;
    return currentSection.articles.find(a => a.id === activeArticle) || null;
  }, [currentSection, activeArticle]);

  const goBack = useCallback(() => {
    if (activeArticle) setActiveArticle(null);
    else if (activeSection) setActiveSection(null);
  }, [activeArticle, activeSection]);

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', color: COLORS.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>{SCOPED_CSS}</style>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header style={{
        borderBottom: `1px solid ${COLORS.border}`,
        background: 'rgba(10,15,26,0.9)', backdropFilter: 'blur(12px)',
        padding: '0 24px', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64, gap: 16 }}>
          <a href="/landing" style={{ color: COLORS.green, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrainFront size={24} />
            <span style={{ fontWeight: 700, fontSize: 18 }}>EFVM360</span>
          </a>
          <span style={{ color: COLORS.textMuted, fontSize: 14 }}>|</span>
          <span style={{ fontSize: 15, fontWeight: 500 }}>Help Center</span>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>

        {/* ── Breadcrumb / Back ────────────────────────────────────── */}
        {(activeSection || activeArticle) && (
          <button onClick={goBack} style={{
            background: 'none', border: 'none', color: COLORS.green, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginBottom: 24, padding: 0,
          }}>
            <ArrowLeft size={16} />
            {activeArticle ? currentSection?.title : 'All Topics'}
          </button>
        )}

        {/* ── Article View ────────────────────────────────────────── */}
        {currentArticle ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${currentSection?.color || COLORS.green}20`,
              }}>
                <currentArticle.icon size={20} color={currentSection?.color || COLORS.green} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{currentArticle.title}</h1>
            </div>
            <div style={{
              background: COLORS.bgCard, border: `1px solid ${COLORS.border}`,
              borderRadius: 16, padding: 32,
            }}>
              {currentArticle.content.map((paragraph, idx) => (
                <p key={idx} style={{
                  color: paragraph.startsWith('-') || paragraph.startsWith('  ') ? COLORS.textMuted : COLORS.text,
                  fontSize: 15, lineHeight: 1.8, margin: '0 0 16px',
                  paddingLeft: paragraph.startsWith('-') || paragraph.startsWith('  ') ? 16 : 0,
                }}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ) : currentSection ? (
          /* ── Section View (article list) ──────────────────────── */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${currentSection.color}20`,
              }}>
                <currentSection.icon size={20} color={currentSection.color} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{currentSection.title}</h1>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {currentSection.articles.map(article => (
                <button key={article.id} onClick={() => setActiveArticle(article.id)} style={{
                  background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12,
                  padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', color: COLORS.text, textAlign: 'left', width: '100%',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <article.icon size={18} color={currentSection.color} />
                    <span style={{ fontSize: 15, fontWeight: 500 }}>{article.title}</span>
                  </div>
                  <ChevronRight size={16} color={COLORS.textMuted} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Home View (search + sections) ───────────────────── */
          <div>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>How can we help?</h1>
              <p style={{ color: COLORS.textMuted, fontSize: 15, marginBottom: 24 }}>
                Search our documentation or browse topics below
              </p>
              <div style={{
                maxWidth: 480, margin: '0 auto', position: 'relative',
              }}>
                <Search size={18} color={COLORS.textMuted} style={{ position: 'absolute', left: 14, top: 13 }} />
                <input
                  type="text"
                  placeholder="Search help articles..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px 12px 40px', borderRadius: 12,
                    border: `1px solid ${COLORS.border}`, background: COLORS.bgCard,
                    color: COLORS.text, fontSize: 15, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div className="help-grid">
              {filteredSections.map(section => (
                <button key={section.id} onClick={() => setActiveSection(section.id)} style={{
                  background: COLORS.bgCard, border: `1px solid ${COLORS.border}`,
                  borderRadius: 16, padding: 24, cursor: 'pointer', textAlign: 'left',
                  color: COLORS.text, width: '100%',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${section.color}20`,
                    }}>
                      <section.icon size={20} color={section.color} />
                    </div>
                    <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{section.title}</h2>
                  </div>
                  <p style={{ color: COLORS.textMuted, fontSize: 13, margin: 0 }}>
                    {section.articles.length} article{section.articles.length !== 1 ? 's' : ''}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
                    {section.articles.slice(0, 3).map(a => (
                      <li key={a.id} style={{ fontSize: 13, color: COLORS.textMuted, padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ChevronRight size={12} />
                        {a.title}
                      </li>
                    ))}
                    {section.articles.length > 3 && (
                      <li style={{ fontSize: 13, color: section.color, padding: '4px 0' }}>
                        +{section.articles.length - 3} more
                      </li>
                    )}
                  </ul>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${COLORS.border}`, padding: '32px 24px',
        textAlign: 'center', color: COLORS.textMuted, fontSize: 13, marginTop: 60,
      }}>
        <p style={{ margin: 0 }}>
          Can't find what you're looking for? Contact support at <strong style={{ color: COLORS.green }}>support@efvm360.com</strong>
        </p>
      </footer>
    </div>
  );
}
