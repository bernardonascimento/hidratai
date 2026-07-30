import { Flame, Zap } from 'lucide-react-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Gotinha } from '@/components/Gotinha';
import { tokens } from '@/design/tokens';
import { useReducedMotionPref } from '@/lib/motion';

const CORES_CONFETE = [tokens.xp, tokens.agua, tokens.meta, tokens.ofensiva];

function Confete({ index, ativo }: { index: number; ativo: boolean }) {
  const t = useSharedValue(0);
  const reduzido = useReducedMotionPref();

  useEffect(() => {
    if (!ativo || reduzido) return;
    t.value = withDelay(index * 60, withTiming(1, { duration: 1100 }));
  }, [ativo, reduzido, index, t]);

  // Espalhamento determinístico: nada de aleatório, o mesmo confete sempre.
  const dx = ((index % 5) - 2) * 34;
  const giro = index % 2 === 0 ? 360 : -360;

  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1 - t.value,
    transform: [
      { translateX: dx * t.value },
      { translateY: -30 + t.value * 240 },
      { rotate: `${t.value * giro}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 40,
          width: 10,
          height: 10,
          borderRadius: 2,
          backgroundColor: CORES_CONFETE[index % CORES_CONFETE.length],
        },
        style,
      ]}
    />
  );
}

type Props = {
  xpGanho: number;
  streak: number;
  onClose: () => void;
};

/** Card de celebração — mascote + XP + ofensiva. Só aparece ao bater a meta. */
export function Celebration({ xpGanho, streak, onClose }: Props) {
  const entrada = useSharedValue(0);
  /**
   * **Sem animar a opacidade.** O fundo escuro é pintado no primeiro quadro, mas o
   * card partia de `opacity: 0` e só aparecia no quadro seguinte — dava o pisca em que
   * se via o fundo através do escuro antes do card existir. Começando opaco e só
   * crescendo, o card está lá desde o primeiro quadro e o pulo do spring continua.
   */
  const reduzido = useReducedMotionPref();

  useEffect(() => {
    entrada.value = reduzido
      ? withTiming(1, { duration: 0 })
      : withSpring(1, { damping: 13, stiffness: 160 });
  }, [entrada, reduzido]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + entrada.value * 0.08 }],
  }));

  return (
    <View
      className="absolute inset-0 items-center justify-center px-6"
      style={{ backgroundColor: 'rgba(75,75,75,0.45)' }}>
      {Array.from({ length: 10 }, (_, i) => (
        <Confete key={i} index={i} ativo />
      ))}

      <Animated.View
        style={[
          {
            width: '100%',
            alignItems: 'center',
            gap: 16,
            backgroundColor: tokens.canvas,
            borderRadius: 24,
            borderWidth: 2,
            borderColor: tokens.linha,
            paddingHorizontal: 20,
            paddingVertical: 28,
          },
          cardStyle,
        ]}>
        <Gotinha mood="radiante" size={128} />

        <Text className="font-displayBold text-2xl uppercase text-meta">Meta batida</Text>
        <Text className="text-center font-body text-base text-texto-soft">
          Seu corpo agradece. Amanhã tem mais.
        </Text>

        <View className="flex-row gap-3">
          <View className="flex-row items-center gap-1.5 rounded-pill border-2 border-linha px-4 py-2">
            <Zap size={18} color={tokens.xp} strokeWidth={2.5} />
            <Text className="font-displayBold text-base" style={{ color: tokens.xp }}>
              +{xpGanho} XP
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5 rounded-pill border-2 border-linha px-4 py-2">
            <Flame size={18} color={tokens.ofensiva} strokeWidth={2.5} />
            <Text className="font-displayBold text-base" style={{ color: tokens.ofensiva }}>
              {streak} {streak === 1 ? 'dia' : 'dias'}
            </Text>
          </View>
        </View>

        <Button label="Continuar" variant="meta" onPress={onClose} />
      </Animated.View>
    </View>
  );
}
