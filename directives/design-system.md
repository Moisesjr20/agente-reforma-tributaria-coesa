---
name: design-system
description: "Diretivas de design para a Plataforma de IA da COESA Contabilidade. Use este documento como fonte única da verdade para decisões visuais, componentes, tipografia, cores e UX. Toda implementação de UI deve consultar e seguir este SOP."
version: 1.0.0
category: design
updated: 2026-05-19
---

# Design System — Plataforma de IA COESA Contabilidade

## Contexto

Plataforma web de inteligência artificial para o escritório de contabilidade **COESA Contabilidade**. O produto atende contadores, gestores e clientes que precisam de análise financeira, automação contábil e assistência via IA.

**Stack:** Vite + React + Supabase  
**Estética:** Luxury Minimal — sofisticada, confiável, precisa. O dourado da identidade COESA ancora um visual premium sem ser excessivo.

---

## 1. Paleta de Cores

Toda cor deve ser definida como variável CSS. Nunca usar valores hardcoded.

### 1.1 Cores de Marca (extraídas da logo COESA)

| Token | Hex | Uso |
|---|---|---|
| `--color-brand-gold` | `#C9A227` | Cor primária de marca. CTAs, destaques, ícones ativos |
| `--color-brand-gold-light` | `#E8C547` | Hover states, badges, gradientes leves |
| `--color-brand-gold-dark` | `#9B7A1A` | Pressed states, textos sobre fundo claro |
| `--color-brand-gold-muted` | `#C9A2271A` | Backgrounds sutis, chips, highlights de texto |
| `--color-brand-charcoal` | `#2D2D2D` | Cor secundária. Textos principais, logo em modo claro |

### 1.2 Neutros

| Token | Hex | Uso |
|---|---|---|
| `--color-neutral-950` | `#0F0F0F` | Background dark mode profundo |
| `--color-neutral-900` | `#1A1A1A` | Background dark mode base |
| `--color-neutral-800` | `#2D2D2D` | Sidebar dark, cards escuros |
| `--color-neutral-700` | `#404040` | Borders dark, divisores |
| `--color-neutral-600` | `#666666` | Texto secundário, placeholders |
| `--color-neutral-400` | `#999999` | Labels desativados |
| `--color-neutral-200` | `#E5E5E5` | Borders light, divisores |
| `--color-neutral-100` | `#F5F5F5` | Backgrounds leves, table rows alternadas |
| `--color-neutral-50` | `#FAFAFA` | Background light mode base |
| `--color-white` | `#FFFFFF` | Superfície principal light mode |

### 1.3 Semânticas

| Token | Hex | Uso |
|---|---|---|
| `--color-success` | `#22C55E` | Confirmações, status positivo |
| `--color-success-bg` | `#F0FDF4` | Background de alertas de sucesso |
| `--color-warning` | `#F59E0B` | Avisos, pendências |
| `--color-warning-bg` | `#FFFBEB` | Background de alertas de aviso |
| `--color-error` | `#EF4444` | Erros, validações, exclusões |
| `--color-error-bg` | `#FEF2F2` | Background de alertas de erro |
| `--color-info` | `#3B82F6` | Informações, tooltips |
| `--color-info-bg` | `#EFF6FF` | Background de alertas informativos |

### 1.4 IA (exclusivo para elementos de Inteligência Artificial)

| Token | Hex | Uso |
|---|---|---|
| `--color-ai-gradient-start` | `#C9A227` | Início do gradiente de typing indicator, badges IA |
| `--color-ai-gradient-end` | `#E8C547` | Fim do gradiente |
| `--color-ai-surface` | `#FEFCE8` | Background de mensagens da IA (light) |
| `--color-ai-surface-dark` | `#2D2A1A` | Background de mensagens da IA (dark) |

---

## 2. Tipografia

### 2.1 Famílias

| Papel | Família | Fonte de import | Uso |
|---|---|---|---|
| Display | `"Playfair Display"` | Google Fonts | Títulos H1, headings de seção, nome da plataforma |
| UI | `"DM Sans"` | Google Fonts | Corpo de texto, labels, navegação, botões |
| Mono | `"JetBrains Mono"` | Google Fonts | Código, valores numéricos, CNPJ, datas |

**Racional:** Playfair Display entrega o caráter premium do dourado COESA. DM Sans é funcional e legível em dashboards. JetBrains Mono garante precisão em dados contábeis.

