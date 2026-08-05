import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AnimatedNumber } from '@/components/AnimatedNumber';
import { OnboardingStep } from '@/components/OnboardingStep';
import { Stepper } from '@/components/Stepper';
import { GOAL_MAX_ML, GOAL_MIN_ML, GOAL_STEP_ML } from '@/domain/goal';
import { formatVolume } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';
import { useProfile, useSuggestedGoal } from '@/store/useProfile';

export default function Meta() {
  const router = useRouter();
  const sugerida = useSuggestedGoal();
  const goalOverride = useProfile((s) => s.goalOverride);
  const setGoalOverride = useProfile((s) => s.setGoalOverride);

  // A meta que vai valer: o ajuste manual, se houver, senão a calculada do perfil.
  // Não lemos `useWater.goalMl` aqui — quem aceita os padrões sem tocar em nada
  // ainda não disparou a sincronização, e veria a meta anterior.
  const metaExibida = goalOverride ?? sugerida;

  const [ajustando, setAjustando] = useState(false);

  // Não conclui mais aqui: quem fecha o onboarding é a tela de lembretes, para a
  // permissão ser pedida com o app ainda em modo de configuração (§6.4).
  function avancar() {
    router.push('/lembretes');
  }

  return (
    <OnboardingStep
      step={4}
      mood="radiante"
      speech="Essa é a sua meta!"
      ctaLabel="Próximo"
      onCta={avancar}
      secondary={
        !ajustando ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ajustar a meta"
            onPress={() => {
              tapFeedback();
              setAjustando(true);
            }}
            className="min-h-[44px] items-center justify-center">
            <Text className="font-display text-base text-agua">Ajustar</Text>
          </Pressable>
        ) : undefined
      }>
      <View className="items-center gap-4">
        {ajustando ? (
          <Stepper
            value={metaExibida}
            onChange={setGoalOverride}
            step={GOAL_STEP_ML}
            min={GOAL_MIN_ML}
            max={GOAL_MAX_ML}
            unitLabel="mililitros"
            format={formatVolume}
          />
        ) : (
          <AnimatedNumber
            value={metaExibida}
            format={formatVolume}
            className="font-displayBold text-6xl text-agua"
          />
        )}

        <Text maxFontSizeMultiplier={1.3} className="text-center font-body text-lg text-texto-soft">
          {ajustando
            ? `Sugerimos ${formatVolume(sugerida)} para o seu perfil.`
            : 'por dia, com base no seu peso e na sua rotina'}
        </Text>

        <Text maxFontSizeMultiplier={1.3} className="text-center font-body text-sm text-texto-soft">
          É uma estimativa de hábito, não recomendação médica. Dá para mudar quando quiser em
          Ajustes.
        </Text>
      </View>
    </OnboardingStep>
  );
}
