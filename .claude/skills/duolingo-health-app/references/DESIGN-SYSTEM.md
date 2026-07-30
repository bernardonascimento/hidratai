# DESIGN-SYSTEM — Sistema visual (Duolingo-like, tom de saúde)

> **Status: APLICADO (Fase A).** Sistema "Flora" no estilo Duolingo, casado com a proposta de saúde. Cor-líder verde vitalidade, cores de função do Duolingo, fontes Fredoka+Nunito, mascote broto. Tokens vivem em `src/index.css` (`@theme`). Direção confirmada pelo usuário a partir de referências do Duolingo.

## Princípios (inegociáveis)

1. **Saúde, não fezes.** Linguagem visual de bem-estar, leveza, cuidado. Representações de consistência/cor são **estilizadas e abstratas**, nunca realistas ou nojentas.
2. **Icon-first, pouca palavra.** A pessoa decide olhando figuras grandes, não lendo. Texto é apoio, não protagonista.
3. **Uma decisão por tela.** Fluxo "escolher → próximo". Botão "Próximo" grande e fixo. Nunca lotar a tela de opções.
4. **Botões e alvos grandes** (mín. ~64px de área de toque), espaçados, fáceis no polegar.
5. **Anti-AI-slop:** sem chuva de emoji, sem caixas de texto genéricas, sem parágrafos explicativos. Menos é mais.
6. **Movimento com propósito:** animação reforça a ação (feedback), não enfeita à toa. Respeitar `prefers-reduced-motion`.
7. **Retrato sempre.** Layout pensado para uma mão, container tipo celular.

## Vocabulário de marca (PT-BR — da pesquisa)

- **USAR:** "saúde do intestino/intestinal", "digestão", "microbiota", "eixo intestino-cérebro", "no ritmo", "leveza", "bem-estar", "disposição", "inchaço", "gases", "desconforto", "intestino preso".
- **EVITAR como eixo de marca:** "fezes", "cocô" explícito, "evacuação", "prisão de ventre", e o jargão clínico frio.
- Humor leve e cúmplice (rir COM o usuário), nunca escatológico. Frases curtas, zero parágrafos.

## Anti-AI-slop (regras concretas)

- **Banir emojis.** Uma única família de ícones (Lucide/Phosphor/Heroicons, line ou duotone).
- Um único acento de cor, **saturação < 80%**. Sem roxo-neon, sem gradientes, sem glows/sombras coloridas.
- **Não** usar Inter como única fonte; tipografia intencional (display arredondada + texto legível).
- Sem hero genérico, sem cards de feature idênticos, sem defaults crus de shadcn/glassmorphism.
- Pastéis suaves costumam falhar WCAG — **testar contraste**.
- Bristol estilizada (abstrata/duotone, tons neutros, nunca marrom realista), mas **validar que os 7 tipos seguem reconhecíveis**.

## Padrões de UI a especificar

- **IconePicker** — grade/carrossel de opções grandes; uma selecionada; CTA "Próximo".
- **Botão primário "chunky"** — estilo pressável (lip 3D) ao gosto Duolingo, mas em paleta de saúde.
- **BottomNav** — 4 zonas + botão central de registrar.
- **Card de celebração** — mascote + XP + ofensiva.
- **Mascote** — conjunto de estados/poses.
- **Escala de Bristol** — 7 ícones limpos e estilizados (consistência).
- **Escala de hidratação (urina)** — gradiente de cor em 7 níveis.

## Tokens aplicados (`src/index.css` `@theme`)

```
Cor-líder (face):    #22C55E  (verde vitalidade)
Lip 3D (mais escuro):#12A150
Tint claro:          #DCFCE7
Seleção/info:        #1CB0F6  (lip #1899D6, tint #DDF4FF)
Ofensiva (chama):    #FF9600
XP/recompensa:       #FFC800
Atenção:             #FF4B4B
Texto:               #4B4B4B (nunca preto) · secundário #777777 · disabled #AFAFAF
Linha/trilha/lip cinza: #E5E5E5 · sutil #F7F7F7
Superfície/canvas:   #FFFFFF  (fundo atrás da moldura: #E8EAED)
Tipografia:          display = Fredoka · corpo = Nunito (Google Fonts)
Raio:                botões/cards 16px (rounded-2xl) · pills 9999px
Elevação:            lip sólido 4px (sem blur) + borda 2px #E5E5E5
```

## Elevação "chunky" (a marca registrada)

- Botões/cards pressáveis: `box-shadow: 0 4px 0 <lip>` (sem blur). No press: `translateY(4px)` + sombra some.
- Lip = tom mais escuro da própria face (cinza `#E5E5E5` para faces brancas).
- Containers não-pressáveis: borda sólida 2px `#E5E5E5`, sem sombra.

## Mascote Flora

- Broto/folhinha geométrico em SVG (`src/components/Flora.tsx`), poucas formas redondas, silhueta primeiro.
- Estados (`mood`): `happy` (parado, idle bob), `cheer` (celebração, pop+confete), `sleepy` (ausência). Nunca triste/culpando.

## Componentes no sistema (já reskinados)

`Button` (chunky, maiúsculas) · `BottomNav` (chip de seleção na aba ativa) · `OptionCard` (answer card, seleção azul) · barra de progresso (pill) · `BristolShape` · toggles · cards de registro.

## Pendente de design (quando quiser refinar)

- Sons (sprite Howler) — estilo Duolingo, curtos e suaves (Bloco 2/6).
- Ícone/splash PWA reais (PNG/maskable) e logo (Bloco 6).
- Validar contraste WCAG dos tons (a11y).
