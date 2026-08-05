# Hidrataí

App de hidratação em React Native + Expo. Retrato, muito animado, offline-first,
sem login e sem PII — tudo mora no aparelho. Mascote: a **Gotinha**, que também é
o ícone do app.

O diretório ainda se chama `beba-agua` e a chave do AsyncStorage é `beba-agua/v1`:
**a chave não muda nunca**, senão todo mundo perde o histórico.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Ambiente

- **Node 24 é obrigatório** (Expo SDK 57 exige ≥ 22.13). Há um `.nvmrc`: use `nvm use`.
  O shell padrão da máquina está em Node 20 e o bundler falha nele.
- SDK 57 · React Native 0.86 · React 19.2 · Reanimated 4.5 · NativeWind 4.2.

## Documentos e quem ganha

Dois documentos mandam, em domínios diferentes:

- `.claude/skills/duolingo-health-app/` — **design e interação**: tokens, tipografia,
  elevação chunky, movimento, microcópia, mascote. Leia antes de mexer em UI.
- `docs/PLANO-BEBA-AGUA.md` — **produto**: escopo, fases, navegação, telas, modelo de
  domínio, regras de cálculo.

**A skill não ganha sempre.** Os `references/` da skill descrevem outro produto (app de
6 pilares de saúde intestinal), então a arquitetura de informação deles não vale aqui.
Classifique a divergência: é design → skill; é produto → plano. Ambíguo → pergunte.

Já decidido: navegação é as **4 abas do §5 do plano**, não a BottomNav de 5 zonas com
botão central que a skill descreve.

Pontos que mais se erra:

- **Nunca emojis.** Ícones só de `lucide-react-native` (família única).
- **Cor-líder é o azul-água `#1CB0F6`**; o verde `#22C55E` é exclusivo de "meta batida".
- **Lip 3D de 4px sem blur** em tudo que é pressável (`borderBottomWidth`), com
  `translateY` no press — veja `src/components/Button.tsx` como referência.
- **Uma decisão por tela**, alvos ≥ 64px, texto curto, sem parágrafo explicativo.
- Animar só `transform`/`opacity` e sempre checar `useReducedMotion()`.

## Convenções de código

- Tokens de cor vivem em `tailwind.config.js`; `src/design/tokens.ts` é o espelho
  em JS para onde `className` não chega (SVG e estilos do Reanimated).
- `className` só em componentes core do RN (View/Text/Pressable/ScrollView).
  Em `Animated.View`, use `style` com os tokens — NativeWind não os envolve.
- **A escala tipográfica é nossa**, definida em `fontSize` no `tailwind.config.js`
  com pares `[fontSize, lineHeight]` — um degrau acima da padrão do Tailwind, que é
  pensada para desktop. Ao acrescentar um degrau, passe a entrelinha junto: sem ela o
  NativeWind mantém a da escala antiga.
- **Fonte se importa por subpath, um peso por linha**, e `useFonts` vem de
  `expo-font`:
  ```js
  import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold';
  ```
  Nunca da raiz do pacote. O `index.js` da raiz é um barrel que faz `require()` de
  cada `.ttf`, e `require` de asset não é tree-shakeable no Metro — importar de lá
  levava 21 arquivos e 2,28 MB para o bundle em vez de 3 e 0,22 MB.
- **Peso de fonte vem pelo nome da família, nunca por `font-bold`/`fontWeight`.** Em
  RN cada arquivo é uma família própria (`font-display`, `font-displayBold`,
  `font-body`). `fontWeight` em cima disso gera negrito sintético no iOS, engordado
  por algoritmo sobre um arquivo que já tem peso desenhado.
- Cuidado com texto em coluna estreita: `WeekBars` e os rótulos do tabBar são os dois
  lugares que **não** acompanham a escala tipográfica, por falta física de largura.
  Ao mexer em um deles, meça no iPhone SE (375pt), não no simulador maior.
- **Valor que a pessoa ajusta tem de ser gravado na granularidade em que é mostrado.**
  A meta andava de 50 em 50 e é escrita em litros com uma decimal, ou seja de 100 em
  100: 2950, 3000 e 3050 escrevem todos `3,0 L`, então dois toques no ± mostravam o
  mesmo número e não havia como saber onde se parou. Deu bug em 05/08/2026 — meta em
  3050 achando-se 3000, garrafa em `3,0 de 3,0 L` e azul, porque 3000 < 3050. O passo
  agora é `GOAL_STEP_ML` e `clampGoal` encaixa nele. Ao mexer num passo, olhe o
  formatador no mesmo commit.
- **`formatPair` arredonda o bebido para baixo e a meta para cima**, e não é detalhe:
  é o que garante que **número igual na tela signifique meta batida**. Arredondando os
  dois lados, qualquer par dentro do mesmo décimo empata na tela com a garrafa azul.
- Estado em Zustand com `persist` + AsyncStorage (`src/store/useWater.ts`).
- Haptics é enhancement progressivo: sempre via `src/lib/haptics.ts`, que
  silencia falhas e não roda no web.
- **Notificação só via `syncReminders()`** em `src/lib/notifications.ts`. Nunca
  agendar de um componente: o app de referência seca justamente por isso. A função é
  idempotente (cancela tudo e reconstrói), e os gatilhos são quatro — foreground,
  cada registro, cada exclusão e mudança de configuração.
