# EFVM360 — Go-to-Market Strategy

**Data:** 2026-03-05  
**Objetivo:** Preparar plataforma para comercialização global  
**Pré-requisito:** Features Evolution completa (Fase 3)  

---

## Positioning

### Product

**EFVM360** — Enterprise Railway Operations Management Platform

### Tagline

*"Digital Shift Handover for Safety-Critical Railway Operations"*

### Target Market

| Segment | Description | Size |
|---------|-------------|------|
| Primary | Railway operators (freight + passenger) | ~700 globally |
| Secondary | Mining companies with private railways | ~200 globally |
| Tertiary | Port/terminal operators | ~500 globally |
| Adjacent | Any heavy industry with shift handover needs | 10,000+ |

### Unique Value Proposition

1. **Offline-first** — Works in railway environments with no connectivity
2. **Safety-native** — HMAC integrity chain + audit trail (tamper-proof)
3. **DDD architecture** — Domain events model real railway operations
4. **Brazilian NR compliance** — Built-in regulatory framework
5. **AI-assisted** — AdamBot for real-time operational guidance

### Competitive Landscape

| Competitor | Strength | EFVM360 Advantage |
|-----------|----------|-------------------|
| SAP PM | Enterprise integration | Offline-first, railway-specific UI |
| Oracle EBS | Scale | Modern UX, faster deployment |
| Infor EAM | Asset management | Shift handover focus, DDD events |
| Custom spreadsheets | Familiarity | Digital audit trail, compliance |
| Paper forms | Zero cost | Safety, speed, analytics |

---

## STEP 1 — Legal & Compliance

### 1.1 Terms of Service

```markdown
Key clauses needed:
- Service description and limitations
- User responsibilities (data accuracy)
- Data ownership (customer owns their data)
- SLA definitions (99.9% uptime target)
- Liability limitation (especially safety-critical context)
- Governing law (BR + international options)
- Data processing agreement (LGPD + GDPR)
```

### 1.2 Privacy Policy (LGPD + GDPR)

```markdown
Required disclosures:
- What data is collected (matrícula, name, role, operational data)
- How data is processed (shift handover, analytics, audit trail)
- Data retention periods (regulatory requirements)
- User rights (access, rectification, deletion, portability)
- International transfers (if cloud-hosted)
- DPO contact information
- Cookie policy (if applicable)
```

### 1.3 Compliance Certifications (Roadmap)

| Certification | Priority | Timeline |
|--------------|----------|----------|
| ISO 27001 (Info Security) | 🔴 HIGH | 6-12 months |
| SOC 2 Type II | 🔴 HIGH | 6-12 months |
| LGPD Compliance | ✅ DONE | In documentation |
| GDPR Compliance | 🟠 MEDIUM | 3-6 months |
| ISO 55001 (Asset Management) | 🟡 LOW | 12-18 months |

### 1.4 Export Controls

Railway operations software may be subject to export controls in some jurisdictions. Verify:
- No dual-use technology restrictions
- Compliance with Brazilian export regulations
- US EAR/ITAR considerations (if deploying in US)

---

## STEP 2 — Landing Page

### 2.1 Page Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  HERO                                                            │
│  "Digital Shift Handover for Railway Operations"                 │
│  [Start Free Trial]  [Book Demo]                                 │
│  Screenshot/video of dashboard                                   │
├──────────────────────────────────────────────────────────────────┤
│  SOCIAL PROOF                                                    │
│  "Replaces paper forms at Brazil's largest railway"              │
│  Stats: 12 handover sections | 277+ tests | 99.9% uptime        │
├──────────────────────────────────────────────────────────────────┤
│  FEATURES (6 cards with icons)                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                         │
│  │ Handover │ │ Yard Mgmt│ │ Risk 5×5 │                         │
│  └──────────┘ └──────────┘ └──────────┘                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                         │
│  │ Equipment│ │ BI+ Dash │ │ AI Bot   │                         │
│  └──────────┘ └──────────┘ └──────────┘                         │
├──────────────────────────────────────────────────────────────────┤
│  DIFFERENTIATORS                                                 │
│  Offline-First · Safety-Native · Tamper-Proof Audit              │
├──────────────────────────────────────────────────────────────────┤
│  PRICING                                                         │
│  Starter | Professional | Enterprise                             │
├──────────────────────────────────────────────────────────────────┤
│  FAQ                                                             │
├──────────────────────────────────────────────────────────────────┤
│  CTA                                                             │
│  "Start your 30-day free trial"                                  │
│  [Get Started]  [Contact Sales]                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Tech Stack (Landing Page)

