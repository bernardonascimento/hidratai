---
name: duolingo-health-app
description: Sistema visual e arquitetural "estilo Duolingo aplicado a saúde" — retrato, muito animado, offline-first, sem login. Use ao criar, alterar ou revisar qualquer tela, componente, animação, cor, tipografia, fluxo de registro, gamificação ou decisão de stack. Também para checar as regras anti-AI-slop, os tokens de cor/elevação "chunky", o mascote e as armadilhas de iOS. Neste repositório o alvo é o app Hidrataí em React Native + Expo — veja a tradução da stack abaixo.
---

# Design System "estilo Duolingo" para apps de saúde

App **retrato, muito animado, offline-first, sem login e sem PII**. Os documentos em
`references/` nasceram para um app web de saúde intestinal (Super Saudável / mascote Flora);
**neste repositório o alvo é o Hidrataí em React Native + Expo, com o mascote Gotinha.**

O **design** vale integralmente. A **stack** é traduzida (tabela no fim).

## Precedência: esta skill NÃO ganha sempre

Esta skill é fonte de verdade sobre **linguagem visual e interação** — tokens, tipografia,
elevação chunky, movimento, microcópia, anti-AI-slop, mascote. É nisso que ela manda.

Ela **não** é fonte de verdade sobre **produto**: escopo, navegação, telas, modelo de
domínio e regras de cálculo. Nesses temas manda `docs/PLANO-BEBA-AGUA.md`. Motivo: os
`references/` descrevem **outro produto** (um app de 6 pilares de saúde intestinal), então
a arquitetura de informação deles não descreve este app.

Caso concreto: `references/ARCHITECTURE.md` prescreve BottomNav com botão central
destacado. O plano havia optado por 4 abas planas e, em 28/07/2026, o usuário decidiu
pelo botão central vendo as telas prontas — **a skill voltou a valer aqui**.

Hoje são **5 abas: Histórico · Cantinho · [Hoje] · Conquistas · Ajustes**, com o Hoje
num círculo azul de 62px no centro. Duas notas de implementação que custaram iteração:

- O botão central **não tem lip**. Num círculo, a borda inferior grossa vira uma
  meia-lua que lê como um segundo elemento atrás. Lip é para pressável de ação;
  navegação usa chip.
- Ele alinha com o **bloco ícone+rótulo** das outras abas, não com o ícone: as vizinhas
  têm texto embaixo, então o centro visual do conjunto fica ~8pt mais baixo. Alinhar
  pelo ícone deixa o botão parecendo alto mesmo com a medição "correta".

Ao encontrar uma divergência, classifique antes de decidir: **é design → skill ganha; é
produto → plano ganha.** Se for genuinamente ambíguo, pergunte ao usuário.

## Exceções autorizadas pelo usuário

**Fundo animado (28/07/2026).** A regra "movimento com propósito: animação reforça a
ação, não enfeita à toa" **não vale para o fundo do app**. O `AppBackground` tem bolhas
subindo em loop lento — movimento puramente decorativo, pedido explicitamente depois de
eu apontar a contradição. Continua valendo: só `transform`/`opacity`, e nada é montado
sob movimento reduzido.

O que **não** mudou: segue proibido gradiente, glow e sombra colorida. As camadas do
fundo são faces sólidas em tons do mesmo azul (`aguaVeu`, `aguaVeuSuave`, `aguaTint`),
que são o azul-líder diluído — não acentos novos.

**Superfície em camadas.** A tela é `#F7F7F7` (`fundo`) e os cards são `#FFFFFF`
(`canvas`). O DESIGN-SYSTEM diz "superfície/canvas: #FFFFFF"; sem o degrau entre os dois
o app fica chapado, então o branco puro passou a ser dos cards, não do fundo.

## Como usar esta skill

1. **Antes de escrever UI** — leia `references/DESIGN-SYSTEM.md` (tokens, princípios, componentes, anti-AI-slop).
2. **Antes de decisões técnicas ou de estrutura** — leia `references/ARCHITECTURE.md` (princípios, navegação, armadilhas de iOS).
3. Trate os dois documentos como **fonte de verdade em design**. Se a implementação divergir, aponte a divergência ao usuário antes de escolher um lado.

