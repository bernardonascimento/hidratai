# Plano de implementação — Hidrataí

App de hidratação em React Native + Expo. Retrato, muito animado, offline-first,
sem login e sem PII. Referência funcional: **Water Time – My Drink Reminder**
(Roman Nikolaev, App Store id1208916325). Referência de linguagem visual:
design system "estilo Duolingo" já descrito na skill do repositório.

> **Como usar este documento.** É a especificação de **produto**: escopo, fases,
> navegação, telas, modelo de domínio, regras de cálculo. A skill em
> `.claude/skills/duolingo-health-app/` é a especificação de **design e interação**:
> tokens, tipografia, elevação chunky, movimento, microcópia, mascote.
>
> **A skill não ganha sempre** (corrigido em 28/07/2026, decisão do usuário). Os
> `references/` da skill descrevem outro produto — um app de 6 pilares de saúde
> intestinal — logo a arquitetura de informação deles não descreve este app.
> Classifique a divergência antes de decidir: **é design → skill ganha; é produto →
> este plano ganha.** Ambíguo → perguntar ao usuário.
>
> **Revisado em 28/07/2026:** a navegação passou a ser **5 abas com o Hoje no centro,
> em botão circular destacado** — `Histórico · Cantinho · [Hoje] · Conquistas · Ajustes`.
> Decisão do usuário, vendo as telas prontas. Nesse ponto a skill (que prescrevia
> BottomNav com botão central) voltou a valer sobre o §5 original deste plano.

> **Este NÃO é um projeto novo.** O repositório já tem app rodando, com tela
> principal, mascote, tokens e store funcionando. Este plano descreve o **destino**,
> não um greenfield. Nada aqui autoriza recriar arquivos que já existem, trocar de
> stack, reescrever componentes que já seguem a skill ou apagar o store sem
> migração. Leia o §0.1 antes de qualquer coisa.

---

## 0. Decisões já tomadas (não reabrir)

| Tema | Decisão |
|---|---|
| Stack | Expo SDK 57 · RN 0.86 · React 19.2 · expo-router · Reanimated 4.5 · NativeWind 4.2 · Zustand + `persist`/AsyncStorage |
| Node | 24 (`nvm use`; há `.nvmrc`) |
| Conta / nuvem | **Não existem.** Zero login, zero backend, zero PII |
| Anúncios / rastreamento | **Não existem.** Nenhum SDK de analytics ou atribuição |
| Monetização | Fora do MVP. Se um dia entrar, é compra única, nunca com anúncio |
| Idiomas | pt-BR primeiro; estrutura pronta para en |
| Orientação | Retrato travado (`app.json`) |
| Mascote | **Um só: a Gotinha.** Sem galeria de personagens desbloqueáveis |
| Ícones | Só `lucide-react-native`. **Nunca emojis**, em nenhum lugar, inclusive notificações |
| Cor-líder | Azul-água `#1CB0F6`. Verde `#22C55E` é **exclusivo** de "meta batida" |

---

## 0.1 Estado atual e migração

### O que já existe e está correto — preservar

Verificado numa captura da tela principal em execução. **Não refazer:**

- Retrato, container central, fundo `#FFFFFF`, sem cabeçalho de navegação.
- Um único acento de cor, azul-líder `#1CB0F6` aplicado corretamente.
- Zero emoji. Ícones de uma família só (copos em line).
- Texto em `#4B4B4B` para o valor, secundário em cinza. Nunca preto.
- Uma decisão por tela: ação primária única e gigante ("BEBI!").
- Mascote próprio (Gotinha) com expressão neutra/positiva, estilizado, não realista.
- Ofensiva e XP como pills no topo, só leitura.
- "Desfazer" visível como ação terciária, em fantasma — bom instinto, mantém.
- Presets de volume 200/300/500 com seleção única e estado ativo em tint azul.
- Fontes display + corpo já carregadas e distintas.

Isso cobre boa parte da **F0** e um pedaço da **F1**. Marque-as como parciais,
não como pendentes.

### Divergências da skill a corrigir

Prioridade alta, na ordem. **Caminhos verificados no repo em 28/07/2026** — as três
primeiras linhas foram corrigidas contra o código; a leitura original vinha de uma
captura de tela e errava em parte.

