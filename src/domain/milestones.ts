import type { DayLog } from './types';

export type Milestone = {
  id: string;
  label: string;
  /** Meta do marco, na unidade do próprio marco. */
  target: number;
  current: number;
  reached: boolean;
};

const LITROS = [10, 50, 100, 500, 1000];
const DIAS = [7, 30, 100, 365];
const REGISTROS = [50, 250, 1000];

function proximo(valores: number[], atual: number): number {
  return valores.find((v) => atual < v) ?? valores[valores.length - 1];
}

/**
 * Marcos de vida (§4.5): números que **só crescem**, para dar orgulho acumulado.
 * Diferente das conquistas, aqui não existe "perder" — nem apagando registros,
 * porque o litro bebido foi bebido.
 */
export function milestonesOf(input: {
  lifetimeMl: number;
  days: Record<string, DayLog>;
}): Milestone[] {
  const litros = input.lifetimeMl / 1000;
  const diasComRegistro = Object.values(input.days).filter((d) => d.entries.length > 0).length;
  const registros = Object.values(input.days).reduce((soma, d) => soma + d.entries.length, 0);

  const alvoLitros = proximo(LITROS, litros);
  const alvoDias = proximo(DIAS, diasComRegistro);
  const alvoRegistros = proximo(REGISTROS, registros);

  return [
    {
      id: 'litros',
      label: 'Litros na vida',
      target: alvoLitros,
      current: Math.floor(litros * 10) / 10,
      reached: litros >= LITROS[LITROS.length - 1],
    },
    {
      id: 'dias',
      label: 'Dias registrando',
      target: alvoDias,
      current: diasComRegistro,
      reached: diasComRegistro >= DIAS[DIAS.length - 1],
    },
    {
      id: 'registros',
      label: 'Copos registrados',
      target: alvoRegistros,
      current: registros,
      reached: registros >= REGISTROS[REGISTROS.length - 1],
    },
  ];
}

/** Texto de compartilhamento — sem link, sem dado pessoal além dos números. */
export function shareText(input: { lifetimeMl: number; streak: number; bestStreak: number }): string {
  const litros = (input.lifetimeMl / 1000).toFixed(1).replace('.', ',');
  const linhas = [
    `Já bebi ${litros} L de água com o Hidrataí.`,
    input.streak > 0
      ? `Estou há ${input.streak} ${input.streak === 1 ? 'dia' : 'dias'} seguidos na meta.`
      : `Meu recorde é ${input.bestStreak} ${input.bestStreak === 1 ? 'dia' : 'dias'} seguidos.`,
  ];
  return linhas.join(' ');
}