### 2.2 Escala Tipográfica

```css
--font-size-xs:   0.75rem;   /* 12px — labels, captions */
--font-size-sm:   0.875rem;  /* 14px — body small, table cells */
--font-size-base: 1rem;      /* 16px — body padrão */
--font-size-lg:   1.125rem;  /* 18px — body large, subtítulos */
--font-size-xl:   1.25rem;   /* 20px — card titles */
--font-size-2xl:  1.5rem;    /* 24px — section headings */
--font-size-3xl:  1.875rem;  /* 30px — page titles */
--font-size-4xl:  2.25rem;   /* 36px — hero titles */
--font-size-5xl:  3rem;      /* 48px — display headlines */
```

### 2.3 Pesos

```css
--font-weight-regular:   400;
--font-weight-medium:    500;
--font-weight-semibold:  600;
--font-weight-bold:      700;
--font-weight-extrabold: 800;
```

### 2.4 Line Heights

```css
--leading-tight:  1.25;   /* headings display */
--leading-snug:   1.375;  /* headings UI */
--leading-normal: 1.5;    /* body text */
--leading-relaxed: 1.625; /* texto longo, chat */
```

---

## 3. Espaçamento e Grid

### 3.1 Escala de Espaçamento (base 4px)

```css
--space-1:  0.25rem;   /* 4px */
--space-2:  0.5rem;    /* 8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-5:  1.25rem;   /* 20px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
--space-24: 6rem;      /* 96px */
```

### 3.2 Layout

- **Max-width container:** `1280px`
- **Sidebar fixa:** `240px` (colapsada: `64px`)
- **Grid de conteúdo:** 12 colunas
- **Gap padrão:** `--space-6` (24px)
- **Padding de página:** `--space-8` (32px)

---

## 4. Sombras e Elevação

```css
--shadow-xs:  0 1px 2px 0 rgba(0,0,0,0.05);
--shadow-sm:  0 1px 3px 0 rgba(0,0,0,0.10), 0 1px 2px -1px rgba(0,0,0,0.10);
--shadow-md:  0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.10);
--shadow-lg:  0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -4px rgba(0,0,0,0.10);
--shadow-xl:  0 20px 25px -5px rgba(0,0,0,0.10), 0 8px 10px -6px rgba(0,0,0,0.10);
--shadow-gold: 0 4px 24px -4px rgba(201,162,39,0.30);  /* sombra especial gold para CTAs */
```

---

## 5. Border Radius

```css
--radius-sm:   0.25rem;   /* 4px — inputs pequenos, badges */
--radius-md:   0.5rem;    /* 8px — botões, cards pequenos */
--radius-lg:   0.75rem;   /* 12px — cards principais */
--radius-xl:   1rem;      /* 16px — modais, painéis laterais */
--radius-2xl:  1.5rem;    /* 24px — hero sections, chat bubbles */
--radius-full: 9999px;    /* pills, avatares, loaders */
```

---

## 6. Componentes

### 6.1 Botões

**Variantes:**

| Variante | Background | Texto | Borda | Quando usar |
|---|---|---|---|---|
| `primary` | `--color-brand-gold` | `#1A1A1A` | none | Ação principal da página |
| `secondary` | `transparent` | `--color-brand-gold` | `1px solid --color-brand-gold` | Ação secundária |
| `ghost` | `transparent` | `--color-neutral-600` | none | Ações terciárias, navegação |
| `danger` | `--color-error` | `white` | none | Exclusão, ações destrutivas |
| `ai` | `linear-gradient(135deg, #C9A227, #E8C547)` | `#1A1A1A` | none | Disparar ações de IA |

**Tamanhos:**

```
sm:  h-8  px-3  text-sm   rounded-md
md:  h-10 px-4  text-base rounded-md   (padrão)
lg:  h-12 px-6  text-lg   rounded-lg
```

**Estados:**
- `hover`: brightness 110%, `box-shadow: --shadow-gold` para `primary` e `ai`
- `active`: scale(0.98)
- `disabled`: opacity 40%, cursor not-allowed
- `loading`: spinner animado substituindo label, não desabilitar o botão visualmente

### 6.2 Inputs e Formulários

```
height: 40px (md) / 36px (sm) / 48px (lg)
border: 1px solid --color-neutral-200
border-radius: --radius-md
focus: border-color --color-brand-gold + ring 2px rgba(201,162,39,0.20)
error: border-color --color-error
padding: 0 --space-4
```