| # | Divergência | Estado | Onde |
|---|---|---|---|
| 1 | Pressável sem lip de 4px | ✅ **resolvida.** A mecânica virou `Pressable3D`, usada por `Button` e `VolumeCard`; o "Desfazer" agora é `Button variant="ghost"`. (O diagnóstico original errava: o botão primário já tinha lip) | `Pressable3D.tsx` · `Button.tsx` · `VolumeCard.tsx` |
| 2 | Borda dos cards em 1px | ✅ **resolvida** (era falso: já eram 2px). O card pressável ganhou lip | `VolumeCard.tsx` |
| 3 | Água estática | ✅ **resolvida.** Duas senoides em loop 3,2 s / 4,1 s dessincronizadas, subida `withTiming(600, Easing.out(cubic))`, marcos 25/50/75% com pop + anel. Sem animar `height` nem `backgroundColor`: nível é `translateY`, cor é `fill` via `useAnimatedProps` | `ProgressBottle.tsx` |
| 4 | `900 ml / 2,0 L` mistura unidades | ✅ **resolvida.** `formatPair` usa a mesma unidade nos dois lados | `lib/format.ts` |
| 5 | Garrafa lê como bateria | ✅ **resolvida.** Agora é SVG com gargalo, ombro curvo e base arredondada | `ProgressBottle.tsx` |
| 6 | Sem linha do tempo do dia | ⬜ pendente — próximo item | `index.tsx` |
| 7 | Sem bebida ativa no botão | 🟡 parcial: o botão mostra ícone + volume (`+ 300 ML`); a "última bebida usada" só faz sentido com o catálogo da F2 | `index.tsx` |

Detalhe de implementação que vale preservar: o total no centro da garrafa é desenhado
**duas vezes em SVG e recortado pela própria linha d'água** (escuro acima, branco
submerso). Uma cor única falha o contraste do §10 porque a superfície corta o texto no
meio — foi verificado em tela, não presumido.

Prioridade baixa, avaliar depois: a Gotinha tem **três** estados (`happy`/`cheer`/`sleepy`,
`Gotinha.tsx:16`) contra os quatro do §8.2, e respira por `translateY`, não pelo
`scale 1→1.02` especificado (`Gotinha.tsx:39-46`).

### Migração do store — o bloqueador real

**Tudo da F2 em diante depende disso.** Se `src/store/useWater.ts` hoje guarda um
escalar por dia (algo como `{ total: 900, goal: 2000 }`), ele não suporta bebidas,
fator de hidratação, edição de registro, histórico nem resultado do dia.

Destino: o modelo do §3 (`days: Record<'YYYY-MM-DD', DayLog>` com `entries[]`).

Regras da migração:

1. **Ler o shape atual antes de escrever qualquer linha.** Reportar o que existe.
2. Adicionar `version` ao `persist` **antes** de mudar o shape, se ainda não houver.
   Se já houver, bump.
3. Escrever `migrate(persisted, fromVersion)` que converta o dado antigo em um
   `DayLog` com uma única `Entry` sintética (`drinkId: 'agua'`, `at` = meio-dia
   local daquele dia). Ninguém perde o histórico que já registrou.
4. Manter o nome do arquivo e a API pública das ações usadas pela UI
   (`addEntry`/equivalente) para não quebrar a tela que já funciona. Se o nome
   atual for diferente, adaptar o plano ao repo, não o repo ao plano.
5. Teste Jest da função `migrate` com um snapshot do dado antigo, antes de rodar
   no simulador.

### Ordem de trabalho recomendada

1. Levantamento (sem código): mapear F0–F5 contra o repo, mostrar o shape de
   `useWater.ts`, listar as divergências acima com caminho real de arquivo.
2. Migração do store + teste de `migrate`.
3. Divergências 1 e 2 (lip e bordas) — é o que mais muda a percepção por linha
   de código alterada.
4. Divergência 3 (onda e subida da água).
5. Divergências 4, 5, 6, 7.
6. F2 (bebidas) → F3 (lembretes) → F4 → F5.

`npx tsc --noEmit` e `npx expo export -p ios --output-dir /tmp/b` verdes entre
cada passo.

---

## 1. Divergências em relação ao app de referência

Herdado do Water Time (o que vale copiar como conceito):

- Lembretes locais configuráveis e educados.
- Diário/histórico de consumo.
- Vários tipos de bebida, cada um contribuindo de forma diferente para a hidratação
  ("água que vem da bebida" ≠ volume da bebida).
- Construtor de bebida personalizada.
- Mascote que conduz a configuração e reage ao progresso.
- Resultado do dia e dicas curtas.
- Badge no ícone quando o usuário perdeu lembretes.
- Preencher o dia anterior em um toque.

Descartado deliberadamente:

| Recurso do original | Por quê fica de fora |
|---|---|
| Login + sincronização em nuvem | Colide com "offline-first, sem PII". Tudo mora no aparelho |
| Anúncios e vídeos recompensados | Colide com o tom de bem-estar e com a regra de uma decisão por tela |
| Coleções de mascotes por IAP | Um único mascote, com estados emocionais em vez de skins |
| Apple Health | Exige config plugin + dev client nativo. Vira **fase opcional**, nunca dependência |
| Apple Watch | Fora do alcance prático de Expo/RN neste projeto |
| Estilo *kawaii* com emojis | A skill proíbe emoji. Fofura vem de forma, cor e mola, não de emoji |

---

## 2. Referência visual: o que se pega do Duolingo e o que não se pega

Pega-se o **sistema de interação**, que é o que faz o app parecer vivo:

- Botão com *lip* sólido de 4px sem blur; no press a face desce 4px e o lip
  desaparece. Nada de sombra difusa.
- Display tipográfico gordo e curto; corpo de texto em fonte arredondada legível.
- Um único acento de cor por tela; cinzas neutros carregando a hierarquia.
- Progresso sempre visível, ofensiva sempre visível, recompensa imediata e sonora/tátil.
- Mascote com poucas poses mas muita mola.
- Microcópia curta, ativa, sem parágrafo explicativo.

**Não se pega:** a fonte Feather Bold (exclusiva do Duolingo), DIN Next Rounded
(licença comercial), o mascote Duo, o verde `#58CC02` como cor-líder, nem qualquer
ilustração ou som deles. Nossa tipografia é **Fredoka** (display) + **Nunito**
(corpo), nosso mascote é a Gotinha, nossa cor-líder é o azul-água. O resultado
tem que ser reconhecível como *nosso*, não como um clone.

---

## 3. Modelo de domínio

```ts
// src/domain/types.ts
export type Unit = 'ml' | 'oz';
export type Sex = 'f' | 'm' | 'na';
export type Activity = 'baixa' | 'media' | 'alta';
export type Climate = 'temperado' | 'quente';

export interface Profile {
  weightKg: number;          // 30–250
  sex: Sex;
  activity: Activity;
  climate: Climate;
  wakeMinutes: number;       // minutos desde 00:00, ex. 7*60
  sleepMinutes: number;
  unit: Unit;
}

export interface Drink {
  id: string;
  name: string;
  icon: string;              // nome do ícone lucide
  tint: string;              // token de cor
  hydration: number;         // fator de hidratação, ver §4.2
  defaultMl: number;
  custom?: boolean;
}

export interface Entry {
  id: string;
  at: number;                // epoch ms, hora local do registro
  drinkId: string;
  volumeMl: number;          // o que foi bebido
  hydrationMl: number;       // volumeMl * hydration, arredondado
}

export interface DayLog {
  date: string;              // 'YYYY-MM-DD' local
  goalMl: number;            // meta congelada no dia
  entries: Entry[];
  totalHydrationMl: number;  // derivado, mantido para leitura rápida
  metGoal: boolean;
}

export interface Gamification {
  streak: number;
  bestStreak: number;
  lastMetDate: string | null;
  freezesAvailable: number;  // ver §7.1
  xp: number;
  unlocked: string[];        // ids de conquistas
}
```

### 3.1 Stores (Zustand + persist)

- `src/store/useProfile.ts` — `Profile`, meta calculada, override manual da meta.
- `src/store/useWater.ts` — `days: Record<string, DayLog>`, `drinks: Drink[]`,
  `lastDrinkId`, ações `addEntry`, `removeEntry`, `editEntry`, `copyDay`.
- `src/store/useSettings.ts` — lembretes, unidade, haptics on/off, som on/off.
- `src/store/useGamification.ts` — `Gamification`.

Regras:

- `persist` com `version` e `migrate` desde o primeiro commit. Bump a cada
  mudança de forma dos dados.
- Retenção: manter no máximo **400 dias** de `DayLog`; podar no boot.
- Seletores derivados via funções puras em `src/domain/`, nunca lógica dentro
  do componente.
- **Dia lógico** termina às **03:00 locais**, não à meia-noite: quem bebe água
  às 01:30 está fechando o dia anterior. Toda conversão de data usa hora local
  (helper único em `src/lib/date.ts`), nunca UTC.

---

## 4. Regras de cálculo

### 4.1 Meta diária

```
base   = peso_kg * 35                       // ml
sexo   = 'm' ? +250 : 0
ativ   = baixa 0 | media +350 | alta +700
clima  = quente ? +500 : 0
meta   = arredonda_para_50(base + sexo + ativ + clima)
meta   = clamp(meta, 1200, 4000)
```

- É uma **heurística de app de hábito, não prescrição clínica.** A tela de
  resultado do onboarding diz isso em uma linha curta e oferece ajuste manual.
