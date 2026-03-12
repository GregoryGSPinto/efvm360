import { Link } from 'react-router-dom';

const sectionStyle = {
  maxWidth: 1040,
  margin: '0 auto',
  padding: '40px 24px',
} as const;

const cardStyle = {
  background: '#ffffff',
  border: '1px solid rgba(15, 23, 42, 0.08)',
  borderRadius: 18,
  padding: 24,
  boxShadow: '0 18px 60px rgba(15, 23, 42, 0.08)',
} as const;

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f4f7f2 0%, #eef4f7 100%)', color: '#0f172a' }}>
      <section style={{ ...sectionStyle, paddingTop: 64, paddingBottom: 24 }}>
        <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #ffffff 0%, #eef9f1 100%)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: '#0f766e', marginBottom: 12 }}>
            Independent Portfolio Case Study
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.05, margin: '0 0 16px', letterSpacing: -1.2 }}>
            EFVM360 shows how a shift handover platform could be built, not a live commercial rollout.
          </h1>
          <p style={{ margin: 0, maxWidth: 760, fontSize: 18, lineHeight: 1.6, color: '#334155' }}>
            The codebase combines a React frontend, an Express backend, offline-capable browser persistence,
            tests, CI, and deploy templates. Some workflows are implemented end to end, and some remain partial.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
            <Link to="/login" style={primaryButton}>Open Demo UI</Link>
            <Link to="/help" style={secondaryButton}>Open Help Center</Link>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <div style={cardStyle}>
            <h2 style={cardTitle}>Implemented</h2>
            <ul style={listStyle}>
              <li>Multi-page frontend with dashboards, handover, DSS, approvals, and settings.</li>
              <li>Express API with auth, validation, audit, LGPD, analytics, and operational routes.</li>
              <li>Vitest, Jest, Playwright, k6, Docker assets, and GitHub Actions workflows.</li>
            </ul>
          </div>
          <div style={cardStyle}>
            <h2 style={cardTitle}>Partial</h2>
            <ul style={listStyle}>
              <li>Frontend online mode does not yet cover every backend capability.</li>
              <li>Azure and Entra integrations require external configuration.</li>
              <li>Offline sync has multiple implementations and needs consolidation.</li>
            </ul>
          </div>
          <div style={cardStyle}>
            <h2 style={cardTitle}>Not Claimed</h2>
            <ul style={listStyle}>
              <li>No production SLA, customer deployment, or institutional affiliation is claimed here.</li>
              <li>No compliance certification or legal approval is implied by the repository.</li>
              <li>No live environment proof exists in the repo by itself.</li>
            </ul>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={{ ...cardStyle, display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div>
            <h2 style={cardTitle}>What To Review</h2>
            <ul style={listStyle}>
              <li><Link to="/help" style={linkStyle}>Help Center</Link> for product-facing guidance.</li>
              <li><a href="/docs/IMPLEMENTATION_STATUS.md" style={linkStyle}>Implementation status</a> for module-level truth.</li>
              <li><a href="/docs/TECHNICAL_EVIDENCE.md" style={linkStyle}>Technical evidence</a> for stack and test proof.</li>
              <li><a href="/docs/ENTERPRISE_READINESS.md" style={linkStyle}>Enterprise readiness</a> for an evidence-based scorecard.</li>
            </ul>
          </div>
          <div>
            <h2 style={cardTitle}>How To Run</h2>
            <pre style={codeStyle}>{`pnpm install
pnpm dev
pnpm verify`}</pre>
            <p style={{ margin: '12px 0 0', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
              The canonical workflow is documented in the root README and enforced in CI.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

const cardTitle = {
  margin: '0 0 12px',
  fontSize: 20,
  lineHeight: 1.2,
} as const;

const listStyle = {
  margin: 0,
  paddingLeft: 18,
  color: '#334155',
  lineHeight: 1.7,
} as const;

const primaryButton = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 18px',
  borderRadius: 12,
  background: '#0f766e',
  color: '#ffffff',
  textDecoration: 'none',
  fontWeight: 700,
} as const;

const secondaryButton = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 18px',
  borderRadius: 12,
  background: '#ffffff',
  color: '#0f172a',
  textDecoration: 'none',
  fontWeight: 700,
  border: '1px solid rgba(15, 23, 42, 0.12)',
} as const;

const linkStyle = {
  color: '#0f766e',
  textDecoration: 'none',
  fontWeight: 600,
} as const;

const codeStyle = {
  margin: 0,
  padding: 16,
  borderRadius: 14,
  background: '#0f172a',
  color: '#e2e8f0',
  overflowX: 'auto',
} as const;
