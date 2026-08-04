import { Snowflake } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { tokens } from '@/design/tokens';
import type { DaySlot } from '@/domain/history';
import { weekdayFull, weekdayShort } from '@/domain/history';
import { formatVolume } from '@/lib/format';
import { dayKey } from '@/lib/date';

const ALTURA = 132;

type Props = {
  slots: DaySlot[];
};

/**
 * Barras da **semana do calendário**, de segunda a domingo.
 *
 * Trilha cinza, barra azul, verde só nos dias que bateram a meta (§5.4). A altura é
 * proporção da meta **daquele** dia, não da meta atual.
 *
 * Dias que passaram da meta não ganham marca nenhuma: a barra satura em 100%. É
 * deliberado — o §3 do PLANO-GAMIFICACAO proíbe premiar quem excede, e destacar o
 * excesso aqui seria fazer exatamente isso.
 */
export function WeekBars({ slots }: Props) {
  const hoje = dayKey();

  return (
    <View className="flex-row items-end justify-between gap-1.5" style={{ height: ALTURA + 34 }}>
      {slots.map((slot) => {
        const ehHoje = slot.date === hoje;
        const preenchido = Math.min(1, slot.ratio);
        const cor = slot.metGoal ? tokens.meta : tokens.agua;

        return (
          <View
            key={slot.date}
            className="flex-1 items-center gap-1.5"
            accessible
            accessibilityLabel={
              slot.future
                ? `${weekdayFull(slot.date)}: ainda não chegou`
                : slot.restDay && slot.empty
                  ? `${weekdayFull(slot.date)}: dia livre`
                  : slot.empty
                    ? `${weekdayFull(slot.date)}: sem registro`
                    : `${weekdayFull(slot.date)}: ${formatVolume(slot.hydrationMl)} de ${formatVolume(slot.goalMl)}${
                        slot.restDay ? ', dia livre' : ''
                      }${slot.metGoal ? ', meta batida' : ''}`
            }>
            <View
              className="w-full justify-end overflow-hidden rounded-lg"
              style={{
                height: ALTURA,
                /**
                 * A trilha fraca é do dia **futuro**, não do dia sem registro.
                 *
                 * Antes o critério era `empty`, e isso apagava dias que a pessoa
                 * realmente não bebeu — informação que ela precisa ver. Numa semana de
                 * calendário, quem merece o tom leve é o dia que ainda não chegou: ele
                 * não é uma falha, é um dia que não existe ainda.
                 */
                backgroundColor: slot.future ? tokens.linhaSutil : tokens.linha,
              }}>
              {preenchido > 0 && (
                <View
                  style={{
                    height: Math.max(6, preenchido * ALTURA),
                    backgroundColor: cor,
                  }}
                />
              )}

              {/* Dia livre e sem registro leva o floco — o **mesmo ícone** do card
                  "Dia livre" nos Ajustes, para o usuário ligar as duas telas sem
                  legenda.

                  Aqui a marca pode ser um ícone porque a trilha vazia tem 132pt de
                  altura. No calendário do mês a célula tem ~40pt e o número do dia é
                  dela, então lá a marca é a cor de fundo. Tratamentos diferentes pelo
                  espaço disponível, não por descuido. */}
              {slot.restDay && slot.empty && !slot.future && (
                <View className="absolute inset-0 items-center justify-center">
                  {/* `textoSoft` e não `textoOff`: em #AFAFAF sobre a trilha #E5E5E5 o
                      floco dava 1,75 de contraste e mal se via. Em #777777 sobe para
                      3,6 — lido sem virar destaque, que é o papel dele aqui. */}
                  <Snowflake size={20} color={tokens.textoSoft} strokeWidth={2.4} />
                </View>
              )}
            </View>

            {/* Hoje ganha pastilha, não só cor: mudança de cor sozinha some para quem
                não distingue tons, e é a única pista de onde a semana está.

                O `px-1` é apertado de propósito. Com `px-2`, os 16pt de padding
                comiam quase metade dos ~36pt da coluna no iPhone SE, e "seg" com a
                escala tipográfica nova quebrava em duas linhas ("se" / "g"). Encurtar
                para duas letras não era saída: "seg"/"sex" e "qua"/"qui" colidiriam.

                `numberOfLines={1}` é a garantia — mesmo que alguém aumente a fonte ou
                troque a abreviação, o rótulo nunca volta a quebrar linha. */}
            <View
              className={`items-center justify-center rounded-pill px-1 py-0.5 ${
                ehHoje ? 'bg-agua-tint' : ''
              }`}>
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                className={`text-sm ${
                  ehHoje
                    ? 'font-displayBold text-agua'
                    : `font-display ${slot.future ? 'text-texto-off' : 'text-texto-soft'}`
                }`}>
                {weekdayShort(slot.date)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
