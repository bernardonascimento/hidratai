import type { Achievement } from '@/domain/achievements';
import { GARDEN_ELEMENTS } from '@/domain/garden';
import { xpForLevel } from '@/domain/goal';
import {
  achievementEvent,
  gardenEvent,
  levelUpEvent,
  newAchievements,
  unlockedIds,
} from '@/domain/progressEvents';

function conquista(id: string, unlocked: boolean): Achievement {
  return { id, title: id, criterion: `crit ${id}`, icon: 'star', unlocked };
}

describe('levelUpEvent', () => {
  it('não gera evento quando o nível não muda', () => {
    expect(levelUpEvent(0, 50)).toBeNull();
    expect(levelUpEvent(500, 560)).toBeNull();
  });

  it('gera evento ao cruzar o limiar do nível', () => {
    const evento = levelUpEvent(xpForLevel(3) - 1, xpForLevel(3));
    expect(evento).not.toBeNull();
    expect(evento?.origem).toBe('nivel');
  });

  it('nunca gera evento ao perder XP', () => {
    // Desfazer um registro devolve XP. Comemorar aí seria absurdo, e é por isso que a
    // comparação é `depois <= antes` e não `!==`.
    expect(levelUpEvent(xpForLevel(5), xpForLevel(3))).toBeNull();
  });

  it('dá texto diferente quando o estágio muda', () => {
    // Nível 3 é onde começa "Poça"; do 3 para o 4 continua no mesmo estágio.
    const trocaEstagio = levelUpEvent(xpForLevel(2), xpForLevel(3));
    const mesmoEstagio = levelUpEvent(xpForLevel(3), xpForLevel(4));

    expect(trocaEstagio?.titulo).toContain('Poça');
    expect(mesmoEstagio?.titulo).not.toContain('Poça');
    expect(mesmoEstagio?.titulo).toContain('4');
  });
});

describe('newAchievements', () => {
  const lista = [conquista('a', true), conquista('b', true), conquista('c', false)];

  it('não anuncia nada na primeira vez', () => {
    // `null` é "nunca calculado", o estado de quem já usava o app antes da feature.
    // Anunciar aqui despejaria dez avisos por coisas de semanas atrás.
    expect(newAchievements(lista, null)).toEqual([]);
  });

  it('anuncia só o que ainda não foi visto', () => {
    expect(newAchievements(lista, ['a']).map((c) => c.id)).toEqual(['b']);
  });

  it('não anuncia o que ainda está travado', () => {
    expect(newAchievements(lista, []).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('nada novo quando tudo já foi visto', () => {
    expect(newAchievements(lista, ['a', 'b'])).toEqual([]);
  });

  it('unlockedIds devolve só os abertos', () => {
    expect(unlockedIds(lista)).toEqual(['a', 'b']);
  });
});

describe('textos dos eventos', () => {
  it('a conquista leva o critério como detalhe', () => {
    const e = achievementEvent(conquista('sete-manhas', true));
    expect(e.origem).toBe('conquista');
    expect(e.detalhe).toBe('crit sete-manhas');
  });

  it('o item do Cantinho leva o nome do elemento', () => {
    const e = gardenEvent(GARDEN_ELEMENTS[0]);
    expect(e.origem).toBe('cantinho');
    expect(e.titulo).toContain(GARDEN_ELEMENTS[0].name);
  });

  it('nenhum texto usa emoji', () => {
    const todos = [
      levelUpEvent(xpForLevel(2), xpForLevel(3)),
      achievementEvent(conquista('x', true)),
      gardenEvent(GARDEN_ELEMENTS[0]),
    ];
    for (const e of todos) {
      expect(e?.titulo).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
      expect(e?.detalhe).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    }
  });
});
