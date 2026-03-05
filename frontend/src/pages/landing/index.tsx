// ============================================================================
// EFVM360 — Landing Page (Go-to-Market)
// Public-facing page: Hero, Features, Pricing, FAQ, CTA
// ============================================================================

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrainFront, Shield, BarChart3, WifiOff, Bot,
  Map, AlertTriangle, Wrench, ChevronDown, ChevronUp,
  Check, X, ArrowRight, Star, Zap, Lock,
} from 'lucide-react';

// ── Styles ──────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#0a0f1a',
  bgCard: 'rgba(255,255,255,0.04)',
  bgCardHover: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.08)',
  text: '#f0f0f0',
  textMuted: '#9ca3af',
  green: '#22c55e',
  greenDark: '#16a34a',
  yellow: '#eab308',
  blue: '#3b82f6',
  accent: '#10b981',
};

const SCOPED_CSS = `
@keyframes landing-fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
.landing-fade-up { animation: landing-fade-up 0.6s ease-out both; }
.landing-fade-up-d1 { animation-delay: 0.1s; }
.landing-fade-up-d2 { animation-delay: 0.2s; }
.landing-fade-up-d3 { animation-delay: 0.3s; }
.landing-fade-up-d4 { animation-delay: 0.4s; }

@keyframes landing-gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.landing-gradient-text {
  background: linear-gradient(135deg, #22c55e, #3b82f6, #22c55e);
  background-size: 200% 200%;
  animation: landing-gradient 4s ease infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.landing-grid-features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.landing-grid-pricing {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  align-items: start;
}
@media (max-width: 1024px) {
  .landing-grid-features { grid-template-columns: repeat(2, 1fr); }
  .landing-grid-pricing { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; }
}
@media (max-width: 640px) {
  .landing-grid-features { grid-template-columns: 1fr; }
}
`;

// ── Feature Data ────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: TrainFront,
    title: 'Shift Handover',
    desc: 'Digital replacement for paper-based railway shift transitions. 12 structured sections with validation and digital signatures.',
    color: COLORS.green,
  },
  {
    icon: Map,
    title: 'Yard Management',
    desc: 'Interactive yard layout with real-time track status, train positions, and AMV (switch) configurations.',
    color: COLORS.blue,
  },
  {
    icon: AlertTriangle,
    title: 'Risk Assessment 5x5',
    desc: 'Industry-standard 5x5 risk matrix with severity grading, mitigation tracking, and NR compliance mapping.',
    color: COLORS.yellow,
  },
  {
    icon: Wrench,
    title: 'Equipment Management',
    desc: 'Track locomotive and wagon conditions, maintenance status, and safety certifications per shift.',
    color: '#f97316',
  },
  {
    icon: BarChart3,
    title: 'BI+ Analytics',
    desc: 'Operational intelligence with trend detection, heatmaps, team performance metrics, and PDF reports.',
    color: '#8b5cf6',
  },
  {
    icon: Bot,
    title: 'AdamBot AI Assistant',
    desc: 'AI-powered copilot for operational guidance, automatic briefings, voice interaction, and section validation.',
    color: '#ec4899',
  },
];

// ── Pricing Data ────────────────────────────────────────────────────────

interface PricingTier {
  name: string;
  target: string;
  price: string;
  period: string;
  features: string[];
  excluded: string[];
  highlight: boolean;
  cta: string;
}

const PRICING: PricingTier[] = [
  {
    name: 'Starter',
    target: 'Small railways, pilots',
    price: '$499',
    period: '/month',
    features: [
      'Up to 25 users',
      '1 yard/site',
      'Shift Handover + Layout + Risk',
      'Email support (48h)',
      '99.5% SLA',
      '1 year data retention',
      'Basic NR compliance',
    ],
    excluded: [
      'BI+ Analytics',
      'AI Assistant',
      'API Access',
      'SSO Integration',
    ],
    highlight: false,
    cta: 'Start Free Trial',
  },
  {
    name: 'Professional',
    target: 'Mid-size operators',
    price: '$1,499',
    period: '/month',
    features: [
      'Up to 100 users',
      'Up to 5 yards/sites',
      'All Starter features',
      'BI+ Analytics + Equipment + 5S',
      'Email + Chat support (24h)',
      '99.9% SLA',
      '3 years data retention',
      'Read-only API access',
      'Azure AD SSO',
      'NR-01/11/12 compliance',
    ],
    excluded: [
      'AI Assistant',
      'Custom integrations',
    ],
    highlight: true,
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    target: 'Large railways, mining',
    price: 'Custom',
    period: '',
    features: [
      'Unlimited users',
      'Unlimited yards/sites',
      'All Professional features',
      'AI Assistant + ML insights',
      'Dedicated CSM + Phone (4h)',
      '99.95% SLA',
      'Custom data retention',
      'Full CRUD API access',
      'Any OIDC SSO',
      'Full NR suite + custom compliance',
      'Custom integrations (SAP, Oracle)',
    ],
    excluded: [],
    highlight: false,
    cta: 'Contact Sales',
  },
];