- Override manual também é limitado a 1200–4000 ml. Se o usuário tentar passar
  disso, o app não obedece calado: mostra uma linha explicando que beber água em
  excesso também faz mal e mantém o teto. Nenhum incentivo a bater metas extremas.
- A meta é **congelada em `DayLog.goalMl`** no primeiro registro do dia. Mudar
  peso hoje não reescreve o histórico.

### 4.2 Fator de hidratação por bebida

Volume registrado ≠ água contabilizada. Tabela inicial (ajustável em
`src/domain/drinks.ts`, com comentário deixando claro que são coeficientes de
tracker, não valores clínicos):

| Bebida | Ícone lucide | Fator | Padrão |
|---|---|---|---|
| Água | `glass-water` | 1.00 | 250 ml |
| Água com gás | `glass-water` | 1.00 | 250 ml |
| Água de coco | `nut` | 0.95 | 200 ml |
| Isotônico | `zap` | 0.95 | 500 ml |
| Chá | `cup-soda` | 0.90 | 200 ml |
| Suco natural | `citrus` | 0.85 | 200 ml |
| Leite | `milk` | 0.85 | 200 ml |
| Refrigerante | `cup-soda` | 0.85 | 350 ml |
| Café | `coffee` | 0.80 | 80 ml |
| Energético | `battery-charging` | 0.70 | 250 ml |
| Cerveja | `beer` | 0.40 | 350 ml |
| Vinho | `wine` | 0.10 | 150 ml |
| Destilado | `martini` | 0.00 | 50 ml |

Bebida personalizada: nome, ícone escolhido de uma lista curta, cor de um dos
tokens, fator via slider de 0 a 1 em passos de 0.05, volume padrão.

`hydrationMl = Math.round(volumeMl * hydration)`. A home mostra **hidratação**;
o detalhe do dia mostra as duas colunas (líquido total e água efetiva), que é o
que faz o usuário entender o valor do app.

### 4.3 Unidades

Tudo armazenado em **ml**. `oz` é só formatação (`1 fl oz = 29.5735 ml`), com
arredondamento para inteiro na exibição. Nunca converter no armazenamento.

---

## 5. Navegação e telas

```
app/
  _layout.tsx                  # providers, fontes, gate de onboarding
  (onboarding)/
    _layout.tsx
    boas-vindas.tsx
    peso.tsx
    rotina.tsx                 # acordar / dormir
    estilo.tsx                 # atividade + clima
    meta.tsx                   # resultado + ajuste
    lembretes.tsx              # pede permissão AQUI, não no boot
  (tabs)/
    _layout.tsx
    historico.tsx
    cantinho.tsx               # Cantinho da Gotinha (gamificação)
    index.tsx                  # Hoje — aba central, botão destacado
    conquistas.tsx
    ajustes.tsx
  bebida.tsx                   # modal: escolher bebida + volume
  registro/[id].tsx            # modal: editar/apagar registro
  dia/[date].tsx               # resultado do dia
```

### 5.1 Onboarding — uma decisão por tela

Seis telas, cada uma com **exatamente uma pergunta**, ícone grande, alvos ≥ 64px,
Gotinha à esquerda com uma fala de no máximo oito palavras. Barra de progresso
em pills no topo. Nunca um formulário com vários campos.

1. **Boas-vindas** — Gotinha entra pulando. Um botão: "Vamos".
2. **Peso** — stepper grande `−` / valor / `+`, passo 1 kg, com "arrastar" opcional.
3. **Rotina** — dois botões que abrem picker de hora (acordar, dormir).
4. **Estilo** — dois grupos de 3 e 2 cards icônicos, seleção única.
5. **Meta** — número grande animado (contador), uma linha de ressalva, botão
   "Ajustar" secundário.
6. **Lembretes** — explica o valor em uma frase, depois pede permissão. Se negar,
   o app funciona inteiro; a tela de ajustes oferece reabrir.

Concluir grava `onboardingDone` e faz `router.replace('/(tabs)')`.

### 5.2 Hoje (tela principal)

Do topo para baixo:

1. **Barra de status do hábito** — chama da ofensiva (`#FF9600`) + número, e XP
   (`#FFC800`). Só leitura, tocável para ir a Conquistas.
2. **Garrafa/copo animado** — o herói da tela. SVG com preenchimento animado,
   duas ondas senoidais em loop, marcações de 25/50/75%. No centro, o total do
   dia em display grande e a meta abaixo em corpo. Ao bater a meta, a superfície
   inteira vira verde `#22C55E` — **única** aparição do verde.
3. **Gotinha** — sentada na borda do copo, com estado emocional (§8.2).
4. **Ação primária** — botão gigante com lip de 4px: `+ 250 ml` da última bebida
   usada, ícone à esquerda. É *a* decisão da tela.