- **Option A:** Static HTML/CSS/JS (simplest, fastest)
- **Option B:** React + Vite (same stack, shared components)
- **Option C:** Astro (SSG, best SEO, island architecture)

**Recomendação:** Astro — best of both worlds (static SEO + React islands for interactive pricing).

---

## STEP 3 — Pricing Model

### 3.1 Tiers

| | Starter | Professional | Enterprise |
|--|---------|-------------|------------|
| **Target** | Small railways, pilots | Mid-size operators | Large railways, mining |
| **Price** | $499/mo | $1,499/mo | Custom |
| **Users** | Up to 25 | Up to 100 | Unlimited |
| **Sites** | 1 pátio | Up to 5 pátios | Unlimited |
| **Features** | Handover + Layout + Risk | + BI+ Analytics + Equipment + 5S | + AI Assistant + Integrations + ML |
| **Support** | Email (48h) | Email + Chat (24h) | Dedicated CSM + Phone (4h) |
| **SLA** | 99.5% | 99.9% | 99.95% |
| **Data Retention** | 1 year | 3 years | Custom |
| **API Access** | — | Read-only | Full CRUD |
| **SSO** | — | Azure AD | Any OIDC |
| **Compliance** | Basic | NR-01/11/12 | Full NR suite + custom |

### 3.2 Additional Revenue

| Item | Price |
|------|-------|
| Implementation & Training | $5,000 — $25,000 (one-time) |
| Custom integrations (SAP, Oracle) | $10,000 — $50,000 per integration |
| Additional sites (Enterprise) | $200/site/month |
| Premium support upgrade | $500/month |
| Compliance audit service | $2,500/audit |

### 3.3 Metrics to Track

| Metric | Target | Description |
|--------|--------|-------------|
| MRR | Track monthly | Monthly Recurring Revenue |
| ARR | $100K year 1 | Annual Recurring Revenue |
| Churn Rate | < 5% monthly | Customer retention |
| CAC | < $5,000 | Customer Acquisition Cost |
| LTV | > 36 months | Lifetime Value |
| LTV:CAC | > 3:1 | Unit economics |
| NRR | > 100% | Net Revenue Retention (expansion) |
| Time to Value | < 14 days | Onboarding speed |

---

## STEP 4 — Email Infrastructure

### 4.1 Transactional Emails

| Email | Trigger | Priority |
|-------|---------|----------|
| Welcome | User registration | 🔴 |
| Password reset | Forgot password | 🔴 |
| Shift handover notification | New handover created | 🔴 |
| Handover signed | Digital signature applied | 🟠 |
| Equipment alert | Criticality threshold | 🟠 |
| Risk alert | New critical risk | 🟠 |
| Weekly digest | Monday 06:00 | 🟡 |
| Compliance reminder | NR deadline approaching | 🟡 |

### 4.2 Tech Stack

**Recommended:** Resend (modern, developer-friendly, good free tier)

```typescript
// backend/src/services/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendHandoverNotification(to: string, handover: HandoverSummary) {
  await resend.emails.send({
    from: 'EFVM360 <noreply@efvm360.com>',
    to,
    subject: `Nova Passagem de Serviço — ${handover.patio} — ${handover.shift}`,
    html: renderHandoverEmail(handover),
  });
}
```

### 4.3 Marketing Emails

| Campaign | Audience | Frequency |
|----------|----------|-----------|
| Product updates | All users | Monthly |
| Feature announcements | All users | As needed |
| Case studies | Leads | Bi-weekly |
| Railway industry newsletter | Subscribers | Monthly |
| Onboarding drip | New trials | Days 1, 3, 7, 14 |

---

## STEP 5 — Help Center

### 5.1 Structure

```
help.efvm360.com/
├── Getting Started
│   ├── Quick Start Guide
│   ├── First Login
│   ├── Creating Your First Handover
│   └── Understanding the Dashboard
├── Features
│   ├── Shift Handover
│   ├── Yard Layout Management
│   ├── Risk Assessment
│   ├── Equipment Management
│   ├── BI+ Analytics
│   └── AdamBot AI Assistant
├── Administration
│   ├── User Management
│   ├── Role Permissions
│   ├── Site Configuration
│   └── Integration Setup
├── Troubleshooting
│   ├── Offline Mode
│   ├── Sync Issues
│   ├── Login Problems
│   └── Browser Compatibility
├── API Documentation
│   ├── Authentication
│   ├── Endpoints Reference
│   └── Webhook Setup
└── Legal
    ├── Terms of Service
    ├── Privacy Policy
    └── LGPD / GDPR
```

