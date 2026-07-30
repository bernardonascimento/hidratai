# Plano de gamificação — Hidrataí

> Complementa o `PLANO-BEBA-AGUA.md` (§7 trata de ofensiva, XP e conquistas). Onde
> houver conflito, **este documento vence no assunto gamificação**; o outro segue
> valendo para o resto do produto. Design continua sendo da skill.

---

## 1. Para quem estamos jogando

Três perfis instalam um app de água. Eles precisam de coisas diferentes, e o jogo
serve principalmente aos dois primeiros:

| Perfil | Quem é | O que falha | O que o jogo resolve |
|---|---|---|---|
| **A — Esquece** | 25–45, trabalho concentrado (home office, escritório, atendimento). Bebe café, esquece água | Não lembra durante o dia; abre o app 2 dias e para | Lembrete + motivo para voltar amanhã |
| **B — Estética / treino** | 18–35, academia, dieta, pele | Motivação alta na semana 1, cai na 3 | Progresso visível de longo prazo |
| **C — Orientação clínica** | 30–60, cálculo renal, infecção urinária recorrente | Já é motivado; quer registro simples e confiável | Quase nada — o jogo não deve atrapalhar |

**Consequência de projeto:** o perfil C precisa poder ignorar o jogo. Nada de
gamificação bloqueando o caminho de registrar água. Nenhuma tela obrigatória entre
abrir o app e apertar o botão.

**Contexto Brasil:** calor boa parte do ano, garrafa de 1–2 L como acessório de
rotina, "meta de 2 litros" já no vocabulário popular. Isso ajuda: a meta não precisa
de explicação.

---

## 2. O problema que a gamificação tem de resolver

Não é registrar — é **abrir no dia 4**.

A curva de morte de um app de hábito: instala empolgado, usa 2–3 dias, esquece um
dia, sente que "quebrou", não volta. Nossa gamificação atual falha nos três pontos:

1. **Conquistas são passivas.** Você as descobre depois de já ter feito. Não dão
   nada para fazer *hoje*.
2. **XP não faz nada** (o próprio §7.2 admite: "XP não faz nada além de existir").
   Número que só sobe não cria expectativa.
3. **Ofensiva é frágil.** Hoje ela zera na primeira falha. Um app de saúde que pune
   uma gripe empurra o usuário para a desinstalação.

O que traz alguém de volta amanhã, em ordem de força comprovada no mercado:
**algo vivo esperando por você** (Finch, Plant Nanny, Duolingo) > **objetivo curto
que dá para cumprir hoje** (missões diárias) > **medo de perder sequência** (streak)
> **coleção acumulada** (badges).

Estamos usando só o mais fraco dos quatro.

---

## 3. Regras de segurança e tom (não negociáveis)

Água em excesso mata — hiponatremia é real. Um app que gamifica ingestão tem uma
obrigação que um app de idiomas não tem:

1. **Nenhuma recompensa por passar da meta.** Nem XP extra, nem missão do tipo
   "beba 3 L hoje", nem "supermeta". Bater a meta é o teto do que se comemora.
   Excesso não ganha nada — e nunca é sugerido.
2. **Nenhuma missão pede volume; missões pedem distribuição.** "Quatro registros ao
   longo do dia" é seguro. "Beba mais que ontem" não é.
3. **Zero linguagem de culpa ou perda.** Nunca "você falhou", "não perca sua
   ofensiva", "sua planta vai morrer". A ofensiva quebrada diz "recomeçar é normal".
4. **Nada morre.** No cenário (§4.2) nenhum elemento regride ou seca por ausência.
   Ele apenas para de crescer. Punição visual em app de saúde gera abandono, não
   adesão.
5. **Sem FOMO temporal.** Nada de "faltam 2 h para perder X". Lembretes convidam.
6. **Nada disso é prescrição clínica** — a ressalva do §4.1 continua em todo lugar
   onde a meta aparece.

---

## 4. As cinco mecânicas propostas

Em ordem de impacto por esforço. As duas primeiras são o coração.

### 4.1 Missões do dia — *dá o que fazer hoje*

Três missões, sorteadas de um pool, renovadas no fechamento do dia lógico (03:00).
Aparecem na Hoje, num bloco compacto abaixo da linha do tempo.

Pool inicial (todas sobre **distribuição e horário**, nunca volume):

| Missão | Critério | XP |
|---|---|---|
| Bom dia | Primeiro registro antes das 9h | 15 |
| Ao longo do dia | 4 ou mais registros | 20 |
| Depois do almoço | Um registro entre 13h e 15h | 15 |
| Antes de dormir | Um registro após 20h | 15 |
| Dia completo | Bater a meta | 25 |
| Sem pressa | Registros em 3 faixas diferentes (manhã/tarde/noite) | 20 |
| Constante | Bater a meta hoje e ontem | 25 |

Regras: sempre 3 missões, sendo **uma delas sempre "Dia completo"** (a meta é a
âncora); as outras duas sorteadas sem repetir as de ontem. Cumprir todas as três dá
**+20 de bônus** e um "dia perfeito" marcado no histórico.