5. **Ação secundária** — pill "Outra bebida" que abre `bebida.tsx`.
6. ~~**Linha do tempo do dia** — lista horizontal e enxuta dos registros como pills
   com ícone + volume; toque abre `registro/[id]`.~~ **Removida da Hoje** — ver a
   revisão abaixo.

Sem cabeçalho de navegação, sem card de dicas fixo, sem gráfico nesta tela.

**Revisão de 29/07/2026 — a tela Hoje enxugou.** A garrafa cresceu até ocupar quase
metade da altura (`SCALE` em `ProgressBottle.tsx`), e para caber saíram dois itens:

- A **linha do tempo** (item 6) saiu daqui e o componente `DayTimeline.tsx` foi
  **apagado** em 29/07/2026: quem faz esse papel agora é o `EntryList`, em lista
  vertical, na seção "Hoje" do Histórico. Se as pills horizontais voltarem a fazer
  falta, é reescrever — não há código dormindo à espera.
- O **"Desfazer"** virou duas coisas: o `UndoToast` na própria Hoje, que expira em 3s
  e corrige o erro onde ele acontece, e o apagar por linha na lista do Histórico, esse
  com confirmação. Ainda **não existe editar** um registro: trocar 500 por 300 é
  apagar e registrar de novo, e a rota `registro/[id]` continua por fazer na F2.
- A **Gotinha** (item 3) não senta na borda da garrafa: testamos e o dono preferiu ela
  ao lado da frase, que virou balão de fala (`SpeechBubble.tsx`).

### 5.3 Bebida (modal)

Bottom sheet em três passos dentro da mesma folha, sem navegação:
grade de ícones 3×N (seleção única, 72px de alvo) → stepper de volume com três
presets rápidos (`-`, valor, `+`, passo 50 ml) → botão de confirmar.
Botão "Criar bebida" no fim da grade.

### 5.4 Histórico

Segmented control em pills: **Semana / Mês / Ano**.

- Semana: 7 barras verticais, altura = % da meta, trilha `#E5E5E5`, barra
  `#1CB0F6`, verde só nos dias que bateram. Toque no dia → `dia/[date]`.
- Mês: grade de 5×7 células, opacidade proporcional ao % da meta.
- Ano: 12 linhas com média mensal.
- Rodapé: média diária, melhor dia, dias com meta batida.
- Botão "Preencher ontem" quando ontem está em zero — abre `dia/[date]` de ontem
  com um atalho de "bebi minha meta", como no app de referência.

### 5.5 Conquistas

Ofensiva grande no topo (chama animada), XP e nível abaixo, depois grade de
conquistas 2 colunas: desbloqueadas em cor cheia, bloqueadas em `#AFAFAF`
com o ícone em silhueta. Toque mostra o critério em uma linha.

### 5.6 Ajustes

Lista de linhas com ícone à esquerda, alvo ≥ 64px:
meta diária · perfil · lembretes · unidade · haptics · som · reduzir movimento
(espelha o do sistema, permite forçar) · exportar dados (JSON via share sheet) ·
apagar tudo (confirmação dupla) · sobre.

---

## 6. Lembretes — a parte que costuma quebrar

O app de referência é criticado justamente por notificação que **seca** depois de
algumas horas. Causa quase certa: o iOS mantém no máximo **64 notificações locais
pendentes** por app e descarta o excedente; se o agendamento depende do app ser
aberto, quem não abre para de receber. Estratégia para não herdar isso:

### 6.1 Cálculo dos horários

```
janela   = [wakeMinutes + 30, sleepMinutes - 60]
n_slots  = clamp(round(duração_janela / intervalo), 4, 12)   // intervalo padrão 90 min
slots    = distribuídos uniformemente na janela
```

Silenciar automaticamente: fora da janela, e quando a meta do dia já foi batida.

### 6.2 Agendamento em duas camadas

**Camada A — precisa, 3 dias à frente.** Para hoje + 2 dias, agendar
`SchedulableTriggerInputTypes.DATE` com data explícita para cada slot ainda não
passado, pulando os slots de hoje se a meta já foi batida. Máximo ~36
notificações. Reagendar em: foreground do app, cada `addEntry`, mudança de
configuração de lembrete, mudança de perfil.

**Camada B — rede de segurança perene.** Além disso, agendar de 3 a 4
notificações com trigger `DAILY` (repetição infinita, não expira). Essas
sobrevivem a semanas sem abrir o app. Total pendente fica em ~40, folgado abaixo
de 64.

