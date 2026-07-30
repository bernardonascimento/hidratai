import { create } from 'zustand';

import { dayKey } from '@/lib/date';

/**
 * O dia lógico corrente, de forma **reativa**.
 *
 * Existe porque `dayKey()` chamado dentro de um seletor do Zustand não é reativo: o
 * seletor só roda de novo quando o estado da store muda. Com o app aberto durante a
 * virada das 03:00, nada muda em `useWater` — então as telas seguiam mostrando o dia
 * anterior até o primeiro registro. Era o bug de "o dia não mudou".
 *
 * Sem `persist`: é valor derivado do relógio, e ler do disco um dia velho seria pior
 * que recalcular.
 */
type LogicalDayState = {
  today: string;
  /** Recalcula. Devolve `true` se o dia virou de fato. */
  refresh: () => boolean;
};

export const useLogicalDay = create<LogicalDayState>()((set, get) => ({
  today: dayKey(),
  refresh: () => {
    const atual = dayKey();
    if (get().today === atual) return false;
    set({ today: atual });
    return true;
  },
}));
