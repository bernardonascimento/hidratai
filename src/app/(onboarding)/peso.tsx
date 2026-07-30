import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { OnboardingStep } from '@/components/OnboardingStep';
import { Stepper } from '@/components/Stepper';
import { useProfile } from '@/store/useProfile';

export default function Peso() {
  const router = useRouter();
  const weightKg = useProfile((s) => s.profile.weightKg);
  const setProfile = useProfile((s) => s.setProfile);

  return (
    <OnboardingStep
      step={1}
      speech="Quanto você pesa?"
      ctaLabel="Próximo"
      onCta={() => router.push('/rotina')}>
      <View className="gap-3">
        <Stepper
          value={weightKg}
          onChange={(v) => setProfile({ weightKg: v })}
          min={30}
          max={250}
          unitLabel="quilos"
          format={(v) => `${v} kg`}
        />
        <Text maxFontSizeMultiplier={1.3} className="text-center font-body text-base text-texto-soft">
          Serve só para estimar sua meta. Fica no aparelho, não vai para lugar nenhum,
          e dá para mudar depois em Ajustes.
        </Text>
      </View>
    </OnboardingStep>
  );
}
