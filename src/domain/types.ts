// Modelo de domínio do §3 do docs/PLANO-BEBA-AGUA.md.
// Tudo é armazenado em ml; `oz` é só formatação (§4.3).

export type Unit = 'ml' | 'oz';
export type Activity = 'baixa' | 'media' | 'alta';
export type Climate = 'temperado' | 'quente';

export interface Profile {
  weightKg: number; // 30–250
  activity: Activity;
  climate: Climate;
  wakeMinutes: number; // minutos desde 00:00, ex. 7*60
  sleepMinutes: number;
  unit: Unit;
}

export interface Drink {
  id: string;
  name: string;
  icon: string; // nome do ícone lucide
  tint: string; // token de cor
  hydration: number; // fator de hidratação, ver §4.2
  defaultMl: number;
  custom?: boolean;
}

export interface Entry {
  id: string;
  at: number; // epoch ms, hora local do registro
  drinkId: string;
  volumeMl: number; // o que foi bebido
  hydrationMl: number; // volumeMl * hydration, arredondado
}

export interface DayLog {
  date: string; // 'YYYY-MM-DD' local, dia lógico
  goalMl: number; // meta congelada no dia
  entries: Entry[];
  totalHydrationMl: number; // derivado, mantido para leitura rápida
  metGoal: boolean;
}

export interface Gamification {
  streak: number;
  bestStreak: number;
  lastMetDate: string | null;
  freezesAvailable: number; // ver §7.1
  xp: number;
  unlocked: string[]; // ids de conquistas
}