### 5.2 Tech Stack

**Recommended:** Mintlify (modern docs platform) or Docusaurus (self-hosted).

### 5.3 Video Tutorials

| Tutorial | Duration | Priority |
|----------|----------|----------|
| Platform Overview | 3 min | 🔴 |
| Creating a Shift Handover | 5 min | 🔴 |
| Yard Layout Setup | 4 min | 🟠 |
| Risk Assessment Walkthrough | 4 min | 🟠 |
| Using AdamBot | 3 min | 🟡 |
| Admin: User Management | 3 min | 🟡 |
| Offline Mode & Sync | 3 min | 🟡 |

---

## STEP 6 — Business Analytics

### 6.1 Admin Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│  EFVM360 Admin — Business Metrics              [Last 30 days ▼] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │
│  │ MRR      │ │ Active   │ │ Churn    │ │ NPS              │    │
│  │ $4,497   │ │ Users    │ │ Rate     │ │ Score            │    │
│  │ +12%     │ │ 87       │ │ 2.1%     │ │ 72               │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Revenue Trend (12 months)                                   │ │
│  │ [Area Chart]                                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────┐ ┌──────────────────────────────────┐ │
│  │ Usage by Feature       │ │ Customer Pipeline                │ │
│  │ Handover:    89%       │ │ Trial:       12                  │ │
│  │ Layout:      67%       │ │ Starter:      5                  │ │
│  │ Risk:        45%       │ │ Professional:  2                 │ │
│  │ Analytics:   34%       │ │ Enterprise:    1                 │ │
│  │ AdamBot:     28%       │ │                                  │ │
│  └────────────────────────┘ └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Product Analytics

**Tools:** PostHog (self-hosted, privacy-friendly) or Mixpanel

**Key Events to Track:**

| Event | Properties | Purpose |
|-------|-----------|---------|
| `handover.created` | sections_filled, time_to_complete | Feature adoption |
| `handover.signed` | time_to_sign, role | Completion rate |
| `yard.layout.updated` | changes_count | Feature usage |
| `risk.grade.created` | severity, nr_reference | Risk management |
| `adambot.query` | query_type, response_time | AI usage |
| `sync.completed` | records_synced, duration | Offline quality |
| `user.login` | method (password/sso), device | Auth patterns |
| `page.viewed` | page_name, duration | Engagement |

### 6.3 Alerting Rules

| Alert | Condition | Channel |
|-------|-----------|---------|
| Churn risk | User inactive 14+ days | Email to CSM |
| SLA breach | Uptime < 99.9% in 24h | PagerDuty |
| Error spike | Error rate > 5% | Slack #alerts |
| New trial | User signs up | Slack #sales |
| Feature milestone | 100th handover created | Slack #product |

---

## STEP 7 — Go-to-Market Timeline

### Phase 1: Foundation (Month 1-2)
- [ ] Legal: Terms of Service + Privacy Policy
- [ ] Landing page live
- [ ] Pricing page with Stripe integration
- [ ] Email infrastructure (Resend)
- [ ] Help center (minimum 10 articles)

### Phase 2: Launch (Month 3-4)
- [ ] Beta program with 3-5 pilot customers
- [ ] Product Hunt launch
- [ ] LinkedIn campaign targeting railway professionals
- [ ] 3 video tutorials published
- [ ] NPS survey implemented

### Phase 3: Growth (Month 5-8)
- [ ] First paying customer
- [ ] Case study from beta
- [ ] SEO content (railway operations blog)
- [ ] Conference presence (Rail Summit, InnoTrans)
- [ ] Partnership with railway consultancies

### Phase 4: Scale (Month 9-12)
- [ ] $100K ARR target
- [ ] 5+ paying customers
- [ ] ISO 27001 certification started
- [ ] International expansion (LatAm first, then Europe)
- [ ] Full API documentation + marketplace

---

## Acceptance Criteria (Fase 4 Completa)

- [ ] Terms of Service and Privacy Policy published
- [ ] Landing page live with analytics
- [ ] Pricing page with tier comparison
- [ ] Stripe (or equivalent) payment integration
- [ ] Transactional emails working (welcome, handover notification)
- [ ] Help center with 10+ articles
- [ ] Product analytics tracking core events
- [ ] Business dashboard with MRR, churn, usage metrics
- [ ] Domain purchased (efvm360.com or equivalent)
- [ ] SSL certificate on all domains

---

*Este documento é executado via run-master.sh Fase 4*