// ── FAQ Data ────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Does EFVM360 work without internet?',
    a: 'Yes. EFVM360 is built offline-first with IndexedDB event storage and automatic sync when connectivity returns. All core operations work without any network connection.',
  },
  {
    q: 'How is data security ensured?',
    a: 'We use SHA-256 blockchain-like integrity chains for tamper-proof audit trails, HMAC-signed sessions, JWT with refresh token rotation, and end-to-end encryption. All handovers are write-once sealed.',
  },
  {
    q: 'Which regulatory frameworks are supported?',
    a: 'EFVM360 includes built-in compliance for Brazilian NR-01, NR-11, and NR-12 safety regulations. Enterprise plans support custom compliance frameworks and audit services.',
  },
  {
    q: 'Can I integrate with existing systems (SAP, Oracle)?',
    a: 'Enterprise plans include custom integration support. We provide webhooks, REST API, and dedicated engineering resources for SAP PM, Oracle EBS, and other EAM platforms.',
  },
  {
    q: 'What does the onboarding process look like?',
    a: 'Our average Time to Value is under 14 days. We provide guided onboarding, video tutorials, a help center with 10+ articles, and optional implementation & training packages.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes! Both Starter and Professional plans include a 30-day free trial with full feature access. No credit card required to start.',
  },
];

// ── Stats ───────────────────────────────────────────────────────────────

const STATS = [
  { value: '12', label: 'Handover Sections' },
  { value: '450+', label: 'Automated Tests' },
  { value: '99.9%', label: 'Uptime Target' },
  { value: '<14d', label: 'Time to Value' },
];

