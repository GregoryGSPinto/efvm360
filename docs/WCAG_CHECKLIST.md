# EFVM360 v3.2 — WCAG 2.1 AA Compliance

## Resumo

O EFVM360 visa conformidade WCAG 2.1 nível AA para garantir acessibilidade em ambiente operacional ferroviário, onde legibilidade e clareza são requisitos de segurança.

## Princípio 1: Perceptível

### 1.1 Alternativas em Texto
| Critério | Status | Implementação |
|----------|--------|---------------|
| 1.1.1 Conteúdo não-textual | ✅ | `alt` em imagens, aria-label em ícones |

### 1.3 Adaptável
| Critério | Status | Implementação |
|----------|--------|---------------|
| 1.3.1 Info e relações | ✅ | Semantic HTML (section, nav, main, header) |
| 1.3.2 Sequência significativa | ✅ | DOM order = visual order |
| 1.3.3 Características sensoriais | ✅ | Status usa cor + ícone + texto |

### 1.4 Distinguível
| Critério | Status | Implementação |
|----------|--------|---------------|
| 1.4.1 Uso de cor | ✅ | Status: cor + ícone (🟢🟡🔴) + texto |
| 1.4.3 Contraste (AA) | ✅ | Tema escuro 11.5:1, claro 12.6:1 |
| 1.4.4 Redimensionar texto | ✅ | Font size configurável em Acessibilidade |
| 1.4.11 Contraste não-texto | ✅ | Bordas e ícones com ratio ≥ 3:1 |

## Princípio 2: Operável

### 2.1 Teclado
| Critério | Status | Implementação |
|----------|--------|---------------|
| 2.1.1 Teclado | ✅ | Tab navigation em todos os elementos |
| 2.1.2 Sem armadilha | ✅ | `useFocusTrap` com Escape para sair |

### 2.4 Navegável
| Critério | Status | Implementação |
|----------|--------|---------------|
| 2.4.1 Ignorar blocos | ✅ | `SkipToContent` component |
| 2.4.2 Página com título | ✅ | `document.title` dinâmico |
| 2.4.3 Ordem de foco | ✅ | Tab order segue layout visual |
| 2.4.7 Foco visível | ✅ | `outline` + `box-shadow` em focus |

## Princípio 3: Compreensível

### 3.1 Legível
| Critério | Status | Implementação |
|----------|--------|---------------|
| 3.1.1 Idioma da página | ✅ | `lang="pt-BR"` no HTML |

### 3.2 Previsível
| Critério | Status | Implementação |
|----------|--------|---------------|
| 3.2.1 Em foco | ✅ | Nenhuma mudança de contexto ao focar |
| 3.2.2 Em entrada | ✅ | Formulários não submetem ao digitar |

### 3.3 Assistência de Entrada
| Critério | Status | Implementação |
|----------|--------|---------------|
| 3.3.1 Identificação de erro | ✅ | `aria-invalid` + mensagem visível |
| 3.3.2 Rótulos/instruções | ✅ | Labels em todos os inputs |

## Princípio 4: Robusto

### 4.1 Compatível
| Critério | Status | Implementação |
|----------|--------|---------------|
| 4.1.2 Nome, função, valor | ✅ | aria-label, role, aria-expanded |
| 4.1.3 Mensagens de status | ✅ | `aria-live` regions (polite/assertive) |

## Utilitários de Acessibilidade

Arquivo: `src/utils/accessibility.tsx`

| Utilitário | Função |
|-----------|--------|
| `useFocusTrap(isActive)` | Prende foco dentro de modais |
| `useEscapeKey(callback, isActive)` | Fecha modais com Escape |
| `useAnnouncer()` | Anuncia mudanças para screen readers |
| `SkipToContent` | Link "pular para conteúdo" |
| `LiveRegions` | Regiões aria-live para anúncios |
| `ariaProps` | Helpers para expandable, required, invalid, modal |

## Contraste

| Combinação | Ratio | Status |
|-----------|-------|--------|
| Tema escuro: #E0E0E0 / #1A1A2E | 11.5:1 | ✅ AAA |
| Tema claro: #333333 / #FFFFFF | 12.6:1 | ✅ AAA |
| Vale green #00843D / #FFFFFF | 4.6:1 | ✅ AA (texto grande) |
| Alerta vermelho #DC3545 / #FFFFFF | 4.9:1 | ✅ AA |

## Testes Recomendados

1. **axe-core**: `npx @axe-core/cli http://localhost:5173`
2. **Lighthouse**: Chrome DevTools → Accessibility audit
3. **Screen reader**: Testar com NVDA (Windows) ou VoiceOver (macOS)
4. **Keyboard only**: Navegar todo o formulário usando apenas Tab/Enter/Escape
