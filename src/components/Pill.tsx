import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type Tone = 'neutro' | 'agua' | 'meta';

type Props = {
  label: string;
  icon?: ReactNode;
  tone?: Tone;
};

const face: Record<Tone, string> = {
  neutro: 'border-linha bg-canvas',
  agua: 'border-agua bg-agua-tint',
  meta: 'border-meta bg-meta-tint',
};

const texto: Record<Tone, string> = {
  neutro: 'text-texto-soft',
  agua: 'text-agua',
  meta: 'text-meta',
};

/** Pill de leitura: raio total, borda 2px. Para seleção use `SegmentedPills`. */
export function Pill({ label, icon, tone = 'neutro' }: Props) {
  return (
    <View
      className={`flex-row items-center gap-1.5 rounded-pill border-2 px-3 py-1.5 ${face[tone]}`}>
      {icon}
      <Text maxFontSizeMultiplier={1.3} className={`font-displayBold text-base ${texto[tone]}`}>
        {label}
      </Text>
    </View>
  );
}