// ── Component ───────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = useCallback((idx: number) => {
    setOpenFaq(prev => (prev === idx ? null : idx));
  }, []);

  const goToLogin = useCallback(() => navigate('/login'), [navigate]);

  const sectionStyle = {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '80px 24px',
  } as const;

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', color: COLORS.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>{SCOPED_CSS}</style>

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,15,26,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${COLORS.border}`,
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrainFront size={28} color={COLORS.green} />
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>EFVM360</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="#features" style={{ color: COLORS.textMuted, textDecoration: 'none', fontSize: 14 }}>Features</a>
            <a href="#pricing" style={{ color: COLORS.textMuted, textDecoration: 'none', fontSize: 14 }}>Pricing</a>
            <a href="#faq" style={{ color: COLORS.textMuted, textDecoration: 'none', fontSize: 14 }}>FAQ</a>
            <button onClick={goToLogin} style={{
              background: COLORS.green, color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section style={{ ...sectionStyle, textAlign: 'center', paddingTop: 100, paddingBottom: 60 }}>
        <div className="landing-fade-up">
          <div style={{
            display: 'inline-block', background: 'rgba(34,197,94,0.1)', border: `1px solid rgba(34,197,94,0.3)`,
            borderRadius: 20, padding: '6px 16px', fontSize: 13, color: COLORS.green, marginBottom: 24, fontWeight: 500,
          }}>
            <Zap size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            Replaces paper forms at Brazil's largest railway
          </div>
        </div>
        <h1 className="landing-fade-up landing-fade-up-d1" style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 20, letterSpacing: -1 }}>
          Digital Shift Handover for{' '}
          <span className="landing-gradient-text">Safety-Critical</span>{' '}
          Railway Operations
        </h1>
        <p className="landing-fade-up landing-fade-up-d2" style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: COLORS.textMuted, maxWidth: 640, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Replace paper-based shift transitions with a tamper-proof digital platform.
          Offline-first, safety-native, and built for railway operations.
        </p>
        <div className="landing-fade-up landing-fade-up-d3" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={goToLogin} style={{
            background: COLORS.green, color: '#fff', border: 'none', borderRadius: 10,
            padding: '14px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            Start Free Trial <ArrowRight size={18} />
          </button>
          <button style={{
            background: 'transparent', color: COLORS.text, border: `1px solid ${COLORS.border}`,
            borderRadius: 10, padding: '14px 32px', fontSize: 16, fontWeight: 600, cursor: 'pointer',
          }}>
            Book Demo
          </button>
        </div>

        {/* Screenshot placeholder */}
        <div className="landing-fade-up landing-fade-up-d4" style={{
          marginTop: 60, background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(59,130,246,0.1))',
          borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 40,
          maxWidth: 900, margin: '60px auto 0',
        }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted }}>
            <div style={{ textAlign: 'center' }}>
              <TrainFront size={48} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p style={{ fontSize: 14 }}>Product Dashboard Screenshot</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof Stats ────────────────────────────────────── */}
      <section style={{ borderTop: `1px solid ${COLORS.border}`, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ ...sectionStyle, padding: '40px 24px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.green }}>{s.value}</div>
              <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Differentiators ──────────────────────────────────────── */}
      <section style={{ ...sectionStyle, padding: '60px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
          {[
            { icon: WifiOff, label: 'Offline-First', desc: 'Works without connectivity' },
            { icon: Shield, label: 'Safety-Native', desc: 'HMAC integrity chain' },
            { icon: Lock, label: 'Tamper-Proof Audit', desc: 'SHA-256 sealed records' },
          ].map(d => (
            <div key={d.label} style={{
              display: 'flex', alignItems: 'center', gap: 12, background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '16px 24px',
            }}>
              <d.icon size={20} color={COLORS.green} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{d.label}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>{d.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" style={sectionStyle}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>Everything You Need</h2>
          <p style={{ color: COLORS.textMuted, fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
            Purpose-built for railway operations with safety at the core
          </p>
        </div>
        <div className="landing-grid-features">
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: COLORS.bgCard, border: `1px solid ${COLORS.border}`,
              borderRadius: 16, padding: 28, transition: 'background 0.2s',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${f.color}15`, marginBottom: 16,
              }}>
                <f.icon size={22} color={f.color} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section id="pricing" style={{ ...sectionStyle, paddingTop: 80, paddingBottom: 80 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>Simple, Transparent Pricing</h2>
          <p style={{ color: COLORS.textMuted, fontSize: 16 }}>Start free for 30 days. No credit card required.</p>
        </div>
        <div className="landing-grid-pricing">
          {PRICING.map(tier => (
            <div key={tier.name} style={{
              background: tier.highlight ? 'rgba(34,197,94,0.06)' : COLORS.bgCard,
              border: `${tier.highlight ? 2 : 1}px solid ${tier.highlight ? 'rgba(34,197,94,0.4)' : COLORS.border}`,
              borderRadius: 20, padding: 32, position: 'relative',
            }}>
              {tier.highlight && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: COLORS.green, color: '#fff', fontSize: 12, fontWeight: 700,
                  padding: '4px 16px', borderRadius: 12,
                }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 4 }}>{tier.target}</div>
              <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{tier.name}</h3>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 36, fontWeight: 800 }}>{tier.price}</span>
                <span style={{ fontSize: 14, color: COLORS.textMuted }}>{tier.period}</span>
              </div>
              <button onClick={tier.name === 'Enterprise' ? undefined : goToLogin} style={{
                width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                background: tier.highlight ? COLORS.green : 'rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 24,
              }}>
                {tier.cta}
              </button>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {tier.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10, fontSize: 14 }}>
                    <Check size={16} color={COLORS.green} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{f}</span>
                  </li>
                ))}
                {tier.excluded.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10, fontSize: 14, color: COLORS.textMuted }}>
                    <X size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section id="faq" style={{ ...sectionStyle, paddingBottom: 60 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>Frequently Asked Questions</h2>
        </div>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx} style={{
              borderBottom: `1px solid ${COLORS.border}`, padding: '20px 0',
            }}>
              <button onClick={() => toggleFaq(idx)} style={{
                width: '100%', background: 'none', border: 'none', color: COLORS.text,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 16, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: 0,
              }}>
                {item.q}
                {openFaq === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openFaq === idx && (
                <p style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.7, marginTop: 12, marginBottom: 0 }}>
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(59,130,246,0.08))',
        borderTop: `1px solid ${COLORS.border}`,
      }}>
        <div style={{ ...sectionStyle, textAlign: 'center', padding: '80px 24px' }}>
          <Star size={32} color={COLORS.yellow} style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>Start Your 30-Day Free Trial</h2>
          <p style={{ color: COLORS.textMuted, fontSize: 16, maxWidth: 500, margin: '0 auto 32px' }}>
            Join railway operators modernizing their shift handover process. No credit card required.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={goToLogin} style={{
              background: COLORS.green, color: '#fff', border: 'none', borderRadius: 10,
              padding: '14px 36px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              Get Started <ArrowRight size={18} />
            </button>
            <button style={{
              background: 'transparent', color: COLORS.text, border: `1px solid ${COLORS.border}`,
              borderRadius: 10, padding: '14px 36px', fontSize: 16, fontWeight: 600, cursor: 'pointer',
            }}>
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${COLORS.border}`, padding: '40px 24px',
        textAlign: 'center', color: COLORS.textMuted, fontSize: 13,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
          <a href="/help" style={{ color: COLORS.textMuted, textDecoration: 'none' }}>Help Center</a>
          <a href="/docs/TERMS_OF_SERVICE.md" style={{ color: COLORS.textMuted, textDecoration: 'none' }}>Terms of Service</a>
          <a href="/docs/PRIVACY_POLICY.md" style={{ color: COLORS.textMuted, textDecoration: 'none' }}>Privacy Policy</a>
        </div>
        <p style={{ margin: 0 }}>
          &copy; {new Date().getFullYear()} EFVM360. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
