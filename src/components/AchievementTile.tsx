import {
  Award,
  CalendarCheck,
  Coffee,
  CupSoda,
  Droplet,
  Flame,
  type LucideIcon,
  Medal,
  Sparkles,
  Sunrise,
  Target,
  Trophy,
  Zap,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { tokens } from '@/design/tokens';
import type { Achievement } from '@/domain/achievements';
import { tapFeedback } from '@/lib/haptics';

/** O domínio guarda o nome do ícone; a UI resolve para o componente. */
const ICONES: Record<string, LucideIcon> = {
  droplet: Droplet,
  flame: Flame,
  trophy: Trophy,
  award: Award,
  target: Target,
  medal: Medal,
  sunrise: Sunrise,
  'cup-soda': CupSoda,
  sparkles: Sparkles,
  'calendar-check': CalendarCheck,
  coffee: Coffee,
  zap: Zap,
};

type Props = {
  achievement: Achievement;
};

/** Desbloqueada em cor cheia; bloqueada em cinza. Toque revela o critério (§5.5). */
export function AchievementTile({ achievement }: Props) {
  const [mostrarCritério, setMostrarCritério] = useState(false);
  const Icone = ICONES[achievement.icon] ?? Droplet;
  const cor = achievement.unlocked ? tokens.agua : tokens.textoOff;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${achievement.title}. ${
        achievement.unlocked ? 'Conquistada' : 'Bloqueada'
      }. ${achievement.criterion}`}
      onPress={() => {
        tapFeedback();
        setMostrarCritério((v) => !v);
      }}
      className={`min-h-[136px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 p-3 ${
        achievement.unlocked ? 'border-agua bg-agua-tint' : 'border-linha bg-canvas'
      }`}>
      <Icone size={36} color={cor} strokeWidth={2.2} />

      {mostrarCritério ? (
        <Text
          maxFontSizeMultiplier={1.2}
          className="text-center font-body text-sm text-texto-soft">
          {achievement.criterion}
        </Text>
      ) : (
        <>
          <Text
            maxFontSizeMultiplier={1.2}
            className={`text-center font-displayBold text-base ${
              achievement.unlocked ? 'text-agua' : 'text-texto-soft'
            }`}>
            {achievement.title}
          </Text>

          {/* Trilha de progresso só onde faz sentido mostrar o quanto falta */}
          {!achievement.unlocked && achievement.progress !== undefined && (
            <View className="h-2 w-full overflow-hidden rounded-pill bg-linha">
              <View
                style={{
                  width: `${Math.round(achievement.progress * 100)}%`,
                  backgroundColor: tokens.textoOff,
                  height: '100%',
                }}
              />
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}