Implementação: um módulo único `src/lib/notifications.ts` que expõe
`syncReminders()` idempotente — cancela tudo (`cancelAllScheduledNotificationsAsync`)
e reagenda a partir do estado atual. Nunca agendar espalhado pelos componentes.

### 6.3 Conteúdo

- Título curto, corpo de no máximo oito palavras, sem emoji, na voz da Gotinha.
- Rotacionar um pool de ~20 frases, sem repetir a última usada.
- Tom: convite, nunca cobrança. Sem "você falhou", sem contagem de fracasso.
- `categoryIdentifier` com ação rápida "Bebi 250 ml". No iOS a ação abre o app e
  o registro acontece no `addNotificationResponseReceivedListener` — não prometa
  registro em background, porque não é confiável em RN.
- Badge no ícone com o número de lembretes perdidos hoje, zerado ao abrir.

### 6.4 Permissões

Pedir **só** na última tela do onboarding, depois de explicar o valor. Se negar,
esconder toda a seção de lembretes da home e deixar em Ajustes um caminho para
`Linking.openSettings()`.

### 6.5 Dev build

Notificações locais pedem um **development build** (`npx expo run:ios`), não Expo
Go. Assumir isso desde a fase de lembretes.

---

## 7. Gamificação

### 7.1 Ofensiva

- Um dia conta quando `totalHydrationMl >= goalMl`.
- Avaliada no fechamento do dia lógico (03:00) e recalculada no boot.
- **Congelamento:** o usuário ganha 1 congelamento a cada 7 dias cumpridos,
  acumulando até 2. Se um dia falha e há congelamento, ele é consumido
  automaticamente e a ofensiva sobrevive. Isso é deliberado: um app de saúde não
  deve punir uma gripe ou uma viagem. Perder a ofensiva mostra "recomeçar é
  normal", nunca linguagem de culpa.
- `bestStreak` sempre preservado.

### 7.2 XP e nível

`+10` por registro (máximo 100/dia) · `+50` por meta batida · `+25` por
conquista. Nível = `floor(sqrt(xp / 100)) + 1`, curva mostrada como anel ou
barra em Conquistas. XP não faz nada além de existir — sem loja, sem moeda.

### 7.3 Conquistas iniciais

Primeiro registro · 3 dias · 7 dias · 30 dias · 100 dias · 100 registros ·
500 registros · meta batida antes do meio-dia · 5 bebidas diferentes em um dia ·
bebida personalizada criada · semana inteira sem congelamento · 7 dias seguidos
registrando antes das 9h.

---

## 8. Movimento

Reanimated 4.5. Só `transform` e `opacity`. Todas as animações checam
`useReducedMotion()` e, quando ativo, viram transição instantânea ou fade de
120 ms. Springs padrão: `{ damping: 15, stiffness: 300, mass: 0.6 }`.

### 8.1 Catálogo

| Momento | Animação |
|---|---|
| Press em qualquer pressável | `translateY 0→4` + lip desaparece, spring, < 100 ms |
| Registro adicionado | Nível do copo sobe com `withTiming(600, Easing.out(Easing.cubic))` |
| Ondas do copo | Dois paths senoidais em `translateX` loop 3.2 s, dessincronizados |
| Marco 25/50/75% | Pop `scale 1→1.12→1` + anel expandindo em `opacity`+`scale` |
| Meta batida | Copo vira verde, Gotinha pula, 24 partículas de confete 900 ms, haptic `success` |
| Números | Contador interpolado, 400 ms |
| Ofensiva | Chama com `scaleY 1→1.06` loop 1.4 s |
| Gotinha ociosa | Respiração `scale 1→1.02`, loop 2.6 s |
| Entrada de tela | Fade + `translateY 12→0`, stagger de 40 ms entre blocos |

Confete e stagger são **cortados inteiros** sob movimento reduzido.

### 8.2 Estados da Gotinha

`neutra` (0–24% ou início do dia) · `animada` (25–74%) · `radiante` (≥100%) ·
`atenta` (dia avançado e < 40% — postura curiosa, **nunca triste ou murcha**;
culpabilizar o usuário está fora do vocabulário do app).

Implementar como um SVG com poses trocáveis, não como sprite sheet, para manter
o bundle enxuto e permitir animar partes (olhos, braços) via props.

---

## 9. Componentes a construir

`src/components/`

- `Button.tsx` — já existe, é a **referência de lip 3D**. Variantes: primária
  (azul), secundária (contorno 2px), fantasma. Nunca criar um segundo botão.
