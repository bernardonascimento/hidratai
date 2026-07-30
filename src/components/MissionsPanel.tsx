import { X } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { MissionList } from '@/components/MissionList';
import { tokens } from '@/design/tokens';
import { type MissionStatus, missionsXp } from '@/domain/missions';
import { tapFeedback } from '@/lib/haptics';
import { useReducedMotionPref } from '@/lib/motion';

type Props = {
  missions: MissionStatus[];
  onClose: () => void;
};

/** Painel das missões, aberto pelo atalho no canto direito da tela Hoje. */
export function MissionsPanel({ missions, onClose }: Props) {
  const entrada = useSharedValue(0);
  const reduzido = useReducedMotionPref();

  useEffect(() => {
    entrada.value = reduzido
      ? withTiming(1, { duration: 0 })
      : withSpring(1, { damping: 15, stiffness: 170 });
  }, [entrada, reduzido]);

  /**
   * **Sem animar a opacidade.** O fundo escuro é pintado no primeiro quadro, mas o
   * card partia de `opacity: 0` e só aparecia no quadro seguinte — dava o pisca em que
   * se via o fundo através do escuro antes do card existir. Começando opaco e só
   * crescendo, o card está lá desde o primeiro quadro e o pulo do spring continua.
   */
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.94 + entrada.value * 0.06 }],
  }));

  const ganho = missionsXp(missions);
  const cumpridas = missions.filter((m) => m.done).length;

  return (
    <View
      className="absolute inset-0 justify-center px-5"
      style={{ backgroundColor: 'rgba(75,75,75,0.45)' }}>
      <Animated.View
        style={[
          {
            backgroundColor: tokens.canvas,
            borderRadius: 24,
            borderWidth: 2,
            borderColor: tokens.linha,
            paddingHorizontal: 16,
            paddingVertical: 18,
            maxHeight: '80%',
          },
          style,
        ]}>
        <View className="flex-row items-center justify-between pb-3">
          <View>
            <Text maxFontSizeMultiplier={1.3} className="font-displayBold text-xl text-texto">
              Missões de hoje
            </Text>
            <Text maxFontSizeMultiplier={1.3} className="font-body text-sm text-texto-soft">
              {cumpridas} de {missions.length} · {ganho} XP até agora
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar missões"
            onPress={() => {
              tapFeedback();
              onClose();
            }}
            className="h-11 w-11 items-center justify-center rounded-pill border-2 border-linha">
            <X size={20} color={tokens.textoSoft} strokeWidth={2.6} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <MissionList missions={missions} hideHeader />
        </ScrollView>
      </Animated.View>
    </View>
  );
}
