# Hidrataí 💧

App React Native (Expo) para **beber água todo dia** — não um diário de líquidos, um
tracker de hábito. Offline-first, sem login, sem conta e sem nuvem: tudo mora no aparelho.

O mascote é a **Gotinha**, que reage ao seu dia, e a garrafa animada é a tela toda. Em
volta dela, uma camada de jogo com duas regras que não se negociam: **nunca recompensar
quem excede a meta** (hiponatremia é real) e **nunca culpar quem falhou** — o pior humor
da Gotinha é curiosidade, não tristeza.

## Arquitetura

Domínio puro separado da UI — nenhuma regra de negócio vive dentro de um componente, e é
por isso que os 180 testes rodam sem simulador.

```
src/
  domain/     water.ts        soma do dia e recálculo derivado (uma fonte só de verdade)
              goal.ts         meta por peso · rotina · clima, XP e níveis
              reminders.ts    janela e horários dos lembretes, 20 frases rotativas
              history.ts      semana/mês/ano de calendário e estatísticas
              mascot.ts       os 4 humores da Gotinha e a fala de cada um
              missions.ts     pool de 7 missões, sorteio determinístico por dia
              streak.ts       ofensiva com congelamento e dia livre
              achievements.ts 13 conquistas derivadas do histórico
              garden.ts       12 elementos do Cantinho e as posições na cena
  store/      useWater        registros por dia lógico, persistido + migração versionada
              useGamification XP (com teto diário), ofensiva, gotas, missões
              useProfile      peso, rotina, clima, preferência de lembrete
              useLogicalDay   o dia corrente de forma reativa (ver abaixo)
  lib/        date.ts         dia lógico às 03:00 — sempre hora local, nunca UTC
              notifications.ts  o único lugar do app que agenda notificação
  components/ ProgressBottle  a garrafa: nível, ondas, espuma e respiro em SVG animado
              Gotinha         o mascote, 4 poses no mesmo corpo
              Pressable3D     o lip 3D de 4px, base de tudo que é pressável
              …               29 componentes, nenhum com regra de negócio
  design/     tokens.ts       espelho em JS do tailwind.config.js
  app/        (onboarding)/   5 passos: peso, rotina, estilo, meta, lembretes
              (tabs)/         Histórico · Cantinho · Hoje · Conquistas · Ajustes
```

## Pré-requisitos

- **Node 24 é obrigatório** (o SDK 57 exige ≥ 22.13). Há um `.nvmrc`: `nvm use`. O shell
  padrão da máquina abre em Node 20 e o bundler falha lá.
- **Xcode 26.1+ / Swift 6.2.1+.** Em toolchain mais antiga o `expo-modules-jsi` não
  compila (`weak let` → *"'weak' must be a mutable variable"*). Isso já foi contornado com
  `patch-package` aqui e os patches **foram removidos**; se o erro voltar, a causa é o
  Xcode, não o código.
- SDK 57 · React Native 0.86 · React 19.2 · Reanimated 4.5 · react-native-svg 15.15 ·
  NativeWind 4.2 · Zustand 5 · TypeScript 6.0.

## Decisões que vale saber antes de mexer

Cada uma dessas custou um bug pelo menos uma vez. As demais estão nos comentários e no
`AGENTS.md`.

**O dia termina às 03:00, não à meia-noite.** Quem bebe água à 01:30 está fechando o dia
anterior. Toda conversão passa por `lib/date.ts`, em hora local.

**Nunca chame `dayKey()` dentro de um seletor do Zustand.** O seletor só reexecuta quando
a store muda, então às 03:00 a tela congela no dia anterior — bug real, com o app aberto de
um dia para o outro. O dia corrente vem de `useLogicalDay`; `dayKey()` direto só em
*actions* e no domínio, onde roda no momento da chamada.

**No SVG, `x`/`y` só animam onde são atributos de verdade.** `<rect>` e `<use>` têm; `<g>`
**não** — o react-native-svg converte em `transform` no render do JS, e a atualização
animada nunca chega ao nativo. A garrafa ficou congelada no nível da montagem por causa
disso. E movimento contínuo (ondas, bolhas, respiro) usa **um** `useFrameCallback` com fase
+ módulo, não `withRepeat`: aquele reinicia o ciclo do valor em cache e dá salto visível.