- `lib/notifications.ts` lê as stores, então **nenhuma store pode importá-lo**:
  chamar `syncReminders()` de dentro de `addEntry` fecharia um ciclo. Quem chama é a
  tela.
- **O XP de um dia é `xpOfDay(dia)`, função do dia — nunca uma soma de eventos.** Era
  `+10` por registro e `+50` na meta, com o mesmo de volta ao desfazer, só que o ganho
  passava pelo teto diário e a devolução não: desfazer um copo que ganhou 0 por teto
  devolvia 10, tirados do XP de dias anteriores. Registrar e desfazer agora são só a
  diferença entre antes e depois, e por isso `onEntryRemoved` recebe o dia nos dois
  estados. Ao criar ganho novo, coloque a regra dentro de `xpOfDay`.
- **Prêmio que vira moeda precisa de trava por dia, não de simetria.** Todo ganho de
  `onEntryAdded` que dependa de `metGoalNow` é pago outra vez se o usuário desfizer e
  registrar de novo, porque a condição volta a ser verdadeira. XP e ofensiva aguentam
  isso porque `onEntryRemoved` desfaz na mesma medida; a **gota do Cantinho não**, porque
  ela é gasta em elementos e não tem como voltar. Daí o `lastDropDate`: um dia paga uma
  gota e nunca mais. Ao criar prêmio novo, pergunte primeiro se ele é gastável.
- **"Apagar tudo" tem de zerar todo campo persistido**, inclusive os que não são
  histórico. Já escapou duas vezes: a gamificação inteira (ofensiva, XP, gotas) e a
  preferência de lembrete — esta última pior, porque `enabled: true` sobrevivendo faz o
  app notificar alguém que acabou de apagar os dados. Ao acrescentar campo em store
  persistida, olhe o reset em `ajustes.tsx` no mesmo commit.
- **Tela de hoje lê a meta por `useTodayGoalMl()`, nunca `useWater.goalMl` cru.** A meta
  congela no primeiro registro do dia (§4.1) e é a congelada que decide `metGoal` — logo
  a missão de bater a meta, a ofensiva, o bônus de XP e a gota do Cantinho. Lendo a
  corrente, a garrafa ficava verde num dia que o jogo contava como não batido, e ainda
  dava para baixar a meta depois de beber, ganhar o dia e subir de volta. `history.ts` e
  `notifications.ts` já faziam certo (`days[hoje]?.goalMl ?? goalMl`).
- **Nunca chame `dayKey()` dentro de um seletor do Zustand.** O seletor só roda de
  novo quando a store muda, então às 03:00 a tela congela no dia anterior — bug real,
  achado em 30/07/2026 com o app aberto de um dia para o outro. O dia corrente vem de
  `useLogicalDay`, que é reativo; `dayKey()` direto só em *actions* e no domínio, onde
  roda no momento da chamada.

## Comandos

```bash
nvm use                # Node 24 — obrigatório
npm start              # Metro (detecta o dev client automaticamente)
npm run ios            # expo run:ios — build nativo + instala no simulador
npm test               # Jest: domínio, migração do store, dia lógico
npx tsc --noEmit       # typecheck
npx expo export -p ios --output-dir /tmp/b   # valida o bundle
```

## Development build — não usamos Expo Go

O app roda em **dev build** próprio (`expo-dev-client`), igual ao earmix em
`~/development/mix`. Motivo: no Expo Go o app roda dentro do app deles, então
ícone, nome e notificações (F3) nunca aparecem, e o AsyncStorage fica isolado
por slug — renomear o slug "apaga" os dados.

```bash
npx expo prebuild -p ios --clean   # regerar o nativo após mudar plugins/config
npm run ios                        # build local (Xcode + CocoaPods)
eas build --profile development --platform ios   # ou na nuvem (precisa eas init)
```

`ios/` e `android/` são **gerados** e ficam fora do git: nunca editar à mão, sempre
via `app.json` e config plugins. Bundle id: `com.bernardo.hidratai`.

### Versão mínima do Xcode

**O SDK 57 exige Swift 6.2.1+ / Xcode 26.1+.** Não é recomendação: no Xcode 26.0.1 o
`expo-modules-jsi` não compila — `weak let` dá *"'weak' must be a mutable variable"* e o
`abs()` de `JavaScriptCodable+Date.swift` fica *"ambiguous without a type annotation"*.

Isso já foi contornado com `patch-package` nesta base e **os patches foram removidos** em
28/07/2026, quando a máquina passou para Xcode 26.6 / Swift 6.3.3. Se algum dia o build
falhar com esses erros, a causa é toolchain velha — atualize o Xcode em vez de patchear.

Se um patch voltar a ser necessário: apague antes `node_modules/expo-modules-jsi/apple/Products`,
`.generated/` e `.DerivedData/`, senão o patch captura binários do xcframework e um
`module.modulemap` com caminho absoluto da máquina — que quebra em qualquer outro
computador. E não copie o mapa do earmix (`~/development/mix/patches`, SDK 56): quais tipos
conformam `Sendable` mudou no 57, e `nonisolated(unsafe)` só entra onde há `Sendable` sem
`@unchecked`.

O dev build tem storage próprio (bundle id próprio), separado do que ficou no
Expo Go — começar com o app vazio ali é esperado, não é perda de dados.
