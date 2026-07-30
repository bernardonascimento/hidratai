import { Minus, Plus } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Pressable3D } from '@/components/Pressable3D';
import { tokens } from '@/design/tokens';

type Props = {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (value: number) => string;
  /** Descrição para leitor de tela, ex. "quilos". */
  unitLabel: string;
  size?: 'lg' | 'sm';
};

/**
 * Stepper `− valor +`. Alvos grandes e uma decisão por tela: é o padrão de
 * entrada numérica do app, no onboarding e em Ajustes.
 */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  format,
  unitLabel,
  size = 'lg',
}: Props) {
  const grande = size === 'lg';
  const texto = format ? format(value) : String(value);

  return (
    <View className="flex-row items-center justify-center gap-5">
      <Pressable3D
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={value - step < min}
        accessibilityRole="button"
        accessibilityLabel={`Diminuir ${step} ${unitLabel}`}
        faceClassName={`${grande ? 'h-16 w-16' : 'h-12 w-12'} items-center justify-center rounded-2xl border-2 border-linha border-b-linha bg-canvas`}>
        <Minus size={grande ? 26 : 18} color={tokens.texto} strokeWidth={3} />
      </Pressable3D>

      <Text
        maxFontSizeMultiplier={1.2}
        accessibilityLabel={`${texto} ${unitLabel}`}
        className={`text-center font-displayBold text-texto ${grande ? 'w-40 text-4xl' : 'w-24 text-xl'}`}>
        {texto}
      </Text>

      <Pressable3D
        onPress={() => onChange(Math.min(max, value + step))}
        disabled={value + step > max}
        accessibilityRole="button"
        accessibilityLabel={`Aumentar ${step} ${unitLabel}`}
        faceClassName={`${grande ? 'h-16 w-16' : 'h-12 w-12'} items-center justify-center rounded-2xl border-2 border-linha border-b-linha bg-canvas`}>
        <Plus size={grande ? 26 : 18} color={tokens.texto} strokeWidth={3} />
      </Pressable3D>
    </View>
  );
}
