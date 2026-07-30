import type { DayLog, Entry } from './types';

export type MissionId =
  | 'dia-completo'
  | 'bom-dia'
  | 'ao-longo-do-dia'
  | 'depois-do-almoco'
  | 'antes-de-dormir'
  | 'sem-pressa'
  | 'constante';

export type MissionContext = {
  day?: DayLog;
  /** Dia lógico anterior — só a missão "constante" usa. */
  previousDay?: DayLog;
};

export type MissionDef = {
  id: MissionId;
  title: string;
  /** Uma linha, sem promessa de volume. */
  description: string;
  /** Nome do ícone lucide, resolvido na UI. */
  icon: string;
  xp: number;
  isDone: (ctx: MissionContext) => boolean;
};

/** Bônus por cumprir as três do dia. */
export const XP_DIA_PERFEITO = 20;

/** Sempre presente: a meta é a âncora do dia. */
export const MISSAO_ANCORA: MissionId = 'dia-completo';

function horas(entries: Entry[]): number[] {
  return entries.map((e) => new Date(e.at).getHours());
}

/**
 * Pool de missões. **Nenhuma pede volume** — todas falam de horário e
 * distribuição (regra §3.2 do PLANO-GAMIFICACAO). Recompensar volume acima da
 * meta seria incentivar excesso, que faz mal.
 */
export const MISSIONS: Record<MissionId, MissionDef> = {
  'dia-completo': {
    id: 'dia-completo',
    title: 'Dia completo',
    description: 'Bata sua meta de hoje',
    icon: 'target',
    xp: 25,
    isDone: ({ day }) => day?.metGoal === true,
  },
  'bom-dia': {
    id: 'bom-dia',
    title: 'Bom dia',
    description: 'Primeiro copo antes das 9h',
    icon: 'sunrise',
    xp: 15,
    isDone: ({ day }) => horas(day?.entries ?? []).some((h) => h < 9),
  },
  'ao-longo-do-dia': {
    id: 'ao-longo-do-dia',
    title: 'Ao longo do dia',
    description: 'Quatro registros ou mais',
    icon: 'clock',
    xp: 20,
    isDone: ({ day }) => (day?.entries.length ?? 0) >= 4,
  },
  'depois-do-almoco': {
    id: 'depois-do-almoco',
    title: 'Depois do almoço',
    description: 'Um copo entre 13h e 15h',
    icon: 'utensils',
    xp: 15,
    isDone: ({ day }) => horas(day?.entries ?? []).some((h) => h >= 13 && h < 15),
  },
  'antes-de-dormir': {
    id: 'antes-de-dormir',
    title: 'Fim de tarde',
    description: 'Um copo depois das 20h',
    icon: 'moon',
    xp: 15,
    isDone: ({ day }) => horas(day?.entries ?? []).some((h) => h >= 20),
  },
  'sem-pressa': {
    id: 'sem-pressa',
    title: 'Sem pressa',
    description: 'Beba em manhã, tarde e noite',
    icon: 'waves',
    xp: 20,
    isDone: ({ day }) => {
      const hs = horas(day?.entries ?? []);
      const manha = hs.some((h) => h < 12);
      const tarde = hs.some((h) => h >= 12 && h < 18);
      const noite = hs.some((h) => h >= 18);
      return manha && tarde && noite;
    },
  },
  constante: {
    id: 'constante',
    title: 'Constante',
    description: 'Meta batida hoje e ontem',
    icon: 'flame',
    xp: 25,
    isDone: ({ day, previousDay }) => day?.metGoal === true && previousDay?.metGoal === true,
  },
};

const SORTEAVEIS: MissionId[] = [
  'bom-dia',
  'ao-longo-do-dia',
  'depois-do-almoco',
  'antes-de-dormir',
  'sem-pressa',
  'constante',
];

/** Hash estável da data: o mesmo dia sorteia sempre as mesmas missões. */
function hashDaData(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i += 1) {
    h = (h * 31 + date.charCodeAt(i)) % 100000;
  }
  return h;
}

/**
 * As três missões de um dia: a âncora mais duas sorteadas.
 *
 * O sorteio é **determinístico pela data** — nada de `Math.random`, para as
 * missões não trocarem a cada render nem a cada reabertura do app. Evita repetir
 * as de ontem; se isso não deixar candidatas suficientes, relaxa a restrição em
 * vez de devolver menos de três.
 */
export function missionsForDay(date: string, previousIds: MissionId[] = []): MissionId[] {
  const evitar = new Set(previousIds);
  let candidatas = SORTEAVEIS.filter((id) => !evitar.has(id));
  if (candidatas.length < 2) candidatas = [...SORTEAVEIS];

  const h = hashDaData(date);
  const primeira = candidatas[h % candidatas.length];
  const resto = candidatas.filter((id) => id !== primeira);
  const segunda = resto[(h >> 3) % resto.length];

  return [MISSAO_ANCORA, primeira, segunda];
}

export type MissionStatus = MissionDef & { done: boolean };

/** Estado das missões, **derivado dos registros** — nunca persistido. */
export function missionStatus(ids: MissionId[], ctx: MissionContext): MissionStatus[] {
  return ids.map((id) => {
    const def = MISSIONS[id];
    return { ...def, done: def.isDone(ctx) };
  });
}

/** XP das missões cumpridas, mais o bônus se as três saíram. */
export function missionsXp(status: MissionStatus[]): number {
  const ganho = status.filter((m) => m.done).reduce((soma, m) => soma + m.xp, 0);
  const todas = status.length > 0 && status.every((m) => m.done);
  return ganho + (todas ? XP_DIA_PERFEITO : 0);
}

export function isDiaPerfeito(status: MissionStatus[]): boolean {
  return status.length > 0 && status.every((m) => m.done);
}
