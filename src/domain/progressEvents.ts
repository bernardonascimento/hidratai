import type { Achievement } from './achievements';
import type { GardenElement } from './garden';
import { levelFromXp } from './goal';
import { stageForLevel } from './levels';

/**
 * Eventos de progressão que merecem comemoração dentro do app.
 *
 * São três, e todos têm em comum ser **conquista do usuário**, não informação de
 * sistema: subir de nível, ganhar conquista e desbloquear item do Cantinho. Bater a
 * meta já tem a `Celebration` de tela cheia e não entra aqui — dois festejos para o
 * mesmo toque seria ruído.
 */
export type VictoryEvent = {
  /** Só para escolher o ícone e para teste; o texto já vem pronto. */
  origem: 'nivel' | 'conquista' | 'cantinho';
  titulo: string;
  detalhe: string;
  /** Nome do ícone lucide, resolvido na UI. */
  icone: string;
};

/**
 * Subiu de nível?
 *
 * Compara o nível **derivado** do XP antes e depois. Não guarda "último nível visto":
 * o nível é função pura do XP, então derivar dos dois valores não pode divergir do que
 * a tela mostra — e desfazer um registro devolve XP, o que faria um "último visto"
 * persistido ficar à frente da realidade.
 */
export function levelUpEvent(xpAntes: number, xpDepois: number): VictoryEvent | null {
  const antes = levelFromXp(xpAntes);
  const depois = levelFromXp(xpDepois);
  if (depois <= antes) return null;

  const estagio = stageForLevel(depois);
  const estagioAntes = stageForLevel(antes);
  // Trocar de estágio é mais raro que subir de nível, então ganha o texto melhor.
  const mudouEstagio = estagio.id !== estagioAntes.id;

  return {
    origem: 'nivel',
    titulo: mudouEstagio ? `Agora você é ${estagio.name}!` : `Nível ${depois}!`,
    detalhe: mudouEstagio ? `Nível ${depois} alcançado` : `Continue assim`,
    icone: mudouEstagio ? 'sparkles' : 'trending-up',
  };
}

/**
 * Quais conquistas são **novidade** em relação ao que já foi comemorado.
 *
 * As conquistas são derivadas do histórico e não têm lista de `unlocked` persistida —
 * decisão do §7.3, para não haver estado divergindo dos dados. O preço é que não existe
 * "o instante" em que uma é ganha: a cada render ela simplesmente já está lá.
 *
 * `jaVistas` é a única coisa que se guarda, e guarda **só o que já foi anunciado**, não
 * o que está desbloqueado. A derivação continua sendo a fonte da verdade; esta lista é
 * memória do aviso.
 *
 * `jaVistas === null` significa "nunca foi calculado" — é o caso de quem já usava o app
 * antes desta feature. Aí não se anuncia nada: seria despejar dez avisos de uma vez por
 * coisas conquistadas semanas atrás.
 */
export function newAchievements(
  atuais: Achievement[],
  jaVistas: string[] | null,
): Achievement[] {
  const desbloqueadas = atuais.filter((c) => c.unlocked);
  // `== null` cobre o `undefined` de um estado persistido que não tinha esta chave.
  if (jaVistas == null) return [];

  const vistas = new Set(jaVistas);
  return desbloqueadas.filter((c) => !vistas.has(c.id));
}

/** Todos os ids desbloqueados agora — o que gravar como "já visto". */
export function unlockedIds(atuais: Achievement[]): string[] {
  return atuais.filter((c) => c.unlocked).map((c) => c.id);
}

export function achievementEvent(conquista: Achievement): VictoryEvent {
  return {
    origem: 'conquista',
    titulo: `Conquista: ${conquista.title}`,
    detalhe: conquista.criterion,
    icone: conquista.icon,
  };
}

export function gardenEvent(elemento: GardenElement): VictoryEvent {
  return {
    origem: 'cantinho',
    titulo: `${elemento.name} no Cantinho!`,
    detalhe: 'A Gotinha ganhou companhia',
    icone: 'sprout',
  };
}