- `Card.tsx` — container não pressável, borda sólida 2px `#E5E5E5`, raio 16.
- `Pill.tsx` — raio `9999px`, usado em seleção e presets.
- `Sheet.tsx` — bottom sheet.
- `ProgressBottle.tsx` — SVG + Reanimated, o herói da home.
- `DrinkGrid.tsx`, `VolumeStepper.tsx`, `TimePickerRow.tsx`.
- `Mascot.tsx` — recebe `state` e `size`.
- `StreakFlame.tsx`, `XpBar.tsx`, `AchievementTile.tsx`.
- `AnimatedNumber.tsx`, `Confetti.tsx`, `SegmentedPills.tsx`, `WeekBars.tsx`.

Lembretes de convenção do repositório:

- `className` só em `View/Text/Pressable/ScrollView`. Em `Animated.View` use
  `style` com os tokens de `src/design/tokens.ts` — NativeWind não os envolve.
- Cores em `tailwind.config.js`; `tokens.ts` é o espelho JS para SVG e Reanimated.
- Haptics sempre por `src/lib/haptics.ts` (silencia falha, não roda no web).

---

## 10. Acessibilidade e qualidade

- `accessibilityLabel` e `accessibilityRole` em todo botão só de ícone.
- `maxFontSizeMultiplier` nos números de display; corpo de texto escala livre.
- Contraste mínimo AA para texto sobre azul e sobre verde (checar `#FFFFFF`
  sobre `#1CB0F6` nos tamanhos pequenos; se falhar, usar `#4B4B4B`).
- Nada depende exclusivamente de cor: meta batida tem também ícone de check.
- `useReducedMotion()` respeitado em 100% das animações.
- Testes Jest nas funções puras: cálculo de meta, fator de hidratação, dia
  lógico às 03:00, ofensiva com congelamento, geração de slots de lembrete.
- Gates antes de cada entrega: `npx tsc --noEmit` e
  `npx expo export -p ios --output-dir /tmp/b`.

---

## 11. Fases

Cada fase termina com typecheck limpo, export do bundle válido e revisão contra
`references/DESIGN-SYSTEM.md`.

**F0 — Fundação** ✅ **concluída** (28/07/2026)
Tokens em `tailwind.config.js` + `tokens.ts`, fontes Fredoka/Nunito carregadas,
`Button`/`Card`/`Pill`, tabs do expo-router, stores vazias com `persist` e
`version: 1`, `lib/date.ts`, `lib/haptics.ts`.
*Aceite:* navegar entre as 4 abas, um botão com lip funcionando e pressionável.

**F1 — Núcleo do hábito** ✅ **concluída** (29/07/2026, com a 6ª tela na F3)
Onboarding completo, cálculo de meta, `ProgressBottle` animado, botão de registro
rápido, persistência entre reinícios, dia lógico correto.
*Aceite:* abrir o app do zero, configurar, registrar 250 ml, matar o app,
reabrir e o valor continuar lá.

Feito: onboarding de 4 passos (boas-vindas · peso · rotina · estilo · meta) com gate
em `app/_layout.tsx`, `computeGoal`, `ProgressBottle`, registro rápido, persistência
e dia lógico às 03:00.

A 6ª tela, de lembretes, foi movida para a F3 de propósito — pedir permissão sem
ter `syncReminders()` faria o usuário autorizar algo que nunca chega — e **entrou
junto com ela** em 29/07/2026: `(onboarding)/lembretes.tsx`, com prévia dos
horários reais antes de abrir o diálogo do sistema.

Duas divergências de UI assumidas, ambas reversíveis:
- **Rotina usa stepper de 30 min, não picker de hora.** Evita dependência nativa
  nova e mantém o padrão de alvos grandes do peso.
- **Estilo tem dois grupos na mesma tela** (atividade + clima), como o §5.1 item 4
  descreve — é a única tela com duas perguntas.

**F2 — Bebidas**
Catálogo com fatores, modal de bebida, stepper de volume, bebida personalizada,
editar e apagar registro, linha do tempo do dia.
*Aceite:* registrar um café de 80 ml e ver 64 ml contabilizados, com as duas
colunas no resultado do dia.

**F3 — Lembretes** ✅ **concluída** (29/07/2026)
`lib/notifications.ts` com `syncReminders()`, agendamento em duas camadas,
permissão na 6ª tela do onboarding, ação rápida "Bebi 250 ml", badge por posição do
slot, 20 frases rotativas. Domínio puro em `domain/reminders.ts`, com 148 testes no
total (16 do domínio, 11 das invariantes de agendamento).
*Aceite:* ficar 3 dias sem abrir o app (ou simular) e ainda receber lembrete.

Duas decisões que o §6 não previa:

- **As duas camadas dividem o dia.** O `DAILY` da camada B dispara também nos 3 dias
  que a camada A cobre, o que daria **duas notificações no mesmo minuto**. Resolvido
  dando os horários perenes à camada B e só os outros à camada A: nenhum horário tem
  dois donos, e o total pendente cai de ~36 para ~20 (limite do iOS é 64).
- **A rede perene ignora a meta batida.** `DAILY` é agendado uma vez e não sabe do
  dia; então bater a meta cala os avisos precisos de hoje, mas os 4 perenes seguem.
  É o preço de sobreviver a semanas sem abrir o app, e o tom de convite das frases
  aguenta o caso.

**Falta para fechar de verdade:** a rotina (acordar/dormir) só é definida no
onboarding — **não há como editar a janela depois**. Quem muda de turno fica preso
nos horários do primeiro dia. São dois steppers nos Ajustes, reaproveitando os da
tela `rotina.tsx`.

**F4 — Gamificação**
Ofensiva com congelamento, XP e nível, 12 conquistas, marcos de progresso,
confete, resultado do dia.
*Aceite:* bater a meta dispara a sequência inteira (verde + pulo + confete +
haptic) e a ofensiva incrementa uma única vez.

**F2 — Bebidas** ⏸️ **adiada** (decisão de 29/07/2026)
Fica para depois do lançamento. Consequência: o catálogo segue com **água só**, e
`hydrationOf` devolve 1 para tudo — o argumento de "volume ≠ hidratação" ainda não
existe no produto.

**F5 — Histórico e polimento** ✅ **concluída** (29/07/2026)
Semana/mês/ano, preencher ontem, exportar JSON, apagar tudo, ~~i18n pt-BR/en~~
(**adiada**: só Brasil por ora), passada final anti-AI-slop e revisão de
acessibilidade.
*Aceite:* nenhum emoji no código, uma única família de ícones, verde só em
"meta batida", todo pressável com lip de 4px.

Aceite verificado por varredura, não por impressão: **zero** emoji no código, **zero**
importação de outra família de ícones, todos os 7 componentes animados consultando
`useReducedMotionPref`, nenhum alvo de toque abaixo de 44pt, e `expo lint` limpo
(dois `setState` dentro de `useEffect` corrigidos, um deles pré-existente em
`AnimatedNumber`).

Duas entregas com decisão de produto embutida:

- **Preencher ontem** (`addEntryYesterday`) recalcula a ofensiva mas **não dá XP**:
  pontuar retroativo abriria caça à ofensiva. O registro entra com carimbo de
  meio-dia, porque a hora real se perdeu, e a meta usada é a de hoje quando ontem
  não existe no disco — a meta que valia ontem nunca foi gravada.
- **Os 4 estados da Gotinha** saíram de `domain/mascot.ts`, puro e testado. Antes o
  rosto era escolhido em dois lugares e a frase num terceiro, com réguas diferentes:
  dava para ver a Gotinha comemorando ao lado de um "bom começo". `atenta` vence
  `animada` de propósito — quem está em 30% às 20h precisa de empurrão, não elogio.

**Divergência do aceite que ficou de fora, por ser decisão sua:** o verde aparece em
três lugares que **não** são "meta de água batida" — missão cumprida (`MissionList`,
`QuickAccess`, `DayResult`, o atalho na Hoje), elemento já conquistado no Cantinho, e
a grama do cenário (`bg-meta-tint`). Tudo isso entrou com a gamificação, depois que a
regra foi escrita. Ou a regra passa a ser "verde = qualquer coisa concluída", ou esses
usos mudam de cor.

**Opcional, depois do MVP**
Apple Health (`HKQuantityTypeIdentifierDietaryWater`, exige config plugin e dev
client) · widget de tela de início · Live Activity · compra única para bebidas
extras. Nada disso pode virar dependência do núcleo.

---

## 12. Armadilhas conhecidas

- Não usar `Date` em UTC para nada de calendário; sempre o helper local.
- Não animar `height`, `width`, `top` ou cor de fundo por JS — só `transform`
  e `opacity` (a mudança de cor da água é uma troca de fill no SVG via
  `useAnimatedProps`, aceitável, mas só ela).
- Não colocar `className` em `Animated.View`.
- Não recalcular a meta retroativamente sobre `DayLog` já gravado.
- Não agendar notificação fora de `syncReminders()`.
- Não pedir permissão de notificação no boot.
- Não deixar a soma do dia derivar de dois lugares; `totalHydrationMl` é
  recalculado a partir de `entries` em toda mutação.
- Não adicionar uma segunda família de ícones "só para esse caso".
- Não usar linguagem de culpa em nenhuma cópia, notificação ou estado vazio.