- Label sempre acima do input, nunca placeholder como label
- Mensagens de erro abaixo do input, em `--color-error`, `text-sm`
- Campos obrigatórios marcados com `*` em `--color-brand-gold`

### 6.3 Cards

```css
background: var(--color-white);        /* light */
background: var(--color-neutral-800);  /* dark */
border: 1px solid var(--color-neutral-200);
border-radius: var(--radius-lg);
padding: var(--space-6);
box-shadow: var(--shadow-sm);
```

**Card de Métrica (KPI):**
- Valor principal: `font-size-3xl`, `font-weight-bold`, `font-family: "JetBrains Mono"`
- Label: `font-size-sm`, `--color-neutral-600`
- Variação: badge colorido (success/error/warning) com ícone de seta
- Borda superior opcional em `--color-brand-gold` para destaque

### 6.4 Chat / Interface de IA

**Mensagem do usuário:**
```
background: --color-brand-gold
color: #1A1A1A
border-radius: --radius-2xl --radius-2xl 0 --radius-2xl
padding: --space-3 --space-4
max-width: 75%
align: flex-end
```

**Mensagem da IA:**
```
background: --color-ai-surface (light) / --color-ai-surface-dark (dark)
border: 1px solid --color-neutral-200
border-radius: 0 --radius-2xl --radius-2xl --radius-2xl
padding: --space-3 --space-4
max-width: 85%
align: flex-start
```

**Typing indicator:**
- 3 pontos animados com `animation-delay` escalonado (0ms, 150ms, 300ms)
- Cor: `--color-brand-gold`
- Duração: 1.2s loop

**Input de chat:**
```
min-height: 52px
max-height: 200px (auto-resize)
border-radius: --radius-xl
border: 1.5px solid --color-neutral-200
focus: border --color-brand-gold
botão enviar: --color-brand-gold, --radius-lg
```

### 6.5 Sidebar / Navegação

```
width: 240px (expandida) / 64px (colapsada)
background: --color-white (light) / --color-neutral-900 (dark)
border-right: 1px solid --color-neutral-200
```

**Item ativo:**
```
background: --color-brand-gold-muted
color: --color-brand-gold-dark
border-left: 3px solid --color-brand-gold
font-weight: --font-weight-semibold
```

**Logo na sidebar:**
- Usar `LOGOTIPO-COESA-08.png` em modo light
- Usar versão monocromática branca em modo dark (inverter CSS)
- Altura: 32px, manter proporção

### 6.6 Tabelas de Dados

```
header: background --color-neutral-50, font-weight semibold, text-sm uppercase tracking-wide
rows: altura 48px, border-bottom 1px --color-neutral-100
hover row: background --color-brand-gold-muted
striped: --color-neutral-50 em linhas pares
```

Valores monetários sempre em `"JetBrains Mono"`, alinhados à direita.

### 6.7 Badges / Status

| Status | Background | Texto | Uso |
|---|---|---|---|
| `active` | `#F0FDF4` | `#16A34A` | Clientes ativos, tarefas ok |
| `pending` | `#FFFBEB` | `#D97706` | Aguardando, em processamento |
| `error` | `#FEF2F2` | `#DC2626` | Erros, vencidos |
| `ai` | `#FEFCE8` | `#9B7A1A` | Gerado por IA, sugestão IA |
| `new` | `--color-brand-gold` | `#1A1A1A` | Novo, recente |

---

## 7. Modo Escuro (Dark Mode)

Implementar via `class="dark"` no `<html>` (não `prefers-color-scheme` automático — o usuário controla).

**Mapeamento light → dark:**

```css
[data-theme="dark"] {
  --color-surface:      var(--color-neutral-900);
  --color-surface-2:    var(--color-neutral-800);
  --color-border:       var(--color-neutral-700);
  --color-text-primary: var(--color-neutral-50);
  --color-text-secondary: var(--color-neutral-400);
  --shadow-sm: 0 1px 3px 0 rgba(0,0,0,0.40);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.40);
}
```

O dourado `--color-brand-gold` se mantém idêntico em ambos os modos.

---

## 8. Animações e Motion

**Princípio:** Movimentos funcionais, nunca decorativos. Toda animação deve ter propósito.

### 8.1 Durações

