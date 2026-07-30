import type { ReactNode } from 'react';
import { Text } from 'react-native';

import { Pressable3D } from '@/components/Pressable3D';

/** Primária (azul) · meta (verde, só quando a meta foi batida) · fantasma. */
type Variant = 'agua' | 'meta' | 'ghost';
type Size = 'lg' | 'sm';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  icon?: ReactNode;
};

const face: Record<Variant, string> = {
  agua: 'bg-agua border-b-agua-lip',
  meta: 'bg-meta border-b-meta-lip',
  ghost: 'bg-canvas border-2 border-linha border-b-linha',
};

const rotulo: Record<Variant, string> = {
  agua: 'text-canvas',
  meta: 'text-canvas',
  ghost: 'text-texto-soft',
};

const medida: Record<Size, string> = {
  lg: 'min-h-[64px] px-5 py-4 gap-2',
  sm: 'min-h-[48px] px-4 py-2.5 gap-1.5',
};

const fonte: Record<Size, string> = {
  /** 20px. Vale para todos os botões primários do app — a ação da tela Hoje, os CTAs
   *  do onboarding, a celebração e o resultado do dia —, então eles seguem iguais. */
  lg: 'text-xl',
  sm: 'text-sm',
};

/**
 * O botão do app. É a referência de lip 3D e **não existe um segundo botão**:
 * ação terciária é este mesmo componente na variante fantasma.
 */
export function Button({ label, onPress, variant = 'agua', size = 'lg', disabled, icon }: Props) {
  return (
    <Pressable3D
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="w-full"
      faceClassName={`w-full flex-row items-center justify-center rounded-2xl ${medida[size]} ${face[variant]}`}>
      {icon}
      <Text
        maxFontSizeMultiplier={1.4}
        className={`font-display uppercase tracking-wide ${fonte[size]} ${rotulo[variant]}`}>
        {label}
      </Text>
    </Pressable3D>
  );
}
