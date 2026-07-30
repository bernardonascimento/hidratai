import type { Activity, Climate } from './types';

/**
 * Rótulos de atividade e clima, em **um lugar só**.
 *
 * Estavam duplicados: o onboarding dizia "Parado / Ativo / Intenso" e os Ajustes
 * "Baixa / Média / Alta" para exatamente os mesmos valores. Quem configurava numa tela
 * e revia na outra via nomes diferentes para a mesma escolha.
 *
 * "Leve" no lugar de "Parado" também não é preciosismo: "parado" descreve **a pessoa**,
 * e o app tem regra explícita de nunca usar linguagem de culpa (§10 do plano). "Leve"
 * descreve a rotina, que é o que a pergunta quer saber.
 */
export const ACTIVITY_OPTIONS: { value: Activity; label: string }[] = [
  { value: 'baixa', label: 'Leve' },
  { value: 'media', label: 'Ativo' },
  { value: 'alta', label: 'Intenso' },
];

export const CLIMATE_OPTIONS: { value: Climate; label: string }[] = [
  { value: 'temperado', label: 'Ameno' },
  { value: 'quente', label: 'Quente' },
];
