# FIX: App quebrando em mobile — conteúdo saindo da tela

## PROBLEMA
O app está com overflow horizontal e elementos saindo da tela em dispositivos móveis. O conteúdo NÃO está respeitando os limites da viewport. Isso precisa ser corrigido em TODAS as páginas.

## PASSO 1: CORREÇÃO GLOBAL IMEDIATA

Adicione estas regras CSS globais no arquivo de estilos principal do app (index.css, App.css, ou global.css — encontre qual é usado):

```css
/* FORCE FIT EVERYTHING IN VIEWPORT */
html, body, #root {
  max-width: 100vw;
  overflow-x: hidden;
}

*, *::before, *::after {
  box-sizing: border-box;
}

img, video, canvas, svg {
  max-width: 100%;
  height: auto;
}

table {
  max-width: 100%;
  display: block;
  overflow-x: auto;
}

input, select, textarea, button {
  max-width: 100%;
  font-size: 16px; /* prevents iOS auto-zoom */
}
```

## PASSO 2: ENCONTRAR E CORRIGIR TODOS OS OVERFLOWS

Rode estes comandos para encontrar os problemas:

```bash
findstr /s /n "width:" src\*.tsx src\*.ts 2>nul | findstr /v "100%" | findstr /v "auto" | findstr "px"
findstr /s /n "minWidth" src\*.tsx src\*.ts 2>nul
findstr /s /n "gridTemplateColumns" src\*.tsx src\*.ts 2>nul
findstr /s /n "position: fixed\|position: absolute" src\*.tsx src\*.ts 2>nul
findstr /s /n "overflow" src\*.tsx src\*.ts 2>nul
```

Para CADA resultado encontrado, aplique esta lógica:

### Larguras fixas em px
- `width: 400px` → `width: 100%; max-width: 400px`
- `width: 600px` → `width: 100%; max-width: 600px`
- `minWidth: '300px'` → `minWidth: 'min(300px, 100%)'` ou remover

### Grids com colunas fixas
- `gridTemplateColumns: '1fr 1fr 1fr'` → `gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))'`
- `gridTemplateColumns: '200px 1fr'` → Adicionar media query: em telas < 768px mudar para `'1fr'`
- `gridTemplateColumns: '1fr 1fr'` → Em telas < 480px mudar para `'1fr'`

### Flex sem wrap
- `display: 'flex'` sem `flexWrap` → adicionar `flexWrap: 'wrap'` se os filhos podem empilhar
- `display: 'flex', gap: '24px'` → adicionar `gap: 'min(24px, 3vw)'` para espaçamento responsivo

### Padding/margin grandes
- `padding: '32px'` → `padding: 'clamp(12px, 3vw, 32px)'`
- `padding: '48px'` → `padding: 'clamp(16px, 4vw, 48px)'`
- `margin: '0 64px'` → `margin: '0 clamp(8px, 4vw, 64px)'`

### Posição fixed/absolute
- Verificar que nenhum elemento com `position: fixed` ou `absolute` tem `left`/`right` que empurra pra fora da tela
- Todo `position: fixed` deve ter `left: 0; right: 0` ou `width: 100%` no mobile

## PASSO 3: CORRIGIR CADA PÁGINA (em ordem de prioridade)

### 3.1 App.tsx / Layout principal
- Container principal: `max-width: 100vw; overflow-x: hidden`
- Sidebar/menu lateral: em telas < 768px deve ser escondido ou virar bottom navigation
- Conteúdo principal: `width: 100%; padding: clamp(8px, 2vw, 32px)`

### 3.2 Página de Login
- Container do form: `width: 100%; max-width: 400px; padding: 16px`
- Inputs: `width: 100%`
- Funcionar em portrait e landscape

