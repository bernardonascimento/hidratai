import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { LIP, LIP_PRESSED, tokens } from '@/design/tokens';
import { tapFeedback } from '@/lib/haptics';

type Props = {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  /** Número no cantinho do botão; `done` pinta de verde com o próprio conteúdo. */
  badge?: string | number;
  badgeDone?: boolean;
};

/**
 * Botão circular de acesso rápido, empilhado no canto direito da tela.
 *
 * Usa o mesmo lip do resto do app, mas não passa pelo `Pressable3D`: aqui a face
 * é um círculo e o badge precisa escapar da caixa (`overflow` visível), o que a
 * base não prevê.
 */
export function QuickAccess({ icon, onPress, accessibilityLabel, badge, badgeDone }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => ({ paddingTop: pressed ? LIP - LIP_PRESSED : 0 })}>
      {({ pressed }) => (
        <View
          style={{
            width: 66,
            height: 66,
            borderRadius: 33,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tokens.canvas,
            borderWidth: 2,
            borderColor: tokens.linha,
            borderBottomWidth: pressed ? LIP_PRESSED : LIP,
            borderBottomColor: tokens.linha,
          }}>
          {icon}

          {badge !== undefined && (
            <View
              // Sai só para **cima**, nunca para a direita: saindo para o lado, a
              // borda do badge passava da pill de recursos e o topo da tela
              // ficava desalinhado. Subir o suficiente evita cobrir o ícone.
              className="absolute right-0 -top-3.5 min-w-[38px] items-center justify-center rounded-pill px-2.5 py-1"
              style={{
                backgroundColor: badgeDone ? tokens.meta : tokens.agua,
                borderWidth: 2,
                borderColor: tokens.canvas,
              }}>
              <Text maxFontSizeMultiplier={1.2} className="font-displayBold text-sm text-canvas">
                {badge}
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}
