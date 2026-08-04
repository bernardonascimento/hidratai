import { achievementsOf } from '@/domain/achievements';
import { GARDEN_ELEMENTS, type GardenElement } from '@/domain/garden';
import {
  achievementEvent,
  gardenEvent,
  levelUpEvent,
  type VictoryEvent,
  unlockedIds,
} from '@/domain/progressEvents';
import { dayKey } from '@/lib/date';
import { useGamification } from '@/store/useGamification';
import { useToast } from '@/store/useToast';
import { useWater } from '@/store/useWater';

/**
 * Junta os eventos de progressão e manda para o toast.
 *
 * Mora em `lib` e **lê as stores**, no mesmo arranjo de `lib/notifications.ts`: quem
 * chama é a tela, e nenhuma store importa este arquivo — importar fecharia um ciclo,
 * porque aqui se lê `useGamification` e `useWater`.
 *
 * Por que não dentro de `onEntryAdded`: a store de gamificação não conhece o histórico
 * completo nem as conquistas, e fazê-la conhecer significaria ela importar `useWater` e o
 * domínio de conquistas só para poder avisar. O gatilho é da tela porque é a tela que
 * sabe que houve um toque.
 */

/** Conquistas que são novidade agora, já marcando como comemoradas. */
function conquistasNovas(): VictoryEvent[] {
  const { days } = useWater.getState();
  const jogo = useGamification.getState();

  const lista = achievementsOf({
    days,
    bestStreak: jogo.bestStreak,
    gardenUnlocked: jogo.gardenUnlocked,
    gardenTotal: GARDEN_ELEMENTS.length,
    hoje: dayKey(),
  });

  const novas = jogo.registrarConquistasVistas(unlockedIds(lista));
  const porId = new Map(lista.map((c) => [c.id, c]));

  return novas
    .map((id) => porId.get(id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)
    .map(achievementEvent);
}

/**
 * Depois de registrar água: pode ter subido de nível e pode ter fechado conquista.
 *
 * A ordem dos eventos na fila é deliberada — nível primeiro, conquistas depois. Subir de
 * nível é consequência direta do toque que a pessoa acabou de dar, então é a notícia mais
 * próxima da ação; conquista é o marco maior e fica melhor como remate.
 */
export function celebrarRegistro(xp: { antes: number; depois: number }): void {
  const eventos: VictoryEvent[] = [];

  const nivel = levelUpEvent(xp.antes, xp.depois);
  if (nivel) eventos.push(nivel);

  eventos.push(...conquistasNovas());

  useToast.getState().celebrar(eventos);
}

/**
 * Depois de desbloquear item do Cantinho.
 *
 * Também checa conquistas, porque duas delas — "Cantinho vivo" e "Cantinho completo" —
 * dependem justamente desse desbloqueio. Sem isto, a conquista de completar o Cantinho só
 * apareceria no próximo copo de água.
 */
export function celebrarCantinho(elemento: GardenElement): void {
  useToast.getState().celebrar([gardenEvent(elemento), ...conquistasNovas()]);
}

/**
 * Marca o que já está desbloqueado **sem anunciar**.
 *
 * Chamado uma vez no boot. É o que impede a enxurrada de avisos em dois casos: quem já
 * usava o app antes desta feature, e quem preencheu dias no Histórico sem passar pela
 * tela Hoje.
 */
export function semearConquistasVistas(): void {
  // `!= null` cobre também o `undefined` de um estado persistido antigo.
  if (useGamification.getState().achievementsSeen != null) return;
  conquistasNovas();
}
