# Privacy Policy — EFVM360 Enterprise Railway Operations Management Platform

**Effective Date:** March 5, 2026
**Last Updated:** March 5, 2026
**Version:** 1.0

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Data Controller Information](#2-data-controller-information)
3. [Data We Collect](#3-data-we-collect)
4. [Legal Basis for Processing](#4-legal-basis-for-processing)
5. [How We Use Your Data](#5-how-we-use-your-data)
6. [Data Sharing and Third Parties](#6-data-sharing-and-third-parties)
7. [International Data Transfers](#7-international-data-transfers)
8. [Data Retention](#8-data-retention)
9. [Your Rights Under LGPD](#9-your-rights-under-lgpd)
10. [Your Rights Under GDPR](#10-your-rights-under-gdpr)
11. [Data Security](#11-data-security)
12. [Cookies and Tracking Technologies](#12-cookies-and-tracking-technologies)
13. [Children's Privacy](#13-childrens-privacy)
14. [Data Protection Officer (DPO)](#14-data-protection-officer-dpo)
15. [Data Breach Notification](#15-data-breach-notification)
16. [Changes to This Policy](#16-changes-to-this-policy)
17. [Contact Information](#17-contact-information)

---

## 1. Introduction

This Privacy Policy ("Policy") describes how EFVM360 — the Enterprise Railway Operations Management Platform ("Platform", "System", "we", "us", or "our") — collects, uses, stores, shares, and protects personal data of its users ("you", "data subject", "titular").

EFVM360 is an enterprise platform designed to manage shift handover operations, equipment inspections, operational analytics, and audit trails for the Estrada de Ferro Vitoria a Minas (EFVM) railway corridor. The Platform is used by railway operations personnel including operators, supervisors, managers, and administrative staff.

This Policy is designed to comply with:

- **Brazilian General Data Protection Law (LGPD)** — Lei n. 13.709/2018, as amended
- **European General Data Protection Regulation (GDPR)** — Regulation (EU) 2016/679

Where local law provides greater protection than described in this Policy, the applicable local law shall prevail. If there is a conflict between the LGPD and GDPR provisions stated herein, the provision that affords greater protection to the data subject shall apply.

By accessing or using the Platform, you acknowledge that you have read and understood this Privacy Policy. For employees, use of the Platform is a condition of your operational role; the legal bases for processing are described in Section 4 below.

---

## 2. Data Controller Information

The data controller responsible for processing your personal data through the EFVM360 Platform is:

| Field | Details |
|-------|---------|
| **Controller** | Vale S.A. |
| **CNPJ** | 33.592.510/0001-54 |
| **Registered Address** | Praia de Botafogo, 186, Rio de Janeiro — RJ, Brazil, CEP 22250-145 |
| **Controller Representative (EU)** | Vale International S.A., Route de Pallatex 29, 1162 St-Prex, Switzerland |
| **Platform** | EFVM360 — Enterprise Railway Operations Management |
| **Contact** | dpo@vale.com |
| **LGPD Privacy Channel** | https://vale.com/privacidade |

For the purposes of the GDPR, where Vale S.A. processes personal data of individuals in the European Economic Area (EEA), the EU representative identified above acts as the point of contact for European data protection authorities and data subjects.

---

## 3. Data We Collect

We collect and process the following categories of data:

### 3.1 Personal Identification Data

| Data Element | Description | Mandatory |
|-------------|-------------|-----------|
| Full Name (nome completo) | Employee's legal name as registered in HR systems | Yes |
| Employee ID (matricula) | Unique employee registration number | Yes |
| Role/Position (funcao/cargo) | Operational role and hierarchical position | Yes |
| Azure AD Object ID | SSO identity token from corporate directory | Yes (SSO users) |

### 3.2 Authentication and Access Data

| Data Element | Description | Mandatory |
|-------------|-------------|-----------|
| Password (hashed) | Bcrypt-hashed password — never stored in plaintext | Yes (local auth) |
| Login timestamps | Date and time of each authentication event | Automatic |
| Session tokens (JWT) | Encrypted session identifiers with 8-hour expiry | Automatic |
| Consent record | Timestamp, terms version, and IP at time of consent | Automatic |

### 3.3 Operational Data

| Data Element | Description | Mandatory |
|-------------|-------------|-----------|
| Shift handover records | Structured reports documenting shift transitions, equipment status, and operational notes | Yes |
| Equipment inspection data | Condition assessments, deficiency reports, maintenance flags | Yes |
| Digital signatures | Cryptographic signatures confirming authorship of operational records | Yes |
| Operational annotations | Free-text notes attached to shift reports and inspections | Conditional |
| Audit trail entries | Append-only log of all data modifications with SHA-256 hash chain | Automatic |
| Webhook event payloads | Integration data sent to configured external systems | Conditional |

### 3.4 Technical and Telemetry Data

| Data Element | Description | Mandatory |
|-------------|-------------|-----------|
| IP address | Source IP of each request | Automatic |
| User-Agent string | Browser/device identification | Automatic |
| Device information | Screen resolution, OS, browser version (via PWA) | Automatic |
| Performance metrics | Page load times, API response times | Automatic |
| Error logs | Stack traces and error context (personal data redacted) | Automatic |
| Offline sync metadata | Timestamps and conflict resolution data from offline mode | Automatic |

### 3.5 Data We Do NOT Collect

The Platform does **not** collect:

- Biometric data (fingerprints, facial recognition, voice patterns)
- Health or medical data
- Racial or ethnic origin data
- Political opinions, religious beliefs, or philosophical views
- Trade union membership information
- Genetic data
- Data concerning sex life or sexual orientation
- Criminal conviction data
- Financial or banking information
- Personal social media profiles
- Geolocation data (GPS coordinates)

---

## 4. Legal Basis for Processing

### 4.1 Under LGPD (Lei 13.709/2018, Art. 7)

| Legal Basis | LGPD Article | Data Categories | Justification |
|-------------|-------------|-----------------|---------------|
| **Performance of contract** | Art. 7, V | Name, matricula, role, shift records | Processing is necessary for executing the employment contract and performing operational duties |
| **Legal/regulatory obligation** | Art. 7, II | Audit trails, digital signatures, operational records, shift handovers | Railway safety regulations (ANTT) and labor law require retention of operational records |
| **Legitimate interest** | Art. 7, IX | IP address, User-Agent, session data, analytics, performance metrics | Security monitoring, fraud prevention, system optimization, and operational efficiency |
| **Prevention of fraud** | Art. 7, VI | Authentication data, access logs, audit trail | Protecting system integrity and detecting unauthorized access |

**Legitimate Interest Assessment (LIA):** We have conducted a legitimate interest assessment for each processing activity relying on Art. 7, IX. The assessment concluded that our interest in maintaining railway operational safety, system security, and performance optimization does not override the fundamental rights of data subjects, particularly considering: (a) the data processed is limited to professional context; (b) data subjects reasonably expect this processing; (c) appropriate safeguards including data minimization, access controls, and retention limits are in place.

### 4.2 Under GDPR (Regulation (EU) 2016/679, Art. 6)

| Legal Basis | GDPR Article | Data Categories | Justification |
|-------------|-------------|-----------------|---------------|
| **Performance of contract** | Art. 6(1)(b) | Name, matricula, role, shift records | Necessary for fulfilling employment obligations |
| **Legal obligation** | Art. 6(1)(c) | Audit trails, digital signatures, operational records | Compliance with railway safety regulations, occupational health and safety law, and record-keeping obligations |
| **Legitimate interest** | Art. 6(1)(f) | IP address, User-Agent, session data, analytics | Network/information security (Recital 49), operational efficiency, and fraud prevention |
| **Consent** | Art. 6(1)(a) | Non-essential cookies, optional analytics | Where required, explicit consent is obtained and recorded |

**GDPR Legitimate Interest Balancing Test:** Processing of technical data for security purposes falls within the reasonable expectations of employees using an enterprise operational system. The processing is proportionate and limited to what is necessary. Data subjects retain the right to object under Art. 21 GDPR.

---

## 5. How We Use Your Data

We process your personal data for the following purposes:

### 5.1 Operational Management

- Recording and managing shift handover processes between operational teams
- Documenting equipment inspections, deficiency tracking, and maintenance workflows
- Generating operational reports and heatmap analytics for management oversight
- Enabling trend analysis across shifts, locations, and time periods
- Producing PDF reports for operational review and regulatory submission

### 5.2 Authentication and Access Control

- Verifying your identity through local credentials or Azure AD Single Sign-On (SSO)
- Enforcing role-based access control (RBAC) across five hierarchical levels
- Managing session lifecycle with time-limited JWT tokens (8-hour expiry)
- Recording consent acceptance at first login, including terms version and timestamp

### 5.3 Audit and Compliance

- Maintaining an immutable, append-only audit trail of all system operations
- Preserving digital signatures confirming authorship of operational records
- Generating compliance reports for regulatory authorities (ANTT, ANPD)
- Supporting internal and external audit processes

### 5.4 System Security and Integrity

- Monitoring access patterns to detect unauthorized or anomalous activity
- Logging IP addresses and User-Agents for security incident investigation
- Protecting data integrity through SHA-256 hash-chained audit logs
- Supporting incident response and forensic analysis when required

### 5.5 System Integration and Data Export

- Processing webhook events to configured external systems
- Enabling data export through secure API endpoints
- Synchronizing offline data when connectivity is restored (PWA/Capacitor)

### 5.6 Analytics and Improvement

- Generating aggregated, anonymized analytics on operational performance
- Monitoring system performance and user experience metrics
- Identifying areas for process improvement through trend analysis

---

## 6. Data Sharing and Third Parties

### 6.1 Internal Access

Your data is accessible within the organization based on the following hierarchy:

| Role | Access Scope |
|------|-------------|
| **Operator (Maquinista)** | Own shift records, own profile |
| **Supervisor** | Team shift records, team member profiles |
| **Manager (Gerente)** | All records within their operational area |
| **Admin** | All records, system configuration, user management |
| **System Admin** | Full platform access including technical administration |

Access is strictly enforced through role-based access control (RBAC). All access events are logged in the audit trail.

### 6.2 Third-Party Service Providers (Data Processors)

We engage the following categories of third-party service providers who process data on our behalf:

| Provider Category | Provider | Purpose | Safeguards |
|------------------|----------|---------|------------|
| Cloud Infrastructure | Microsoft Azure | Hosting, database, identity (Azure AD) | Data Processing Agreement (DPA), ISO 27001, SOC 2 Type II |
| Application Monitoring | Azure Application Insights | Performance monitoring, error tracking | Data processed within Azure tenant, DPA in place |
| Email Services | Corporate email provider | Notification delivery | Enterprise agreement with data protection clauses |

All third-party processors are bound by:

- Written Data Processing Agreements (DPAs) compliant with LGPD Art. 39 and GDPR Art. 28
- Obligation to process data only under documented instructions
- Confidentiality obligations on all personnel with access
- Technical and organizational security measures
- Sub-processor oversight and approval requirements
- Obligation to assist with data subject rights requests
- Data return or deletion obligations upon contract termination

### 6.3 Third-Party Data Sharing

We do **not** sell, rent, or trade your personal data to any third party.

We may disclose your personal data only in the following circumstances:

- **Legal requirement:** When required by law, regulation, court order, or governmental authority (including ANPD, ANTT, and labor authorities)
- **Regulatory compliance:** When necessary to comply with railway safety and operational regulations
- **Legal proceedings:** When necessary to establish, exercise, or defend legal claims
- **Vital interests:** In emergency situations involving risk to life or physical safety
- **Webhook integrations:** When configured by system administrators, operational data (which may contain personal identifiers) may be transmitted to authorized external systems via webhook endpoints. Such integrations are documented and subject to data protection impact assessments

---

## 7. International Data Transfers

### 7.1 Transfer Mechanisms

The EFVM360 Platform is primarily hosted on Microsoft Azure infrastructure. Depending on deployment configuration, data may be processed in the following regions:

| Region | Purpose | Transfer Mechanism |
|--------|---------|-------------------|
| Brazil (Azure Brazil South) | Primary data processing and storage | No transfer (local) |
| United States | Azure AD authentication, certain Azure services | Standard Contractual Clauses (SCCs) per GDPR Art. 46(2)(c); LGPD Art. 33, II |
| European Union | EU representative services, potential DR site | Adequacy (intra-EEA); SCCs for Brazil-EU transfers |

### 7.2 Safeguards for International Transfers

All international data transfers are protected by:

- **Standard Contractual Clauses (SCCs):** Adopted pursuant to European Commission Implementing Decision (EU) 2021/914, ensuring GDPR-equivalent protection
- **LGPD Transfer Mechanisms (Art. 33):** Transfers are based on contractual clauses (Art. 33, II, b), corporate rules (Art. 33, II, d), or regulatory authorization
- **Supplementary Measures:** Including encryption in transit (TLS 1.2+), encryption at rest (Azure TDE), access controls, and audit logging
- **Microsoft DPA:** Microsoft's Data Processing Agreement for Azure services includes EU Standard Contractual Clauses and comprehensive data protection commitments
- **Transfer Impact Assessments:** We conduct transfer impact assessments to evaluate the legal framework of recipient countries

### 7.3 Data Localization

Where operationally feasible and required by regulation, primary data storage is configured in the Azure Brazil South region to minimize international transfers of personal data.

---

## 8. Data Retention

### 8.1 Retention Schedule

| Data Category | Retention Period | Justification |
|--------------|-----------------|---------------|
| Employee profile data (name, matricula, role) | Duration of active employment + 5 years | Employment law statute of limitations; regulatory record-keeping |
| Shift handover records | 5 years from creation | Railway safety regulation (ANTT); operational record-keeping obligations |
| Equipment inspection records | 5 years from creation | Regulatory compliance; maintenance history requirements |
| Digital signatures | 5 years from creation | Legal/regulatory obligation; evidence preservation |
| Audit trail (operational) | 5 years from creation | Regulatory compliance; legal obligation (LGPD Art. 7, II) |
| Access logs (IP, User-Agent) | 90 days | Security monitoring; proportionality principle |
| Session tokens (JWT) | 8 hours (automatic expiry) | Authentication lifecycle |
| Authentication logs | 1 year | Security incident investigation |
| Consent records | Duration of processing + 5 years | Proof of lawful basis; accountability obligation |
| Azure AD Object ID | Duration of active employment + 5 years | Aligned with profile data retention |
| Offline sync metadata | 30 days after successful sync | Technical necessity only |
| Analytics/aggregated data | Indefinite (anonymized) | No personal data; statistical purposes |
| Webhook delivery logs | 90 days | Troubleshooting and audit |
| PDF reports (exported) | Subject to recipient's retention policy | Controller responsibility transfers upon export |
| Password hash | Until account deletion or password change | Authentication only |

### 8.2 Retention Principles

- **Minimization:** Data is retained only for the minimum period necessary to fulfill the stated purpose
- **Regulatory priority:** Where regulatory requirements mandate longer retention (e.g., railway safety records), the regulatory period prevails
- **Automatic enforcement:** Retention policies are enforced through automated database cleanup processes
- **Anonymization over deletion:** For operational records subject to regulatory retention, personal identifiers are anonymized rather than deleted, preserving the operational record while protecting privacy

### 8.3 Automated Retention Enforcement

The Platform implements automated data lifecycle management:

- **Access logs:** Automatically purged after 90 days
- **Inactive user profiles:** Anonymized after 5 years of inactivity (name replaced with "Anonymized User", optional fields nullified)
- **Expired sessions:** Automatically invalidated and purged

### 8.4 Post-Retention Handling

Upon expiration of the retention period:

- Personal data is securely deleted or irreversibly anonymized
- Deletion is performed using secure erasure methods appropriate to the storage medium
- Anonymization renders data permanently non-identifiable, with no possibility of re-identification
- A record of the deletion/anonymization event is maintained in the audit trail (without the deleted personal data)

---

## 9. Your Rights Under LGPD

Under the Brazilian General Data Protection Law (Lei 13.709/2018, Art. 18), you have the following rights regarding your personal data:

### 9.1 Right to Confirmation and Access (Art. 18, I and II)

You have the right to confirm whether your personal data is being processed and to access the data we hold about you.

- **How to exercise:** Navigate to **Settings > Privacy** in the Platform, or send a request to the DPO
- **API endpoint:** `GET /api/v1/lgpd/meus-dados` (authenticated)
- **Response time:** Within 15 days of request (Art. 19, II)
- **Format:** Data provided in a clear, complete, and readable format

### 9.2 Right to Correction (Art. 18, III)

You have the right to request correction of incomplete, inaccurate, or outdated personal data.

- **How to exercise:** Contact your supervisor or system administrator, or use the self-service profile editing feature
- **API endpoint:** `PATCH /api/v1/usuarios/:uuid`
- **Scope:** Name, role/position, and other modifiable profile fields. Matricula changes require HR verification

### 9.3 Right to Anonymization, Blocking, or Deletion (Art. 18, IV)

You have the right to request anonymization, blocking, or deletion of data that is unnecessary, excessive, or processed in non-compliance with the LGPD.

- **Important limitation:** Operational records (shift handovers, inspections, audit trails) are subject to regulatory retention requirements. In such cases, personal identifiers will be **anonymized** rather than deleted, preserving the operational record as required by law
- **API endpoint:** `POST /api/v1/lgpd/anonimizar`

### 9.4 Right to Data Portability (Art. 18, V)

You have the right to receive your personal data in a structured, commonly used, machine-readable format for transfer to another controller.

- **How to exercise:** Request portability through the Platform or contact the DPO
- **API endpoint:** `POST /api/v1/lgpd/exportar`
- **Format:** JSON export containing your profile data and associated operational records
- **Scope:** Covers data provided by you and data generated through your use of the Platform

### 9.5 Right to Information About Sharing (Art. 18, VII)

You have the right to information about public and private entities with which your data has been shared. This information is documented in Section 6 of this Policy and available upon request.

### 9.6 Right to Information About Consent (Art. 18, VIII)

You have the right to information about the possibility of denying consent and the consequences of such denial. Where consent is the legal basis, you will be informed at the point of collection.

### 9.7 Right to Revoke Consent (Art. 18, IX)

Where processing is based on consent, you may revoke it at any time through the Platform settings or by contacting the DPO. Revocation does not affect the lawfulness of processing carried out prior to withdrawal.

### 9.8 Right to Petition the ANPD (Art. 18, paragraph 1)

You have the right to petition the Brazilian National Data Protection Authority (Autoridade Nacional de Protecao de Dados — ANPD) regarding any concerns about the processing of your personal data.

- **ANPD Contact:** https://www.gov.br/anpd
- **Petitioning Portal:** https://www.gov.br/anpd/pt-br/canais_atendimento/cidadao-titular-de-dados

### 9.9 Right to Object (Art. 18, paragraph 2)

You have the right to object to processing carried out on the basis of legitimate interest, where you believe your fundamental rights and freedoms are being disproportionately affected.

### 9.10 Exercising Your Rights

| Channel | Details |
|---------|---------|
| **In-Platform** | Settings > Privacy menu |
| **API** | Authenticated LGPD endpoints (see above) |
| **Email** | dpo@vale.com |
| **Web Portal** | https://vale.com/privacidade |
| **Response Time** | Up to 15 days (simple requests); may be extended with justification |

All requests are logged in the audit trail. Identity verification is required before processing any data subject request.

---

## 10. Your Rights Under GDPR

If you are located in the European Economic Area (EEA), the United Kingdom, or Switzerland, you are entitled to the following rights under the General Data Protection Regulation (EU) 2016/679:

### 10.1 Right of Access (Art. 15)

You have the right to obtain confirmation as to whether your personal data is being processed, and to access the data along with supplementary information including:

- The purposes of processing
- The categories of personal data concerned
- The recipients or categories of recipients
- The envisaged retention period
- The existence of your other rights
- The source of the data (if not collected from you directly)
- The existence of automated decision-making, including profiling

**Response time:** Within one (1) month of receipt, extendable by two (2) additional months for complex requests.

### 10.2 Right to Rectification (Art. 16)

You have the right to obtain the rectification of inaccurate personal data and to have incomplete data completed.

### 10.3 Right to Erasure ("Right to Be Forgotten") (Art. 17)

You have the right to obtain erasure of your personal data where:

- The data is no longer necessary for the purpose for which it was collected
- You withdraw consent (where consent was the legal basis)
- You object to processing and there are no overriding legitimate grounds
- The data has been unlawfully processed

**Limitations:** This right does not apply where processing is necessary for compliance with a legal obligation (Art. 17(3)(b)) or for the establishment, exercise, or defense of legal claims (Art. 17(3)(e)). Railway operational records subject to regulatory retention requirements fall within these exceptions; personal identifiers will be anonymized rather than deleted.

### 10.4 Right to Restriction of Processing (Art. 18 GDPR)

You have the right to obtain restriction of processing where:

- You contest the accuracy of the data (restriction during verification)
- Processing is unlawful and you oppose erasure
- We no longer need the data but you require it for legal claims
- You have objected to processing pending verification of legitimate grounds

### 10.5 Right to Data Portability (Art. 20)

You have the right to receive your personal data in a structured, commonly used, machine-readable format (JSON) and to transmit it to another controller where processing is based on consent or contract and carried out by automated means.

### 10.6 Right to Object (Art. 21)

You have the right to object at any time to processing of your personal data based on legitimate interest (Art. 6(1)(f)). We will cease processing unless we demonstrate compelling legitimate grounds that override your interests, rights, and freedoms, or the processing is necessary for legal claims.

### 10.7 Rights Related to Automated Decision-Making (Art. 22)

The EFVM360 Platform does **not** make decisions based solely on automated processing that produce legal effects or similarly significantly affect you. All operational decisions involve human oversight.

If automated decision-making is introduced in the future, you will be informed and afforded the right to:

- Obtain human intervention
- Express your point of view
- Contest the decision

### 10.8 Right to Lodge a Complaint (Art. 77)

You have the right to lodge a complaint with a supervisory authority in the EU Member State of your habitual residence, place of work, or place of the alleged infringement.

### 10.9 Exercising Your GDPR Rights

| Channel | Details |
|---------|---------|
| **Email** | dpo@vale.com |
| **EU Representative** | Vale International S.A., Route de Pallatex 29, 1162 St-Prex, Switzerland |
| **Response Time** | Within one (1) month; extendable by two (2) months for complex or numerous requests |
| **Cost** | Free of charge; a reasonable fee may apply for manifestly unfounded or excessive requests |
| **Identity Verification** | Required before processing any request |

---

## 11. Data Security

We implement comprehensive technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction:

### 11.1 Technical Measures

| Measure | Implementation |
|---------|---------------|
| **Encryption in transit** | TLS 1.2+ enforced on all connections (HTTPS only) |
| **Encryption at rest** | Azure Transparent Data Encryption (TDE) for database; Azure Key Vault for secrets and cryptographic keys |
| **Password security** | Bcrypt hashing with 12 rounds (irreversible); passwords never stored in plaintext |
| **Access control** | Role-Based Access Control (RBAC) with five hierarchical levels |
| **Session management** | JWT tokens with 8-hour expiry; automatic session invalidation |
| **Audit trail integrity** | Append-only log with SHA-256 hash chaining; tamper-evident by design |
| **Data minimization** | `toSafeJSON()` strips password hashes and sensitive fields from all API responses |
| **Input validation** | Server-side validation on all endpoints; parameterized queries to prevent SQL injection |
| **Content Security Policy** | HTTP security headers enforced (CSP, X-Frame-Options, HSTS) |
| **Offline security** | Encrypted local storage for PWA offline data; secure sync protocols |

### 11.2 Organizational Measures

| Measure | Description |
|---------|-------------|
| **Access governance** | Principle of least privilege; access reviews conducted quarterly |
| **Personnel training** | Data protection awareness training for all personnel with system access |
| **Confidentiality agreements** | All personnel and contractors bound by confidentiality obligations |
| **Incident response plan** | Documented procedure for security incident detection, containment, and notification |
| **Vendor management** | Third-party processors assessed for security posture and contractual compliance |
| **Change management** | Security review required for all platform changes affecting personal data |
| **Penetration testing** | Periodic security assessments of the Platform |
| **Business continuity** | Backup and disaster recovery procedures to ensure data availability |

### 11.3 Security Limitations

While we implement industry-standard security measures, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security of your data. If you become aware of any security vulnerability or breach, please immediately contact us at the addresses provided in Section 17.

---

## 12. Cookies and Tracking Technologies

### 12.1 What Are Cookies

Cookies are small text files stored on your device when you access a web application. The EFVM360 Platform uses cookies and similar technologies as described below.

### 12.2 Types of Cookies We Use

| Cookie Type | Purpose | Duration | Legal Basis |
|------------|---------|----------|-------------|
| **Strictly Necessary** | Authentication tokens, session management, CSRF protection, language preferences | Session / up to 8 hours | Legitimate interest (essential for Platform operation) |
| **Functional** | User interface preferences, dashboard layout, theme selection | Persistent (up to 1 year) | Legitimate interest |
| **Performance/Analytics** | Page load metrics, API response times, error tracking (via Azure Application Insights) | Session / up to 30 days | Consent (where required) or legitimate interest |

### 12.3 Cookies We Do NOT Use

The Platform does **not** use:

- Third-party advertising or marketing cookies
- Social media tracking pixels
- Cross-site tracking technologies
- Fingerprinting techniques for user identification beyond authentication

### 12.4 Local Storage (PWA)

The EFVM360 Progressive Web Application (PWA) and Capacitor-based mobile application may use:

- **IndexedDB / Local Storage:** To cache operational data for offline functionality. This data is encrypted and synchronized with the server when connectivity is restored
- **Service Worker Cache:** To enable offline access to the application shell and static assets

### 12.5 Managing Cookies

You can manage cookies through your browser settings:

- **Chrome:** Settings > Privacy and Security > Cookies
- **Firefox:** Settings > Privacy & Security > Cookies and Site Data
- **Safari:** Preferences > Privacy > Cookies and Website Data
- **Edge:** Settings > Cookies and Site Permissions

**Note:** Disabling strictly necessary cookies will prevent the Platform from functioning correctly. Authentication and session management require these cookies.

### 12.6 Do Not Track

The Platform does not currently respond to "Do Not Track" (DNT) browser signals, as there is no industry-standard interpretation of DNT for enterprise applications. However, the Platform's tracking is limited to the categories described above and does not involve third-party behavioral tracking.

---

## 13. Children's Privacy

The EFVM360 Platform is an enterprise operational system designed exclusively for use by authorized employees and contractors in railway operations. The Platform is not intended for use by children under the age of 18 (or the age of majority in the applicable jurisdiction).

We do not knowingly collect personal data from children. If we become aware that personal data has been inadvertently collected from a child, we will take immediate steps to delete such data.

If you believe that we have collected personal data from a child, please contact us immediately using the information provided in Section 17.

---

## 14. Data Protection Officer (DPO)

In accordance with LGPD Art. 41 and GDPR Art. 37, a Data Protection Officer has been appointed to oversee compliance with data protection obligations:

### 14.1 DPO Contact Information

| Field | Details |
|-------|---------|
| **Title** | Data Protection Officer (Encarregado de Dados Pessoais) |
| **Email** | dpo@vale.com |
| **Privacy Portal** | https://vale.com/privacidade |
| **Postal Address** | Data Protection Officer, Vale S.A., Praia de Botafogo, 186, Rio de Janeiro — RJ, Brazil, CEP 22250-145 |

### 14.2 DPO Responsibilities

The DPO is responsible for:

- Accepting complaints and communications from data subjects and the ANPD, and taking appropriate measures (LGPD Art. 41, paragraph 2, I)
- Providing guidance to employees and contractors on data protection practices (LGPD Art. 41, paragraph 2, II)
- Carrying out other duties determined by the controller or established by supplementary regulation (LGPD Art. 41, paragraph 2, III)
- Monitoring compliance with the GDPR and applicable data protection laws (GDPR Art. 39(1)(b))
- Advising on Data Protection Impact Assessments (DPIAs) where required (GDPR Art. 39(1)(c))
- Cooperating with and acting as a point of contact for supervisory authorities (GDPR Art. 39(1)(d)-(e))

### 14.3 EFVM360 Platform Technical Contact

For technical inquiries specific to the EFVM360 Platform (as distinct from general data protection matters):

| Field | Details |
|-------|---------|
| **Team** | EFVM360 Development Team |
| **Escalation** | Technical data protection inquiries are escalated to the DPO when they involve personal data rights or compliance matters |

---

## 15. Data Breach Notification

### 15.1 Definition

A personal data breach is a breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, personal data transmitted, stored, or otherwise processed.

### 15.2 Incident Response Timeline

| Phase | Timeframe | Action |
|-------|-----------|--------|
| **Detection** | Immediate | Automated alerts via Azure Application Insights trigger security team notification |
| **Containment** | < 1 hour | Isolate compromised access, revoke affected tokens, block suspicious IPs |
| **Assessment** | < 4 hours | Determine scope, categories of data affected, number of data subjects impacted, and likely consequences |
| **ANPD Notification** | Within 2 business days | Notify ANPD if the breach involves personal data likely to result in risk or damage to data subjects (LGPD Art. 48) |
| **GDPR Supervisory Authority** | Within 72 hours | Notify the competent supervisory authority unless the breach is unlikely to result in risk to rights and freedoms (GDPR Art. 33) |
| **Data Subject Notification** | Within 3 business days (LGPD) / without undue delay (GDPR) | Notify affected data subjects when the breach is likely to result in high risk to their rights and freedoms (LGPD Art. 48; GDPR Art. 34) |
| **Remediation** | Within 5 business days | Implement corrective measures, conduct root cause analysis, produce post-mortem report |

### 15.3 ANPD Notification Content (LGPD Art. 48, paragraph 1)

Notifications to the ANPD shall include:

- Description of the nature of the affected personal data
- Information about the data subjects involved
- Technical and security measures used for data protection
- Risks related to the incident
- Reasons for any delay in notification (if applicable)
- Measures taken or to be taken to reverse or mitigate the effects of the breach

### 15.4 GDPR Notification Content (Art. 33(3))

Notifications to the supervisory authority shall include:

- Nature of the breach, including categories and approximate number of data subjects and data records
- Name and contact details of the DPO
- Likely consequences of the breach
- Measures taken or proposed to address the breach and mitigate its effects

### 15.5 Record Keeping

All data breaches, whether or not they require notification, are documented in an internal breach register including:

- Facts relating to the breach
- Effects of the breach
- Remedial actions taken

This register is maintained in compliance with GDPR Art. 33(5) and is available for inspection by supervisory authorities.

---

## 16. Changes to This Policy

### 16.1 Notification of Changes

We reserve the right to update this Privacy Policy from time to time to reflect changes in our data practices, legal requirements, or operational needs.

When we make changes:

- **Material changes:** You will be notified through the Platform (in-app notification) at least 30 days before the changes take effect. Material changes include new categories of data collection, new processing purposes, changes to data sharing practices, or changes that affect your rights
- **Non-material changes:** Minor updates (e.g., formatting, clarifications that do not alter meaning) may be made without prior notification

### 16.2 Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | March 5, 2026 | Initial comprehensive Privacy Policy (LGPD + GDPR) |

### 16.3 Continued Use

Your continued use of the Platform after the effective date of an updated Privacy Policy constitutes your acknowledgment of the changes. If you disagree with a material change, you should contact the DPO to discuss your concerns and, if applicable, exercise your rights as described in Sections 9 and 10.

### 16.4 Availability

The current version of this Privacy Policy is always available:

- Within the Platform: **Settings > Privacy > Privacy Policy**
- Via API: `GET /api/v1/lgpd/politica`
- On the corporate privacy portal: https://vale.com/privacidade

---

## 17. Contact Information

For any questions, concerns, or requests regarding this Privacy Policy or the processing of your personal data, you may contact us through the following channels:

### General Data Protection Inquiries

| Channel | Details |
|---------|---------|
| **Data Protection Officer** | dpo@vale.com |
| **Privacy Portal** | https://vale.com/privacidade |
| **Postal Mail** | Data Protection Officer, Vale S.A., Praia de Botafogo, 186, Rio de Janeiro — RJ, Brazil, CEP 22250-145 |

### EFVM360 Platform-Specific Inquiries

| Channel | Details |
|---------|---------|
| **In-Platform** | Settings > Privacy menu |
| **LGPD Rights API** | Authenticated endpoints at `/api/v1/lgpd/*` |

### Regulatory Authorities

| Authority | Jurisdiction | Contact |
|-----------|-------------|---------|
| **ANPD** (Autoridade Nacional de Protecao de Dados) | Brazil | https://www.gov.br/anpd |
| **EU Supervisory Authorities** | European Economic Area | Contact your local data protection authority — list available at https://edpb.europa.eu/about-edpb/about-edpb/members_en |
| **ICO** (Information Commissioner's Office) | United Kingdom | https://ico.org.uk |

### EU/EEA Representative

| Field | Details |
|-------|---------|
| **Representative** | Vale International S.A. |
| **Address** | Route de Pallatex 29, 1162 St-Prex, Switzerland |

---

## Legal Notice

This Privacy Policy is provided in English for the convenience of all users. In case of any discrepancy between translated versions, the Portuguese-language version filed with the ANPD shall prevail for LGPD matters, and the English-language version shall prevail for GDPR matters.

This Privacy Policy does not create any contractual or other legal rights on behalf of any party. It is a statement of our data protection practices and your rights under applicable law.

---

**EFVM360 — Enterprise Railway Operations Management Platform**
**Privacy Policy v1.0 — Effective March 5, 2026**
**Copyright Vale S.A. All rights reserved.**
