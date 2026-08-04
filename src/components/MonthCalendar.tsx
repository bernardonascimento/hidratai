import { Text, View } from 'react-native';

import { tokens } from '@/design/tokens';
import type { DaySlot, MonthGrid } from '@/domain/history';
import { weekdayFull } from '@/domain/history';
import { dayKey } from '@/lib/date';
import { formatVolume } from '@/lib/format';

/** Cabeçalho das colunas, na mesma ordem da grade: segunda a domingo. */
const COLUNAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
/** Nomes completos das colunas, para o leitor de tela do cabeçalho. */
const COLUNAS_NOME = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

type Props = {
  grade: MonthGrid;
};

/**
 * O mês corrente como **calendário**, e não como fita de quadradinhos.
 *
 * O alinhamento por dia da semana é o que dá sentido à grade: dá para ver que os
 * buracos caem sempre no fim de semana, por exemplo. Sem ele, 31 quadrados em fila só
 * dizem "faltou em algum lugar".
 */
export function MonthCalendar({ grade }: Props) {
  const hoje = dayKey();
  const numeroDoDia = (date: string) => Number(date.slice(8));

  // Fatia em semanas de 7, com `null` nas colunas antes do dia 1 e depois do último.
  const linear: (DaySlot | null)[] = [
    ...Array.from<null>({ length: grade.offset }).fill(null),
    ...grade.slots,
  ];
  while (linear.length % 7 !== 0) linear.push(null);

  const semanas: (DaySlot | null)[][] = [];
  for (let i = 0; i < linear.length; i += 7) semanas.push(linear.slice(i, i + 7));

  return (
    <View className="gap-2">
      <View className="flex-row gap-1.5">
        {COLUNAS.map((letra, i) => (
          <View key={COLUNAS_NOME[i]} className="flex-1 items-center" accessibilityLabel={COLUNAS_NOME[i]}>
            <Text maxFontSizeMultiplier={1.2} className="font-displayBold text-sm text-texto-soft">
              {letra}
            </Text>
          </View>
        ))}
      </View>

      {/* Uma `View` por semana, com as células em `flex-1`.
          Não é `flex-wrap` com largura em porcentagem: 7 células de 13,1% mais os seis
          gaps de 6pt estouravam a largura útil, e a sétima coluna caía para a linha
          seguinte — o domingo ficava sempre vazio. Com `flex-1` a conta é exata em
          qualquer tela. */}
      {semanas.map((semana, iSemana) => (
        <View key={`semana-${iSemana}`} className="flex-row gap-1.5">
          {semana.map((slot, iCol) => {
            if (!slot) return <View key={`vazio-${iCol}`} className="flex-1" />;
            const ehHoje = slot.date === hoje;
            const dia = numeroDoDia(slot.date);

            /**
             * Dia livre **e** sem registro ganha o azul-véu mais claro em vez do cinza.
             *
             * É o mesmo raciocínio do dia futuro: o cinza `linha` é a marca de "não
             * bebeu", e usá-lo num domingo que a pessoa combinou de folgar transforma a
             * folga em dívida no calendário. O tom escolhido é `aguaVeuSuave` (#E4F5FE),
             * distante o bastante do dia com água — o mais fraco deles é o azul a 45% de
             * opacidade, que dá #99DBFB — para não parecer meio copo bebido.
             *
             * Dia livre **com** registro segue pintado normalmente: aí o volume é a
             * informação que importa, e a folga já não está em questão.
             */
            const livreVazio = slot.restDay && slot.empty && !slot.future;

            // Dia futuro fica só como contorno: não é falha, é dia que não chegou.
            const fundo = slot.future
              ? 'transparent'
              : livreVazio
                ? tokens.aguaVeuSuave
                : slot.empty
                  ? tokens.linha
                  : slot.metGoal
                    ? tokens.meta
                    : tokens.agua;

            // Sem água, o número tem de ler sobre cinza; com água, sobre a cor cheia.
            const corDoNumero = slot.future
              ? tokens.textoOff
              : slot.empty
                ? tokens.textoSoft
                : tokens.canvas;

            return (
              <View
                key={slot.date}
                accessible
                accessibilityLabel={
                  slot.future
                    ? `Dia ${dia}, ${weekdayFull(slot.date)}: ainda não chegou`
                    : livreVazio
                      ? `Dia ${dia}, ${weekdayFull(slot.date)}: dia livre`
                      : slot.empty
                        ? `Dia ${dia}, ${weekdayFull(slot.date)}: sem registro`
                        : `Dia ${dia}, ${weekdayFull(slot.date)}: ${formatVolume(slot.hydrationMl)}${
                            slot.restDay ? ', dia livre' : ''
                          }${slot.metGoal ? ', meta batida' : ''}`
                }
                className="flex-1 items-center justify-center rounded-lg"
                style={{
                  aspectRatio: 1,
                  backgroundColor: fundo,
                  /**
                   * A opacidade grada o dia parcial, mas nunca abaixo de 0,45: mais
                   * claro que isso e o número branco em cima deixa de ser legível.
                   */
                  opacity: slot.empty || slot.future ? 1 : 0.45 + Math.min(1, slot.ratio) * 0.55,
                  borderWidth: ehHoje ? 2 : slot.future ? 1 : 0,
                  borderColor: ehHoje ? tokens.aguaLip : tokens.linha,
                }}>
                <Text
                  maxFontSizeMultiplier={1.1}
                  className={`text-sm ${ehHoje ? 'font-displayBold' : 'font-display'}`}
                  style={{ color: corDoNumero }}>
                  {dia}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
