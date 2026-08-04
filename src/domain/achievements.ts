import { previousDay } from '@/lib/date';

import type { DayLog } from './types';

export type Achievement = {
  id: string;
  title: string;
  /** Critério em uma linha, mostrado ao tocar. */
  criterion: string;
  /** Nome do ícone lucide (mapeado na UI). */
  icon: string;
  unlocked: boolean;
  /** 0..1 quando dá para mostrar o quanto falta. */
  progress?: number;
};

/** Dias no mês civil de uma chave 'YYYY-MM'. */
function diasNoMes(mes: string): number {
  const [ano, m] = mes.split('-').map(Number);
  return new Date(ano, m, 0).getDate();
}

function proximoDia(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const p = new Date(y, m - 1, d + 1);
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}-${String(p.getDate()).padStart(2, '0')}`;
}

type Resumo = {
  registros: number;
  hidratacaoMl: number;
  metasBatidas: number;
  metaAntesMeioDia: boolean;
  registroNoturno: boolean;
  /** Dias com pelo menos um registro antes das 9h. */
  manhas: Set<string>;
  /** Dias com meta batida, para as contas de sequência. */
  comMeta: Set<string>;
  /** 'YYYY-MM' -> quantos dias daquele mês bateram a meta. */
  metasPorMes: Map<string, number>;
};

/**
 * **Uma varredura só** sobre todo o histórico.
 *
 * A versão anterior fazia quatro: `allEntries` duas vezes, mais uma passada para as
 * bebidas distintas e outra para as manhãs — e cada uma criava `Date` por registro. Com
 * três anos de uso são ~10 mil registros percorridos várias vezes a cada render da tela
 * de Conquistas. Aqui tudo sai de um `for` por dia e um por registro.
 */
function resumir(days: Record<string, DayLog>): Resumo {
  const r: Resumo = {
    registros: 0,
    hidratacaoMl: 0,
    metasBatidas: 0,
    metaAntesMeioDia: false,
    registroNoturno: false,
    manhas: new Set(),
    comMeta: new Set(),
    metasPorMes: new Map(),
  };

  for (const dia of Object.values(days)) {
    r.hidratacaoMl += dia.totalHydrationMl;

    if (dia.metGoal) {
      r.metasBatidas += 1;
      r.comMeta.add(dia.date);
      const mes = dia.date.slice(0, 7);
      r.metasPorMes.set(mes, (r.metasPorMes.get(mes) ?? 0) + 1);
    }

    // Ordenar só quando pode render a conquista da meta antes do meio-dia.
    const precisaAcumular = dia.metGoal && !r.metaAntesMeioDia;
    const entradas = precisaAcumular ? [...dia.entries].sort((a, b) => a.at - b.at) : dia.entries;
    let acumulado = 0;

    for (const e of entradas) {
      r.registros += 1;
      const hora = new Date(e.at).getHours();

      if (hora < 9) r.manhas.add(dia.date);
      // Dia lógico vira às 03:00, então "noturno" vai das 22h às 3h — e as horas
      // pequenas ainda pertencem ao dia anterior.
      if (hora >= 22 || hora < 3) r.registroNoturno = true;

      if (precisaAcumular) {
        acumulado += e.hydrationMl;
        if (acumulado >= dia.goalMl && hora < 12) r.metaAntesMeioDia = true;
      }
    }
  }

  return r;
}

/** Maior sequência de dias consecutivos presentes num conjunto de datas. */
function maiorSequencia(datas: Set<string>): number {
  let melhor = 0;
  for (const date of datas) {
    // Só conta a partir do início de uma sequência.
    if (datas.has(previousDay(date))) continue;
    let tamanho = 0;
    let cursor = date;
    while (datas.has(cursor)) {
      tamanho += 1;
      cursor = proximoDia(cursor);
    }
    melhor = Math.max(melhor, tamanho);
  }
  return melhor;
}

/**
 * Voltou a bater a meta depois de pelo menos uma semana sem bater.
 *
 * Existe por causa da regra de nunca culpar (§10): quem desanda e volta merece marca,
 * e é justamente nesse momento que uma pessoa decide se continua ou desinstala.
 */
function teveRetomada(comMeta: Set<string>): boolean {
  const ordenadas = [...comMeta].sort();
  for (let i = 1; i < ordenadas.length; i += 1) {
    const [ay, am, ad] = ordenadas[i - 1].split('-').map(Number);
    const [by, bm, bd] = ordenadas[i].split('-').map(Number);
    const dias = Math.round(
      (new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86_400_000,
    );
    if (dias >= 8) return true;
  }
  return false;
}

/** Algum mês civil **fechado** com a meta batida todos os dias. */
function temMesRedondo(metasPorMes: Map<string, number>, hoje: string): boolean {
  const mesCorrente = hoje.slice(0, 7);
  for (const [mes, batidas] of metasPorMes) {
    // O mês em curso não conta: ele ainda pode ser completado ou perdido.
    if (mes >= mesCorrente) continue;
    if (batidas >= diasNoMes(mes)) return true;
  }
  return false;
}

function ratio(atual: number, alvo: number): number {
  return Math.min(1, alvo > 0 ? atual / alvo : 0);
}

/** Litros inteiros, para o texto do critério não repetir a conversão. */
const LITRO = 1000;

export type AchievementsInput = {
  days: Record<string, DayLog>;
  /**
   * **Recorde**, não a ofensiva atual.
   *
   * Com `streak` corrente, quem chegava a 30 dias e perdia a sequência via a conquista
   * **voltar para cinza** — o app tirava de volta algo já conquistado, o oposto da regra
   * de nunca punir. `bestStreak` nunca diminui, e é por isso que ele existe.
   */
  bestStreak: number;
  /** Elementos do Cantinho já desbloqueados, para as duas conquistas de cenário. */
  gardenUnlocked: string[];
  /** Quantos elementos o Cantinho tem no total. */
  gardenTotal: number;
  /** Dia lógico corrente — o mês em curso não conta para "mês redondo". */
  hoje: string;
};

/**
 * As conquistas são **derivadas dos dados**, não persistidas: não há lista de
 * `unlocked` para migrar nem risco de o estado divergir do histórico.
 *
 * Todos os critérios usam só água e horário, porque é só isso que o app registra. Duas
 * conquistas antigas — "Variedade" (cinco bebidas diferentes num dia) e "Do seu jeito"
 * (criar bebida personalizada) — eram **inalcançáveis**: o catálogo tem uma bebida e
 * nenhum código cria `drinkId` personalizado. Ficavam cinza para sempre, prometendo um
 * app que não existe.
 *
 * A escada é longa de propósito. As anteriores terminavam em 100 dias de ofensiva e 500
 * registros, teto que um usuário dedicado alcança em uns quatro meses — depois disso a
 * tela nunca mudava mais. Agora há marcos de anos (365 dias, 2000 registros, mil litros)
 * e marcos que **não** dependem de sequência (metas no total, litros, retomada), para
 * quem bebe de forma irregular também ter o que ganhar.
 */
export function achievementsOf(input: AchievementsInput): Achievement[] {
  const { days, bestStreak, gardenUnlocked, gardenTotal, hoje } = input;
  const r = resumir(days);
  const manhasSeguidas = maiorSequencia(r.manhas);
  const sequenciaLimpa = maiorSequencia(r.comMeta);
  const litros = r.hidratacaoMl / LITRO;
  const doCantinho = gardenUnlocked.length;

  return [
    // ---- Registros ----
    {
      id: 'primeiro-registro',
      title: 'Primeiro copo',
      criterion: 'Registrar o primeiro copo',
      icon: 'droplet',
      unlocked: r.registros >= 1,
      progress: ratio(r.registros, 1),
    },
    {
      id: 'registros-100',
      title: '100 copos',
      criterion: 'Registrar 100 copos',
      icon: 'target',
      unlocked: r.registros >= 100,
      progress: ratio(r.registros, 100),
    },
    {
      id: 'registros-500',
      title: '500 copos',
      criterion: 'Registrar 500 copos',
      icon: 'medal',
      unlocked: r.registros >= 500,
      progress: ratio(r.registros, 500),
    },
    {
      id: 'registros-2000',
      title: '2000 copos',
      criterion: 'Registrar 2000 copos',
      icon: 'gem',
      unlocked: r.registros >= 2000,
      progress: ratio(r.registros, 2000),
    },

    // ---- Ofensiva (pelo recorde, nunca pela sequência atual) ----
    {
      id: 'streak-3',
      title: '3 dias',
      criterion: 'Bater a meta 3 dias seguidos',
      icon: 'flame',
      unlocked: bestStreak >= 3,
      progress: ratio(bestStreak, 3),
    },
    {
      id: 'streak-7',
      title: '1 semana',
      // Não `flame` de novo: "3 dias" já usa, e dois blocos com o mesmo ícone não se
      // distinguem na grade. `zap` mantém a ideia de sequência com desenho próprio.
      criterion: 'Bater a meta 7 dias seguidos',
      icon: 'zap',
      unlocked: bestStreak >= 7,
      progress: ratio(bestStreak, 7),
    },
    {
      id: 'streak-14',
      title: '2 semanas',
      criterion: 'Bater a meta 14 dias seguidos',
      icon: 'calendar-check',
      unlocked: bestStreak >= 14,
      progress: ratio(bestStreak, 14),
    },
    {
      id: 'streak-30',
      title: '30 dias',
      criterion: 'Bater a meta 30 dias seguidos',
      icon: 'trophy',
      unlocked: bestStreak >= 30,
      progress: ratio(bestStreak, 30),
    },
    {
      id: 'streak-100',
      title: '100 dias',
      criterion: 'Bater a meta 100 dias seguidos',
      icon: 'award',
      unlocked: bestStreak >= 100,
      progress: ratio(bestStreak, 100),
    },
    {
      id: 'streak-365',
      title: '1 ano',
      criterion: 'Bater a meta 365 dias seguidos',
      icon: 'crown',
      unlocked: bestStreak >= 365,
      progress: ratio(bestStreak, 365),
    },

    // ---- Metas no total. Não exigem sequência: quem bebe de forma irregular
    //      também precisa ter o que ganhar, ou a tela vira exclusividade de quem
    //      nunca falha.
    {
      id: 'metas-10',
      title: '10 metas',
      criterion: 'Bater a meta em 10 dias, seguidos ou não',
      icon: 'star',
      unlocked: r.metasBatidas >= 10,
      progress: ratio(r.metasBatidas, 10),
    },
    {
      id: 'metas-50',
      title: '50 metas',
      criterion: 'Bater a meta em 50 dias, seguidos ou não',
      icon: 'sparkles',
      unlocked: r.metasBatidas >= 50,
      progress: ratio(r.metasBatidas, 50),
    },
    {
      id: 'metas-200',
      title: '200 metas',
      criterion: 'Bater a meta em 200 dias, seguidos ou não',
      icon: 'mountain',
      unlocked: r.metasBatidas >= 200,
      progress: ratio(r.metasBatidas, 200),
    },

    // ---- Volume acumulado ----
    {
      id: 'litros-100',
      title: '100 litros',
      criterion: 'Beber 100 litros no total',
      icon: 'glass-water',
      unlocked: litros >= 100,
      progress: ratio(litros, 100),
    },
    {
      id: 'litros-500',
      title: '500 litros',
      criterion: 'Beber 500 litros no total',
      icon: 'waves',
      unlocked: litros >= 500,
      progress: ratio(litros, 500),
    },
    {
      id: 'litros-1000',
      title: 'Mil litros',
      criterion: 'Beber mil litros no total',
      icon: 'droplets',
      unlocked: litros >= 1000,
      progress: ratio(litros, 1000),
    },

    // ---- Horário ----
    {
      id: 'meta-antes-meio-dia',
      title: 'Madrugador',
      criterion: 'Bater a meta antes do meio-dia',
      icon: 'sunrise',
      unlocked: r.metaAntesMeioDia,
    },
    {
      id: 'sete-manhas',
      title: 'Sete manhãs',
      criterion: 'Beber antes das 9h por 7 dias seguidos',
      icon: 'coffee',
      unlocked: manhasSeguidas >= 7,
      progress: ratio(manhasSeguidas, 7),
    },
    {
      id: 'registro-noturno',
      title: 'Coruja',
      criterion: 'Registrar um copo depois das 22h',
      icon: 'moon',
      unlocked: r.registroNoturno,
    },

    // ---- Consistência ----
    {
      id: 'semana-cheia',
      title: 'Semana cheia',
      /**
       * Agora o critério é **de verdade**. Antes era `streak >= 7`, idêntico a
       * "1 semana": duas conquistas desbloqueavam no mesmo instante e uma delas
       * prometia por escrito algo que o código não checava.
       *
       * A diferença real: a ofensiva aceita dia congelado, esta não. Sete dias
       * consecutivos **todos** com a meta batida no histórico.
       */
      criterion: 'Sete dias seguidos batendo a meta, sem congelamento',
      icon: 'shield',
      unlocked: sequenciaLimpa >= 7,
      progress: ratio(sequenciaLimpa, 7),
    },
    {
      id: 'mes-redondo',
      title: 'Mês redondo',
      criterion: 'Bater a meta todos os dias de um mês',
      icon: 'calendar-days',
      unlocked: temMesRedondo(r.metasPorMes, hoje),
    },
    {
      id: 'retomada',
      title: 'De volta',
      criterion: 'Bater a meta depois de uma semana sem bater',
      icon: 'rotate-ccw',
      unlocked: teveRetomada(r.comMeta),
    },

    // ---- Cantinho ----
    {
      id: 'cantinho-metade',
      title: 'Cantinho vivo',
      criterion: 'Desbloquear metade do Cantinho',
      icon: 'sprout',
      unlocked: gardenTotal > 0 && doCantinho >= Math.ceil(gardenTotal / 2),
      progress: ratio(doCantinho, Math.max(1, Math.ceil(gardenTotal / 2))),
    },
    {
      id: 'cantinho-completo',
      title: 'Cantinho completo',
      criterion: 'Desbloquear todo o Cantinho',
      icon: 'flower',
      unlocked: gardenTotal > 0 && doCantinho >= gardenTotal,
      progress: ratio(doCantinho, Math.max(1, gardenTotal)),
    },
  ];
}

/** Quantas conquistas existem — usado pelo cabeçalho da tela e pelos testes. */
export const ACHIEVEMENTS_COUNT = 24;