### 3.3 Gestão de Troca de Turno (PRIORIDADE MÁXIMA)
- Container do formulário: `width: 100%; overflow-x: hidden`
- Todos os campos: `width: 100%` em mobile
- Grids de campos que estão lado a lado: empilhar em 1 coluna em telas < 768px
- Navegação entre seções (stepper/tabs): deve caber na tela sem scroll horizontal
- Botões de ação: `width: 100%` em mobile
- Tabelas de pátio (linhas): `overflow-x: auto` no container com `-webkit-overflow-scrolling: touch`

### 3.4 Dashboard / Página Inicial
- Cards de status: 1 coluna em < 480px, 2 em < 768px, 4 em desktop
- Textos grandes: usar `font-size: clamp(1rem, 3vw, 2rem)` para títulos
- Botões CTA: empilhar em mobile

### 3.5 DSS
- Checklist: `width: 100%`
- Cards de temas: 1 coluna em mobile
- Textarea: `width: 100%`

### 3.6 BI / Analytics
- Gráficos: `width: 100%` com `min-height: 200px`
- Filtros: empilhar em mobile
- KPIs: 2 colunas em mobile, 4 em desktop

### 3.7 Histórico
- Tabela/lista: cards empilhados em mobile OU scroll horizontal com indicador
- Filtros: collapsible (escondidos por padrão em mobile)
- Detalhes: tela cheia em mobile

### 3.8 Perfil / Configurações
- Form: 1 coluna em mobile
- Toggles: touch target mínimo 44px

### 3.9 Gestão (admin)
- Tabela de usuários: scroll horizontal OU cards em mobile
- Botões de ação: dropdown ou menu

### 3.10 Cadastro
- Form: `width: 100%; max-width: 500px; margin: 0 auto`
- Todos os inputs: `width: 100%`

## PASSO 4: BOTTOM NAVIGATION (se não existe, criar)

Se o app usa sidebar lateral que desaparece em mobile sem substituto, crie uma bottom navigation:

- Mostrar apenas em telas < 768px
- 4-5 itens máximo (Início, Passagem, DSS, BI, Mais)
- Ícones + labels (operadores precisam de texto)
- `position: fixed; bottom: 0; left: 0; right: 0`
- `height: 64px` com `padding-bottom: env(safe-area-inset-bottom)` para iPhone
- `z-index: 1000`
- Adicionar `padding-bottom: 80px` no conteúdo principal para não ficar atrás da nav

## PASSO 5: TEXTOS E FONTES

- Nenhum texto deve ser cortado ou sair da tela
- Textos longos: `word-wrap: break-word; overflow-wrap: break-word`
- Títulos: `font-size: clamp(1.1rem, 2.5vw, 1.75rem)`
- Corpo: mínimo `14px`, ideal `16px`
- Labels: `font-size: clamp(0.75rem, 1.5vw, 0.875rem)`

## PASSO 6: VERIFICAÇÃO

Após TODAS as correções:

1. `pnpm dev` — abrir no Chrome
2. F12 → Toggle Device Toolbar (Ctrl+Shift+M)
3. Testar CADA página nestas resoluções:
   - **iPhone SE** (375x667) — menor tela
   - **iPhone 14** (390x844) — padrão
   - **iPad Mini** (768x1024) — tablet
   - **Desktop** (1280x800)
4. Para cada página confirmar:
   - ❌ ZERO scroll horizontal
   - ❌ ZERO texto cortado
   - ❌ ZERO botões inacessíveis
   - ❌ ZERO elementos saindo da tela
5. `pnpm exec vite build` — build deve passar
6. Listar todas as mudanças feitas por arquivo

## REGRAS

- NÃO quebre funcionalidade existente
- NÃO mude lógica de negócio
- NÃO crie novos componentes desnecessários — corrija os existentes
- NÃO adicione bibliotecas CSS externas (Tailwind, Bootstrap, etc.)
- Use o sistema de temas/estilos que já existe no projeto
- Se o projeto usa inline styles: aplique correções inline mesmo (adicione media query via JS com window.innerWidth ou window.matchMedia se necessário)
- Windows commands only (no rm, no rm -rf)
- Priorize: Passagem > Login > Dashboard > BI > DSS > Histórico > Gestão > Perfil
