# 🚂 EFVM360 - Gestão de Troca de Turno

> **Sistema Digital de Gestão de Troca de Turno para Operação Ferroviária**  
> EFVM360 • Pátio do Fazendão • EFVM

[![Status](https://img.shields.io/badge/status-demonstration-orange)]()
[![React](https://img.shields.io/badge/React-18.x-blue?logo=react)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)]()
[![PWA](https://img.shields.io/badge/PWA-offline--first-green)]()
[![License](https://img.shields.io/badge/license-proprietary-red)]()

---

## ⚠️ Aviso de Demonstração

**Este sistema é uma demonstração técnica** desenvolvida para fins de validação e apresentação de conceito. Não representa a versão oficial ou em produção do sistema de gestão de troca de turno da Vale.

---

## 📋 Sobre o Projeto

O **EFVM360** é um sistema digital que moderniza o processo de troca de turno em operações ferroviárias, substituindo formulários físicos por uma solução digital completa.

### Principais Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| **📋 Gestão de Troca de Turno** | Formulário digital completo com 12 seções |
| **🛡️ DSS** | Diálogo Semanal de Segurança com temas contextuais |
| **📊 BI+** | Dashboard de Business Intelligence com KPIs |
| **🤖 AdamBoot** | Assistente IA para suporte operacional |
| **📴 Modo Offline** | Funcionamento completo sem conexão |

### Diferenciais

- ✅ **Offline-First**: Funciona em ambientes industriais com conectividade instável
- ✅ **Segurança**: Sistema de permissões por perfil de usuário
- ✅ **Auditoria**: Registro completo de todas as operações
- ✅ **Acessibilidade**: Conformidade WCAG AA
- ✅ **Internacionalização**: Suporte a múltiplos idiomas

---

## 🛠️ Stack Tecnológico

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 18.x | Framework UI |
| TypeScript | 5.x | Tipagem estática |
| Vite | 5.x | Build tool |
| PWA | - | Service Worker |
| Zod | - | Validação de schemas |

---

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/efvm360.git
cd efvm360

# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

### Acesso

Após iniciar, acesse `http://localhost:5173` e utilize as credenciais de demonstração:

| Matrícula | Senha | Perfil |
|-----------|-------|--------|
| 123456 | 123456 | Operador |
| admin | admin | Administrador |

---

## 📁 Estrutura do Projeto

```
efvm360/
├── public/                 # Assets públicos e PWA
│   ├── manifest.json      # Manifesto PWA
│   └── sw.js              # Service Worker
├── src/
│   ├── components/        # Componentes React
│   ├── hooks/             # Custom hooks
│   ├── i18n/              # Internacionalização
│   ├── pages/             # Páginas/telas
│   ├── services/          # Serviços e lógica
│   ├── types/             # Tipos TypeScript
│   └── utils/             # Utilitários
├── docs/                   # Documentação
│   ├── TECHNICAL.md       # Arquitetura técnica
│   └── DASHBOARD_SPEC.md  # Especificação do BI+
└── README.md
```

---

## 📱 Screenshots

### Dashboard Principal
Visão geral do sistema com indicadores de status das linhas e alertas críticos.

### Gestão de Troca de Turno
Formulário digital completo com validação em tempo real e assistência IA.

### DSS - Diálogo de Segurança
Interface para realização do diálogo semanal de segurança com temas contextuais.

---

## 🔒 Segurança

### Perfis de Usuário

| Perfil | Nível | Permissões |
|--------|-------|------------|
| Operador | 1 | Visualizar, Editar (troca de turno/DSS) |
| Oficial | 2 | + Exportar relatórios |
| Inspetor | 3 | + Auditoria |
| Gestor | 4 | + Configurações avançadas |
| Administrador | 5 | Acesso total |

### Controle de Sessão

- Timeout automático: **30 minutos** de inatividade
- Logout seguro com limpeza de estado
- Proteção contra retorno via navegador

---

## 🌐 Internacionalização

| Idioma | Código | Status |
|--------|--------|--------|
| 🇧🇷 Português | pt-BR | ✅ Completo |
| 🇺🇸 English | en-US | ✅ Completo |

---

## 📴 Modo Offline

O sistema funciona completamente offline, permitindo:

- ✅ Registro de trocas de turno
- ✅ Realização de DSS
- ✅ Consulta de histórico
- ✅ Sincronização automática ao reconectar

---

## 📖 Documentação

- [Documentação Técnica](./docs/TECHNICAL.md)
- [Especificação do Dashboard](./docs/DASHBOARD_SPEC.md)

---

## 🔮 Roadmap

- [ ] Integração com Microsoft Entra ID
- [ ] API Backend (PostgreSQL)
- [ ] Notificações push
- [ ] Dashboard em tempo real
- [ ] Aplicativo móvel nativo

---

## 👨‍💻 Desenvolvedor

**Gregory** - Engenheiro Desenvolvedor Sênior  
Especialista em UX/UI para sistemas críticos, IA assistiva e operações ferroviárias.

---

## 📄 Licença

**Proprietário** - Sistema desenvolvido para demonstração técnica.  
Todos os direitos reservados.

---

## ⚠️ Disclaimer

Este projeto é uma **demonstração técnica** e não deve ser utilizado em ambiente de produção sem as devidas validações, integrações e aprovações corporativas.

Os dados apresentados são fictícios e não representam operações reais.

---

<div align="center">

**EFVM360 - Gestão de Troca de Turno**
*Sistema Digital para Operação Ferroviária Segura*

🚂 EFVM • Vale S.A. • Pátio do Fazendão 🚂

</div>
