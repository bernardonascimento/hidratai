/**
 * Semeador de estado para as screenshots das lojas.
 *
 * Escreve direto no AsyncStorage do aparelho, em vez de patchear o app: nenhuma linha do
 * código de produção muda, então não existe o risco de um patch de captura escapar para
 * o commit.
 *
 * O estado é montado com as **mesmas regras do domínio** (meta congelada por dia,
 * `metGoal` derivado do total, XP com teto diário, uma gota por dia cumprido). Dado
 * incoerente apareceria na tela: ofensiva que não casa com o calendário, ou um Cantinho
 * com mais elementos do que as gotas pagariam.
 */

const HOJE = process.argv[2] ?? '2026-08-07';
const META = 3000;

// ── Histórico ───────────────────────────────────────────────────────────────────
// 63 dias. Os últimos 11 cumpridos (a ofensiva atual), com dois furos plantados mais
// atrás para o calendário não ficar artificialmente perfeito — um mês 100% verde não
// existe e cheira a screenshot montado.
const DIAS = 63;
const FUROS = new Set([14, 15, 27, 41, 42, 55]);

const diaDe = (offset) => {
  const d = new Date(`${HOJE}T12:00:00`);
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
};

const days = {};
let lifetimeMl = 0;
let diasCumpridos = 0;

for (let off = DIAS - 1; off >= 0; off--) {
  const date = diaDe(off);
  const furo = FUROS.has(off);

  // Hoje fica **em andamento**: 2,1 de 3,0 L. É o estado que a tela Hoje quer mostrar —
  // uma garrafa cheia demais não deixa ver que ela enche, e vazia não mostra nada.
  const alvoMl = off === 0 ? 2100 : furo ? 1500 : META + (off % 3) * 100;

  const entries = [];
  let acumulado = 0;
  let i = 0;
  const base = new Date(`${date}T07:30:00`).getTime();

  while (acumulado < alvoMl) {
    const ml = acumulado + 500 <= alvoMl ? 500 : acumulado + 300 <= alvoMl ? 300 : 200;
    acumulado += ml;
    entries.push({
      id: `${date}-${i}`,
      at: base + i * 55 * 60 * 1000, // ~55 min entre copos, dentro da janela acordado
      drinkId: 'agua',
      volumeMl: ml,
      hydrationMl: ml,
    });
    i++;
  }

  const metGoal = acumulado >= META;
  if (metGoal) diasCumpridos++;
  lifetimeMl += acumulado;

  days[date] = { date, goalMl: META, entries, totalHydrationMl: acumulado, metGoal };
}

// ── Ofensiva: contada do histórico, não inventada ───────────────────────────────
let streak = 0;
for (let off = 1; off <= DIAS; off++) {
  if (days[diaDe(off)]?.metGoal) streak++;
  else break;
}
let melhor = 0;
let corrente = 0;
for (let off = DIAS - 1; off >= 0; off--) {
  if (days[diaDe(off)]?.metGoal) { corrente++; melhor = Math.max(melhor, corrente); }
  else corrente = 0;
}

// ── XP: mesma conta do app (10/registro + 50 na meta, teto de 100/dia) ──────────
let xp = 0;
for (const d of Object.values(days)) {
  xp += Math.min(100, d.entries.length * 10 + (d.metGoal ? 50 : 0));
}
const xpHoje = Math.min(100, days[HOJE].entries.length * 10);

// ── Gotas: uma por dia cumprido, menos o que o Cantinho custou ──────────────────
// Custos lidos de src/domain/garden.ts.
// A soma tem de caber nos dias cumpridos: 56 dias pagam 56 gotas, e a primeira
// tentativa somava 69 — um Cantinho impossível, que o guarda abaixo pegou.
// Estes oito somam 39 e deixam 17 gotas, o suficiente para a tela mostrar um próximo
// alvo ao alcance em vez de um saldo zerado.
const ABERTOS = [
  ['muda', 1], ['grama', 2], ['pedrinhas', 3], ['planta', 4],
  ['poca', 5], ['cogumelo', 6], ['pedra', 8], ['flor', 10],
];
const gasto = ABERTOS.reduce((s, [, c]) => s + c, 0);
const drops = diasCumpridos - gasto;
if (drops < 0) throw new Error(`gotas negativas: ${diasCumpridos} cumpridos, ${gasto} gastos`);

const agua = {
  goalMl: META,
  days,
  lastDrinkId: 'agua',
  xp,
  streak,
  lastMetDate: days[diaDe(1)]?.metGoal ? diaDe(1) : null,
};

// As versões têm de acompanhar as constantes das stores (`WATER_VERSION`,
// `PROFILE_VERSION`, `GAMIFICATION_VERSION`). Gravar uma versão velha faz o app rodar
// migração em cima de dado que já nasceu no formato novo — funciona, mas esconde erro:
// o estado semeado deixa de testar o caminho que o usuário real percorre.
const perfil = {
  profile: {
    weightKg: 78, activity: 'media', climate: 'temperado',
    wakeMinutes: 7 * 60, sleepMinutes: 23 * 60, unit: 'ml',
  },
  goalOverride: null,
  onboardingDone: true,
  reminders: { enabled: true, intervalMinutes: 90 },
};

const jogo = {
  xp, xpToday: xpHoje, xpTodayDate: HOJE,
  streak, bestStreak: melhor,
  lastMetDate: agua.lastMetDate,
  freezesAvailable: 1,
  freezesUsedOn: [],
  restDay: 0,                       // domingo livre, para aparecer marcado no calendário
  lifetimeMl,
  drops,
  lastDropDate: null,               // hoje ainda não bateu a meta
  gardenUnlocked: ABERTOS.map(([id]) => id),
  missionsDate: HOJE,
  missionIds: ['bom-dia', 'ao-longo-do-dia', 'dia-completo'],
  previousMissionIds: [],
  yesterdayMissionIds: [],
  resultShownFor: HOJE,             // não abrir o resumo de ontem em cima da captura
  seeded: true,
  achievementsSeen: [],             // vazio = nada de toast por cima da captura
};

const envelope = (state, version) => JSON.stringify({ state, version });

console.log(JSON.stringify({
  'beba-agua/v1': envelope(agua, 1),
  'hidratai/profile': envelope(perfil, 3),
  'hidratai/gamification': envelope(jogo, 1),
  'hidratai/settings': envelope({ hapticsEnabled: true, forceReducedMotion: false }, 1),
}));

console.error(`semeado: ${DIAS} dias, ${diasCumpridos} cumpridos, ofensiva ${streak} (melhor ${melhor}), ` +
  `xp ${xp}, ${(lifetimeMl / 1000).toFixed(1)} L na vida, ${drops} gotas sobrando, ` +
  `${ABERTOS.length} elementos abertos`);