## Regras inegociáveis (resumo — detalhes nas referências)

- **Nunca emojis.** Uma única família de ícones (aqui: `lucide-react-native`), line ou duotone.
- **Um único acento de cor.** Sem gradientes, glows ou sombras coloridas.
- **Icon-first, uma decisão por tela.** Nunca formulário cheio de campos.
- **Alvos de toque ≥ 64px** de área; feedback visual < 100ms.
- **Retrato sempre**: container central ~480px, emoldurado como celular em telas largas. Nunca esticar.
- **Elevação "chunky"**: lip sólido de 4px sem blur; no press a face desce 4px e o lip desaparece. Containers não-pressáveis: borda sólida 2px `#E5E5E5`.
- **Animar só `transform` / `opacity`**; respeitar redução de movimento.
- **Linguagem de bem-estar.** Frases curtas, humor leve, zero parágrafo explicativo. Escalas e figuras estilizadas, nunca realistas.
- **Tipografia intencional**: display = Fredoka, corpo = Nunito. Nunca Inter como fonte única.
- **Offline-first, sem PII**: tudo no aparelho; o app nunca depende de rede.

## Tokens de cor

| Uso | Face | Lip | Tint |
|---|---|---|---|
| Verde vitalidade | `#22C55E` | `#12A150` | `#DCFCE7` |
| Azul-água / seleção | `#1CB0F6` | `#1899D6` | `#DDF4FF` |
| Ofensiva (chama) | `#FF9600` | — | — |
| XP / recompensa | `#FFC800` | — | — |
| Atenção | `#FF4B4B` | — | — |

Texto `#4B4B4B` (nunca preto) · secundário `#777777` · disabled `#AFAFAF` · linha/trilha `#E5E5E5` · sutil `#F7F7F7` · canvas `#FFFFFF` · fundo da moldura `#E8EAED`. Raio: 16px em botões/cards, `9999px` em pills.

**Qual é a cor-líder depende do app.** No Super Saudável é o verde. **No Hidrataí a
cor-líder é o azul-água `#1CB0F6`** (hidratação) e o verde fica reservado para o estado
"meta batida" — mantendo a regra de um único acento por vez.

## Tradução da stack: web → React Native + Expo

| Papel | Documento (web) | Neste projeto |
|---|---|---|
| Runtime | Vite + React SPA / PWA | Expo SDK 57 + expo-router |
| Estilo | Tailwind CSS | NativeWind 4 (`tailwind.config.js` + `src/global.css`) |
| Animação | Framer Motion | Reanimated 4 (`useReducedMotion` no lugar de `prefers-reduced-motion`) |
| Estado | Zustand | Zustand (igual) |
| Persistência | Dexie / IndexedDB | AsyncStorage via `persist` |
| Haptics | Vibration API | `expo-haptics` (silencioso no web) |
| Som | Howler.js | `expo-audio` (ainda não usado) |
| Ícones | Lucide/Phosphor web | `lucide-react-native` |
| Orientação | `manifest.orientation` + overlay CSS | `app.json` `orientation: portrait` + overlay em paisagem apertada |
| Elevação chunky | `box-shadow: 0 4px 0 lip` | `borderBottomWidth: 4` + `translateY` no press |

**O que não se traduz e deve ser ignorado dos documentos:** PWA/manifest/service worker,
"Adicionar à Tela de Início", limpeza de storage do WebKit após 7 dias, destravar áudio no
primeiro toque, deploy em Netlify. Em app nativo esses problemas não existem — o storage é
persistente e a orientação é declarada no `app.json`.

## Referências

- `references/ARCHITECTURE.md` — princípios, navegação, armadilhas de iOS (ler com a tabela de tradução em mãos).
- `references/DESIGN-SYSTEM.md` — princípios visuais, vocabulário de marca, anti-AI-slop, tokens, mascote, componentes.