**Notificação só via `syncReminders()`.** O iOS guarda no máximo 64 notificações locais
pendentes e descarta o resto; se o reagendamento depende de abrir o app, o lembrete seca —
é exatamente assim que o app de referência morre. Daí as duas camadas: `DATE` preciso para
os próximos dias e `DAILY` perene que sobrevive a semanas fechado. As duas **dividem** os
horários entre si, senão disparariam juntas no mesmo minuto.

**"Apagar tudo" tem de zerar todo campo persistido.** Já escapou duas vezes: a gamificação
inteira e a preferência de lembrete — esta pior, porque `enabled: true` sobrevivendo faz o
app notificar alguém que acabou de apagar os dados. Ao acrescentar campo em store
persistida, olhe o reset em `ajustes.tsx` no mesmo commit.

**O verde é só "meta batida".** A cor-líder é o azul-água `#1CB0F6`; o verde `#22C55E` não
decora. Ícones só de `lucide-react-native`, nunca emoji.

## Rodando (dev build)

Notificação local exige código nativo, então **não roda no Expo Go**:

```bash
nvm use                            # Node 24, obrigatório
npm install

npx expo prebuild -p ios           # regerar o nativo após mudar plugins/config
npm run ios                        # build local (Xcode + CocoaPods)
npm start                          # Metro; detecta o dev client automaticamente
```

`ios/` e `android/` são **gerados** e ficam fora do git: nunca editar à mão, sempre via
`app.json` e config plugins. Bundle id `com.bernardo.hidratai`.

## Testes

```bash
npm test           # 180 testes em 14 suítes
npx tsc --noEmit   # typecheck
npm run lint       # expo lint
```

Cobre o domínio inteiro, as migrações da store, a virada do dia lógico e o agendamento de
notificação — este com mock do `expo-notifications`, verificando as invariantes que fazem o
lembrete não secar: nenhum horário com dois donos, total abaixo do limite do iOS e
cancelamento antes de reagendar.

## Uso

1. **Onboarding** em 5 passos: peso, rotina de sono, estilo de vida, a meta calculada e a
   permissão de notificação — pedida no fim, depois de mostrar quais horários você vai
   receber. Negar não trava nada.
2. **Hoje**: escolha 200 / 300 / 500 ml e toque no botão grande. A garrafa enche, a Gotinha
   comenta e um snackbar oferece desfazer por 3 s.
3. Ao **bater a meta** tudo vira verde — a única aparição do verde no app — com confete, XP
   e a ofensiva do dia.
4. **Histórico** mostra semana, mês e ano em calendário, e deixa apagar um registro ou
   preencher ontem (recalcula a ofensiva, mas **não** dá XP: pontuar o passado seria fácil
   demais).
5. **Cantinho**: cada dia com a meta batida rende uma gota, que compra elementos para o
   cenário da Gotinha.

## Notas / TODO

- **Catálogo de bebidas adiado** para depois do lançamento. Hoje só existe água, então
  `hydrationOf` devolve 1 para tudo e o argumento de "volume ≠ hidratação" (um café de
  80 ml conta 64) ainda não aparece no produto.
- **i18n adiada** — só pt-BR por ora, mercado só Brasil.
- **Não existe editar registro.** Dá para apagar e para desfazer, mas trocar 500 por 300 é
  apagar e registrar de novo; a rota `registro/[id]` do plano nunca foi criada.
- **O verde escapa da própria regra em dois lugares**: missão cumprida e item conquistado
  no Cantinho. Ou a regra vira "verde = qualquer coisa concluída", ou esses usos mudam de
  cor. Decisão em aberto.
- A **entrega** da notificação foi validada por simulação (`simctl push`) e pelas
  invariantes de agendamento, mas o ciclo completo de vários dias sem abrir o app ainda não
  foi observado em aparelho real.
