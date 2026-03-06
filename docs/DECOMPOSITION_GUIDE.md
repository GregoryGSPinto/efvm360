# EFVM360 — Guia de Decomposição do App.tsx

## Contexto
O App.tsx original tem 6.662 linhas — um componente monolítico que concentra toda a lógica de renderização. Este documento descreve a estratégia de decomposição progressiva para tornar o código auditável e testável.

## Arquitetura Alvo

```
App.tsx (~1.200 linhas)          ← Orquestrador: hooks, state, routing
├── contexts/VFZContext.tsx       ← Context com todo o estado compartilhado
├── pages/Inicial/index.tsx       ← Dashboard resumo (ex-renderInicial)
├── pages/Historico/index.tsx     ← Histórico de turnos (ex-renderHistorico)
├── pages/Configuracoes/index.tsx ← Settings (ex-renderConfiguracoes)
├── pages/PassagemServico/
│   ├── index.tsx                 ← Wrapper da passagem (ex-renderPaginaPassagem)
│   ├── SecaoFormulario.tsx       ← 9 seções do formulário
│   ├── SecaoPostos.tsx           ← Postos de manobra
│   ├── SecaoTurnoAnterior.tsx    ← Turno anterior readonly
│   ├── SecaoSeguranca.tsx        ← Checklist de segurança
│   ├── SecaoVisualizacao.tsx     ← Resumo visual
│   └── SecaoAssinaturas.tsx      ← Modal de assinaturas
├── pages/Termos/TermosModal.tsx  ← Modal de aceite
└── pages/LayoutPatio/index.tsx   ← Layout visual do pátio
```

## Estado Atual (v3.2)

### Arquivos Criados
| Arquivo | Linhas | Status |
|---|---|---|
| VFZContext.tsx | 230 | ✅ Tipo + hook useVFZ() |
| pages/Inicial/index.tsx | 112 | ✅ Funcional |
| pages/Historico/index.tsx | 146 | ✅ Funcional |
| pages/Configuracoes/index.tsx | 1.381 | ✅ Estrutura + menu |

### Ainda no App.tsx
| Seção | Linhas | Prioridade |
|---|---|---|
| renderSecaoAssinaturas | ~750 | Alta (modal complexo) |
| renderSecaoFormulario | ~850 | Alta (core business) |
| renderSecaoSeguranca | ~320 | Média |
| renderSecaoPostos | ~230 | Média |
| renderSecaoVisualizacao | ~270 | Média |
| renderLayoutPatio | ~90 | Baixa |

## Estratégia de Migração

### Fase 1: Context Provider (FEITO)
- [x] Definir VFZContextType com todas as props
- [x] Criar useVFZ() hook
- [x] Mapear todas as dependências de estado por seção

### Fase 2: Extrair Páginas Top-Level (PARCIAL)
- [x] PaginaInicial
- [x] PaginaHistorico
- [x] PaginaConfiguracoes (estrutura)
- [ ] PaginaPassagem (wrapper)

### Fase 3: Extrair Seções da Passagem
- [ ] SecaoFormulario (9 seções de switch/case)
- [ ] SecaoAssinaturas (modais de senha)
- [ ] SecaoSeguranca (checklist)
- [ ] SecaoPostos
- [ ] SecaoVisualizacao
- [ ] SecaoTurnoAnterior

### Fase 4: Conectar ao Router
- [ ] Envolver App com VFZContext.Provider
- [ ] Substituir renderX() por <PaginaX />
- [ ] Validar que tudo funciona
- [ ] Remover funções inline mortas

## Como Migrar uma Seção

```tsx
// 1. Criar o arquivo da página
// pages/MinhaSecao/index.tsx
import { useVFZ } from '../../contexts/VFZContext';

export default function MinhaSecao() {
  const { tema, styles, dadosFormulario, ... } = useVFZ();

  // Cole aqui o corpo da renderSecaoX() do App.tsx
  return ( ... );
}

// 2. Em App.tsx, substituir:
// ANTES:
{paginaAtiva === 'secao' && renderMinhaSecao()}
// DEPOIS:
{paginaAtiva === 'secao' && <MinhaSecao />}
```

## Regras de Migração
1. **Nunca migrar mais de uma seção por PR** — facilita code review
2. **Testes visuais** — screenshot antes e depois de cada migração
3. **Manter App.tsx compilando** — nunca ter ambos (inline + componente) para a mesma seção
4. **O Context é read-only** — páginas consomem, só App.tsx fornece
