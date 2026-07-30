import type { ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Container **não pressável**: borda sólida de 2px e nada de sombra — o lip é
 * exclusivo do que se pode apertar (§9 e DESIGN-SYSTEM).
 */
export function Card({ children, className }: Props) {
  return (
    <View className={`rounded-2xl border-2 border-linha bg-canvas p-4 ${className ?? ''}`}>
      {children}
    </View>
  );
}