Por que funciona: transforma o app de "registrar quando lembrar" em "tenho três
coisinhas hoje". É a mecânica de maior retorno por linha de código aqui — o critério
de cada missão é derivável dos `entries` que já temos.

### 4.2 O Cantinho da Gotinha — *algo vivo esperando por você*

Uma tela nova (substitui ou envolve Conquistas) com um cenário que **cresce com a
sua consistência**: a Gotinha num canto, e ao redor plantas, pedras, um regador, um
peixinho num pote, um sol. Cada elemento é um SVG simples no estilo do mascote.

- **Moeda de crescimento: dias cumpridos**, não volume. Cada dia com meta batida
  gera 1 "gota de rega". Elementos custam de 3 a 40 gotas.
- O usuário **escolhe** o que desbloquear na ordem que quiser — escolha é adesão.
- **Nada regride.** Faltar não seca nada; apenas não rende gota nova.
- Ao desbloquear, a Gotinha reage (pop + a peça entra com spring).

Referência honesta: é o mecanismo do Plant Nanny e do Finch, que retêm justamente
por criar responsabilidade afetiva. A diferença é que ali a planta **morre** se você
falhar — e é exatamente isso que não vamos copiar (regra §3.4).

Por que funciona: dá ao XP e à ofensiva um **destino visível**. Sem isso, número é
número.

### 4.3 Ofensiva que perdoa — *não fugir na primeira falha*

Implementar de verdade o congelamento que o §7.1 já previu, e ir um passo além:

- 1 congelamento a cada 7 dias cumpridos, acumulando até 2.
- Falhou um dia e tem congelamento? É consumido **automaticamente**, e o app conta o
  que aconteceu sem drama: "Usei um congelamento. Sua ofensiva continua."
