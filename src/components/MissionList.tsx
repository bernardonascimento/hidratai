import {
  Check,
  Clock,
  Flame,
  type LucideIcon,
  Moon,
  Sunrise,
  Target,
  Utensils,
  Waves,
} from 'lucide-react-native';
import { Text, View } from 'react-native';

import { tokens } from '@/design/tokens';
import { XP_DIA_PERFEITO, type MissionStatus } from '@/domain/missions';

const ICONES: Record<string, LucideIcon> = {
  target: Target,
  sunrise: Sunrise,
  clock: Clock,
  utensils: Utensils,
  moon: Moon,
  waves: Waves,
  flame: Flame,
};

type Props = {
  missions: MissionStatus[];
  /** O painel de missões já traz o próprio título; evita repetir. */
  hideHeader?: boolean;
};

/**
 * As três missões do dia (§4.1 do PLANO-GAMIFICACAO). O estado cumprido é
 * **derivado dos registros**, então apagar um registro reflete aqui na hora.
 */
export function MissionList({ missions, hideHeader }: Props) {
  if (missions.length === 0) return null;

  const todas = missions.every((m) => m.done);

  return (
    <View className="gap-2">
      {!hideHeader && (
      <View className="flex-row items-center justify-between">
        <Text maxFontSizeMultiplier={1.3} className="font-displayBold text-lg text-texto-soft">
          Missões de hoje
        </Text>
        {todas && (
          <View className="flex-row items-center gap-1.5 rounded-pill border-2 border-meta bg-meta-tint px-2.5 py-1">
            <Check size={16} color={tokens.meta} strokeWidth={3} />
            <Text maxFontSizeMultiplier={1.2} className="font-displayBold text-sm text-meta">
              Dia perfeito · +{XP_DIA_PERFEITO} XP
            </Text>
          </View>
        )}
      </View>
      )}

      {missions.map((missao) => {
        const Icone = ICONES[missao.icon] ?? Target;

        return (
          <View
            key={missao.id}
            accessible
            accessibilityLabel={`${missao.title}. ${missao.description}. ${
              missao.done ? 'Cumprida' : `Vale ${missao.xp} XP`
            }`}
            className={`min-h-[66px] flex-row items-center gap-3 rounded-2xl border-2 px-3 py-2.5 ${
              missao.done ? 'border-meta bg-meta-tint' : 'border-linha bg-canvas'
            }`}>
            <Icone
              size={26}
              color={missao.done ? tokens.meta : tokens.agua}
              strokeWidth={2.4}
            />

            <View className="flex-1 gap-0.5">
              <Text
                maxFontSizeMultiplier={1.3}
                className={`font-displayBold text-base ${
                  missao.done ? 'text-meta' : 'text-texto'
                }`}>
                {missao.title}
              </Text>
              {/* `texto-soft` e não `texto-off`: a descrição é o que explica a missão, e
                  em #AFAFAF sobre branco dava 2,19:1 — reprovava AA. */}
              <Text maxFontSizeMultiplier={1.3} className="font-body text-sm text-texto-soft">
                {missao.description}
              </Text>
            </View>

            {missao.done ? (
              <Check size={24} color={tokens.meta} strokeWidth={3} />
            ) : (
              <Text
                maxFontSizeMultiplier={1.2}
                className="font-displayBold text-xl"
                style={{ color: tokens.xp }}>
                +{missao.xp}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
