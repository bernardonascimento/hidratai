import type { ReactNode } from 'react';
import { Pressable, type PressableProps, View } from 'react-native';

import { LIP, LIP_PRESSED } from '@/design/tokens';
import { tapFeedback } from '@/lib/haptics';

type Props = {
  onPress: () => void;
  /** Classes da face: fundo, bordas e a cor do lip via `border-b-*`. */
  faceClassName: string;
  children: ReactNode;
  disabled?: boolean;
  /**
   * Esmaecer quando desabilitado. Desligue para itens que estão inativos porque
   * **já foram conquistados** — esmaecer faria "já tenho" parecer "não posso".
   */
  dimWhenDisabled?: boolean;
  /** Classes do envelope (largura, opacidade). */
  className?: string;
  accessibilityRole?: PressableProps['accessibilityRole'];
  accessibilityLabel?: string;
  accessibilityState?: PressableProps['accessibilityState'];
};

/**
 * A mecânica "chunky" do design system, em um só lugar: face sólida com lip de
 * 4px sem blur que **continua visível durante o press**.
 *
 * O envelope reserva `LIP` de espaço embaixo; ao pressionar, esse espaço vai para
 * o topo e a face desce os 4px dentro dele, sem cobrir o lip. Assim a altura total
 * do bloco nunca muda (nada pula no layout) e a borda inferior não pisca.
 *
 * Todo pressável do app passa por aqui — `Button`, `VolumeCard` e `Stepper` são
 * peles em cima desta base, não implementações paralelas do mesmo efeito.
 */
export function Pressable3D({
  onPress,
  faceClassName,
  children,
  disabled,
  dimWhenDisabled = true,
  className,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
}: Props) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      disabled={disabled}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      className={`${className ?? ''} ${disabled && dimWhenDisabled ? 'opacity-40' : ''}`}
      // O que a face desce é exatamente o que o lip encurta, então
      // `paddingTop + face + lip` não muda e a caixa tem altura fixa.
      style={({ pressed }) => ({ paddingTop: pressed ? LIP - LIP_PRESSED : 0 })}>
      {({ pressed }) => (
        <View
          className={faceClassName}
          style={{ borderBottomWidth: pressed ? LIP_PRESSED : LIP }}>
          {children}
        </View>
      )}
    </Pressable>
  );
}
