import { Text, View } from 'react-native';

import { tokens } from '@/design/tokens';
import type { MonthSlot } from '@/domain/history';
import { formatVolume } from '@/lib/format';

const MESES_CHEIOS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

type Props = {
  meses: MonthSlot[];
  /** Meta corrente, só para dar escala às barras. */
  goalMl: number;
  /** 'YYYY-MM' do mês em que estamos. */
  mesAtual: string;
};

/**
 * Média diária de cada mês do ano, de janeiro a dezembro.
 *
 * A barra é a média do mês contra a meta corrente — não o total, que faria fevereiro
 * parecer pior que janeiro só por ter menos dias.
 */
export function YearBars({ meses, goalMl, mesAtual }: Props) {
  return (
    <View className="gap-2.5">
      {meses.map((slot, i) => {
        const proporcao = goalMl > 0 ? Math.min(1, slot.averageMl / goalMl) : 0;
        const ehAtual = slot.month === mesAtual;
        const bateu = slot.averageMl >= goalMl && slot.daysTracked > 0;

        return (
          <View
            key={slot.month}
            className="flex-row items-center gap-3"
            accessible
            accessibilityLabel={
              slot.future
                ? `${MESES_CHEIOS[i]}: ainda não chegou`
                : slot.daysTracked === 0
                  ? `${MESES_CHEIOS[i]}: sem registro`
                  : `${MESES_CHEIOS[i]}: média de ${formatVolume(slot.averageMl)} em ${slot.daysTracked} dias`
            }>
            <Text
              maxFontSizeMultiplier={1.2}
              className={`w-10 text-sm ${
                ehAtual
                  ? 'font-displayBold text-agua'
                  : `font-display ${slot.future ? 'text-texto-off' : 'text-texto-soft'}`
              }`}>
              {slot.label}
            </Text>

            <View
              className="h-5 flex-1 overflow-hidden rounded-pill"
              style={{
                // Mês futuro fica quase invisível: ele não é um mês sem água.
                backgroundColor: slot.future ? tokens.linhaSutil : tokens.linha,
              }}>
              {proporcao > 0 && (
                <View
                  className="h-full rounded-pill"
                  style={{
                    width: `${Math.max(3, Math.round(proporcao * 100))}%`,
                    backgroundColor: bateu ? tokens.meta : tokens.agua,
                  }}
                />
              )}
            </View>

            <Text
              maxFontSizeMultiplier={1.2}
              className={`w-16 text-right text-sm ${
                ehAtual ? 'font-displayBold text-texto' : 'font-body text-texto-soft'
              }`}>
              {slot.daysTracked > 0 ? formatVolume(slot.averageMl) : '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