```css
--duration-instant:  100ms;   /* feedback imediato: click, toggle */
--duration-fast:     150ms;   /* micro-interações: hover, focus */
--duration-normal:   250ms;   /* transições de componente */
--duration-slow:     400ms;   /* page transitions, modais */
--duration-slower:   600ms;   /* onboarding, loading states */
```

### 8.2 Easings

```css
--ease-default:    cubic-bezier(0.4, 0, 0.2, 1);  /* maioria das transições */
--ease-in:         cubic-bezier(0.4, 0, 1, 1);     /* elementos saindo */
--ease-out:        cubic-bezier(0, 0, 0.2, 1);     /* elementos entrando */
--ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1); /* botões, badges */
```

### 8.3 Padrões

- **Hover cards/botões:** `transform: translateY(-2px)`, `box-shadow` aumenta
- **Page load:** `opacity: 0 → 1` + `translateY(8px → 0)`, `duration-slow`, stagger de 50ms por elemento
- **Modal entrada:** `scale(0.95) → scale(1)` + `opacity`, `duration-normal`
- **Sidebar collapse:** `width` transition, `duration-normal`, `ease-default`
- **Skeleton loading:** gradiente animado `#E5E5E5 → #F5F5F5 → #E5E5E5`, loop 1.5s
- **Resposta IA stream:** texto aparece palavra por palavra, sem blink cursor — usar span com fade-in

---

## 9. Iconografia

- **Biblioteca:** `lucide-react` — icons consistentes com o estilo clean da plataforma
- **Tamanhos:** `16px` (inline), `20px` (botões, nav), `24px` (cards), `32px` (hero/empty states)
- **Cor:** herdar do elemento pai por padrão; nunca usar cor hardcoded em ícone
- **Ícone de IA:** `Sparkles` ou `Zap` do Lucide em `--color-brand-gold`

---

## 10. Ilustrações / Empty States

- **Tom:** Minimalista, linhas finas, sem personagens excessivamente cartunizados
- **Cores:** Usar apenas `--color-brand-gold`, `--color-neutral-200` e `--color-neutral-600`
- **Empty state de chat:** ícone `MessageSquare` + texto "Pergunte sobre seus dados contábeis"
- **Empty state de relatório:** ícone `BarChart2` + CTA para gerar relatório
- **Error state:** ícone `AlertTriangle` em `--color-error` + mensagem clara + botão de retry

---

## 11. Acessibilidade

- **Contraste mínimo:** 4.5:1 para texto normal, 3:1 para texto grande (WCAG AA)
  - `--color-brand-gold` sobre `#1A1A1A`: ratio ~8.5:1 ✅
  - `--color-brand-gold` sobre `#FFFFFF`: ratio ~3.2:1 (usar apenas para texto 18px+)
- **Focus visible:** ring de 2px em `--color-brand-gold` em todos os elementos interativos
- **ARIA:** todo componente custom deve ter `role`, `aria-label` e `aria-expanded` onde aplicável
- **Redução de movimento:** respeitar `prefers-reduced-motion` — remover animações decorativas

---

## 12. Nomenclatura de Arquivos

Seguindo as **Non-Negotiables do DOE:**

```
components/
  ui/
    button.tsx
    input.tsx
    card.tsx
    chat-message.tsx
    metric-card.tsx
    sidebar-nav.tsx
    data-table.tsx
    badge.tsx
    typing-indicator.tsx

pages/
  dashboard.tsx
  chat-ia.tsx
  relatorios.tsx
  clientes.tsx
  configuracoes.tsx

styles/
  design-tokens.css    ← variáveis CSS centralizadas
  globals.css
```

---

## 13. Responsividade

| Breakpoint | Largura | Comportamento |
|---|---|---|
| `mobile` | < 640px | Sidebar vira drawer off-canvas; cards em coluna única |
| `tablet` | 640–1024px | Sidebar colapsada por padrão; grid 2 colunas |
| `desktop` | > 1024px | Sidebar expandida; grid completo |

---

## Edge Cases e Decisões

- **Logo em contexto dark:** inverter via `filter: brightness(0) invert(1)` na versão charcoal, ou usar a versão dourada diretamente
- **Valores negativos em contabilidade:** sempre em `--color-error`, prefixo `(` e `)` no padrão contábil
- **Texto longo em células de tabela:** truncar com ellipsis + tooltip ao hover
- **Respostas longas da IA:** exibir botão "Ver mais" após 400 caracteres
- **Sessão expirada:** modal não-bloqueante (toast bottom-right) com CTA para relogar
