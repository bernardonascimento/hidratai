import { Check, Flame, Snowflake, Zap } from 'lucide-react-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Gotinha } from '@/components/Gotinha';
import { Pill } from '@/components/Pill';
import { tokens } from '@/design/tokens';
import type { DayLog } from '@/domain/types';
import { formatVolume } from '@/lib/format';
import { useReducedMotionPref } from '@/lib/motion';

type Props = {
  day: DayLog;
  /** Missões cumpridas de ontem, do total. */
  missionsDone: number;
  missionsTotal: number;
  /** A ofensiva sobreviveu ao dia? E foi por congelamento? */
  streak: number;
  freezeUsed: boolean;
  tip: string;
  onClose: () => void;
};

/**
 * Resultado do dia (§4.4): o resumo de ontem na primeira abertura do dia novo.
 * É o momento de recompensa diário que faltava — e vale tanto quando a meta foi
 * batida quanto quando não, **sempre sem culpa** (§3.3).
 */
export function DayResult({
  day,
  missionsDone,
  missionsTotal,
  streak,
  freezeUsed,
  tip,
  onClose,
}: Props) {
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
      : withSpring(1, { damping: 14, stiffness: 150 });
  }, [entrada, reduzido]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.94 + entrada.value * 0.06 }],
  }));

  const bateu = day.metGoal;
  const proporcao = day.goalMl > 0 ? day.totalHydrationMl / day.goalMl : 0;

  return (
    <View
      className="absolute inset-0 items-center justify-center px-6"
      style={{ backgroundColor: 'rgba(75,75,75,0.45)' }}>
      <Animated.View
        style={[
          {
            width: '100%',
            alignItems: 'center',
            gap: 12,
            backgroundColor: tokens.canvas,
            borderRadius: 24,
            borderWidth: 2,
            borderColor: tokens.linha,
            paddingHorizontal: 20,
            paddingVertical: 24,
          },
          style,
        ]}>
        <Gotinha mood={bateu ? 'radiante' : 'animada'} size={104} />

        <Text className="font-displayBold text-xl uppercase text-texto">Seu dia de ontem</Text>

        <Text className="font-displayBold text-4xl" style={{ color: bateu ? tokens.meta : tokens.agua }}>
          {formatVolume(day.totalHydrationMl)}
        </Text>
        <Text maxFontSizeMultiplier={1.3} className="font-body text-base text-texto-soft">
          de {formatVolume(day.goalMl)} · {Math.round(proporcao * 100)}% da meta
        </Text>

        <View className="flex-row flex-wrap items-center justify-center gap-2 pt-1">
          {missionsTotal > 0 && (
            <Pill
              tone={missionsDone === missionsTotal ? 'meta' : 'neutro'}
              label={`${missionsDone}/${missionsTotal} missões`}
              icon={
                <Check
                  size={16}
                  color={missionsDone === missionsTotal ? tokens.meta : tokens.textoSoft}
                  strokeWidth={3}
                />
              }
            />
          )}
          {streak > 0 && (
            <Pill
              label={`${streak} ${streak === 1 ? 'dia' : 'dias'}`}
              icon={<Flame size={16} color={tokens.ofensiva} strokeWidth={2.5} />}
            />
          )}
          {freezeUsed && (
            <Pill
              tone="agua"
              label="Congelamento usado"
              icon={<Snowflake size={16} color={tokens.agua} strokeWidth={2.5} />}
            />
          )}
        </View>

        {/* Sem culpa: quando não bateu, a frase acolhe em vez de cobrar */}
        {!bateu && (
          <Text maxFontSizeMultiplier={1.3} className="text-center font-body text-base text-texto-soft">
            Todo dia conta, inclusive os curtos. Hoje é um novo copo.
          </Text>
        )}

        <View className="w-full rounded-2xl border-2 border-linha bg-linha-sutil px-4 py-3">
          <View className="flex-row items-center gap-2 pb-1">
            <Zap size={14} color={tokens.xp} strokeWidth={2.5} />
            <Text
              maxFontSizeMultiplier={1.2}
              className="font-displayBold text-sm uppercase tracking-wide text-texto-soft">
              Dica
            </Text>
          </View>
          <Text maxFontSizeMultiplier={1.3} className="font-body text-base text-texto">
            {tip}
          </Text>
        </View>

        <Button label="Bora" variant={bateu ? 'meta' : 'agua'} onPress={onClose} />
      </Animated.View>
    </View>
  );
}