- Sem congelamento, a ofensiva zera — e a tela mostra `bestStreak` ("seu recorde é
  12 dias") em vez de focar na perda.
- **Sábado livre opcional** (ajuste): um dia da semana que não quebra a ofensiva.
  Quem tem rotina de fim de semana caótica não abandona por isso.

### 4.4 Níveis com nome + resultado do dia — *sensação de avanço*

O nível hoje é `floor(sqrt(xp/100))+1`, um número solto. Passa a ter **nome e
estágio**, com a Gotinha ganhando um detalhe visual em cada um:

| Nível | Nome | Aproximadamente |
|---|---|---|
| 1–2 | Gota | primeira semana |
| 3–4 | Poça | ~2 semanas |
| 5–6 | Riacho | ~1 mês |
| 7–9 | Rio | ~2 meses |
| 10–13 | Cachoeira | ~4 meses |
| 14+ | Oceano | longo prazo |

E um **resultado do dia**: na primeira abertura após o fechamento do dia lógico, um
card curto — quanto bebeu, missões cumpridas, se a ofensiva seguiu, e uma dica de
uma linha. É o momento de recompensa diário que hoje não existe.

### 4.5 Marcos de vida — *orgulho acumulado*

Números grandes que só crescem: **litros bebidos na vida**, dias no app, total de
registros. Marcos em 10 L, 50 L, 100 L, 500 L, 1000 L. Barato de calcular (já temos
todo o histórico) e dá algo para contar para alguém — com botão de compartilhar
imagem, é aquisição orgânica sem rede social.

---

## 5. Como o XP passa a ter função

Hoje: `+10` por registro, `+50` por meta. E acaba aí.

Proposta: **XP alimenta o nível; dias cumpridos alimentam o cenário.** Duas moedas
com propósitos distintos — XP mede atividade, gotas medem consistência. Isso evita o
problema de uma moeda só, em que registrar 20 vezes num dia vale mais que ser
constante por 20 dias.

Ajustes no XP:
- Manter `+10` por registro, **com o teto de 100/dia que o §7.2 já previa** (e que
  não implementamos): sem teto, fracionar 30 registros de 50 ml vira farm.
- `+50` por meta batida.
- `+15..25` por missão, `+20` pelo dia perfeito.
- **Nada por exceder a meta** (regra §3.1).

---

## 6. Modelo de dados

Entra uma store nova e uma extensão da gamificação hoje embutida em `useWater`:

```ts
// src/domain/types.ts (adições)
export interface Mission {
  id: string;                    // 'bom-dia', 'ao-longo-do-dia', ...
  date: string;                  // dia lógico a que pertence
  done: boolean;
  xp: number;
}

export interface Garden {
  drops: number;                 // gotas disponíveis (dias cumpridos não gastos)
  unlocked: string[];            // ids dos elementos do cenário
}

export interface Gamification {
  streak: number;
  bestStreak: number;
  lastMetDate: string | null;
  freezesAvailable: number;      // 0..2
  freezesUsedOn: string[];       // datas em que um congelamento salvou o dia
  restDay: number | null;        // 0..6, dia da semana livre (opcional)
  xp: number;
  xpToday: number;               // para o teto de 100/dia
  unlocked: string[];            // conquistas
  lifetimeMl: number;            // marcos de vida
}
```

Regras:

- **`useGamification` nasce agora**, extraindo `xp`/`streak`/`lastMetDate` de
  `useWater` — com `migrate` que lê os valores antigos de lá (é o momento certo:
  quanto mais tempo esperarmos, mais dados haverá para mover).
- `useMissions` guarda as 3 do dia; recalcula no fechamento do dia lógico.
- **O status de cada missão é derivado dos `entries`**, como as conquistas já são —
  persistimos só *quais* missões são as de hoje, nunca o "done". Assim apagar um
  registro reflete na missão, sem estado divergente.
- Ofensiva é avaliada no fechamento do dia lógico **e** recalculada no boot.

---

## 7. Fases

Cada uma entrega valor sozinha, na ordem de retorno:

**G1 — Missões do dia** · `domain/missions.ts` puro + bloco na Hoje + XP com teto.
*Aceite:* abrir o app e ver 3 missões, cumprir uma e ver o XP entrar.
**Maior impacto pelo menor esforço.** Faria primeiro mesmo que nada mais saísse.

**G2 — Ofensiva que perdoa** · `useGamification` com migração, congelamentos,
`bestStreak`, dia livre opcional em Ajustes.
*Aceite:* falhar um dia com congelamento e a ofensiva continuar, com aviso sem drama.

**Status G1–G5: implementadas em 28/07/2026.** Notas de execução:

- `useGamification` nasceu junto da G1, não na G2: o teto de 100 XP/dia precisa de
  `xpToday`, que mora nessa store. Fazer na ordem original criaria retrabalho.
- A semente do XP/ofensiva antigos é **uma ponte no layout raiz**, não import entre
  stores — assim `useGamification` não conhece `useWater` e não há ciclo. Os campos
  velhos ficaram `@deprecated` em `useWater` em vez de removidos, para não exigir
  migração destrutiva do disco.
- As missões ficaram **num atalho circular** no topo da Hoje, não em bloco fixo: no
  fluxo elas empurravam o botão de registrar para fora da tela.
- Um HUD de jogo entrou no topo da Hoje (nível à esquerda, ofensiva e XP à direita),
  substituindo o `StatPill`.
- O Cantinho ganhou aba própria; Conquistas ficou com ofensiva, nível e a grade.

Cuidado que quase passou: o "apagar tudo" de Ajustes limpava água e perfil, **mas não a
gamificação** — ofensiva, XP, gotas e cantinho sobreviveriam. Corrigido; é o tipo de
falha que só aparece testando o caminho inteiro.

**G3 — Resultado do dia + níveis nomeados** · card na primeira abertura do dia,
estágios com nome, Conquistas mostrando o estágio.
*Aceite:* virar o dia lógico e receber o resumo de ontem.

**G4 — O Cantinho da Gotinha** · tela nova, ~12 elementos em SVG, gotas, desbloqueio
com animação. **É a fase mais caras em desenho** (cada elemento é arte).
*Aceite:* bater a meta, ganhar uma gota, desbloquear uma planta e vê-la no cenário.

**G5 — Marcos de vida + compartilhar** · litros na vida, marcos, imagem de
compartilhamento via `Share`.
*Aceite:* passar de 10 L e receber o marco.

Gates de sempre: `npx tsc --noEmit`, `npm test`, `npx expo export -p ios`.

---

## 8. O que eu não recomendo — e por quê

| Ideia | Por que fica fora |
|---|---|
| **Ligas / ranking** | Exige conta e nuvem, contra a decisão §0 do plano principal. Ranking com bots é enganar o usuário |
| **Vidas / corações** | Punição por errar; num app de saúde, o "erro" é uma gripe |
| **Moeda + loja** | Puxa para IAP e para farm de registro. XP já basta como medida |
| **Skins do mascote por compra** | O plano principal decidiu: um mascote, com estados |
| **Desafio "beba 4 L hoje"** | Perigoso. Fere a regra §3.1 |
| **Notificação de chantagem** ("sua ofensiva vai morrer!") | Fere o tom; é o que faz desinstalar |
| **Roda da sorte / recompensa aleatória** | Mecânica de cassino. Não combina com bem-estar |

---

## 9. Como saber se funcionou

Aqui há uma limitação honesta: **não temos analytics** (decisão §0: zero
rastreamento) e não vamos ter. Então não haverá número de retenção D7.

O que dá para fazer sem trair a privacidade:

- **Um painel local em Ajustes**, só para você: dias usados, maior ofensiva,
  missões cumpridas, elementos desbloqueados. Dados do próprio aparelho, para o
  dono do app avaliar o desenho na prática.
- **Teste com 5–10 pessoas reais** por duas semanas, com conversa no fim. Para um
  app sem telemetria, é a única leitura honesta.
- O sinal de que a G1 funcionou: as pessoas descreverem o app como "tenho umas
  tarefinhas do dia" em vez de "tenho que anotar água".
