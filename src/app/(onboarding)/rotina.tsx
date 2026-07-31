import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { OnboardingStep } from '@/components/OnboardingStep';
import { Stepper } from '@/components/Stepper';
import { formatClock } from '@/lib/format';
import { useProfile } from '@/store/useProfile';

/**
 * Acordar e dormir definem a janela dos lembretes (§6.1).
 *
 * O plano previa um *picker* de hora; usamos o mesmo stepper do peso, em passos de
 * 30 min. Motivo: um picker nativo exigiria dependência nativa nova, e o stepper
 * mantém o padrão de alvos grandes já estabelecido. Se preferir o picker do
 * sistema, é trocar este componente.
 */
export default function Rotina() {
  const router = useRouter();
  const wakeMinutes = useProfile((s) => s.profile.wakeMinutes);
  const sleepMinutes = useProfile((s) => s.profile.sleepMinutes);
  const setProfile = useProfile((s) => s.setProfile);

  return (
    <OnboardingStep
      step={2}
      speech="Qual sua rotina?"
      ctaLabel="Próximo"
      onCta={() => router.push('/estilo')}>
      {/* Os dois horários num bloco só: eles não são duas perguntas independentes — é
          a distância entre eles que define a janela dos lembretes, e separados em dois
          cartões soltos essa relação não aparecia. */}
      <View className="gap-4 rounded-2xl border-2 border-linha bg-canvas p-4">
        <View className="gap-3">
          <Text
            maxFontSizeMultiplier={1.3}
            className="text-center font-displayBold text-lg text-texto-soft">
            Acordo às
          </Text>
          <Stepper
            value={wakeMinutes}
            onChange={(v) => setProfile({ wakeMinutes: v })}
            step={30}
            min={0}
            max={720}
            unitLabel="horas"
            format={formatClock}
          />
        </View>

        <View className="h-px w-full bg-linha" />

        <View className="gap-3">
          <Text
            maxFontSizeMultiplier={1.3}
            className="text-center font-displayBold text-lg text-texto-soft">
            Durmo às
          </Text>
          <Stepper
            value={sleepMinutes}
            onChange={(v) => setProfile({ sleepMinutes: v })}
            step={30}
            min={720}
            max={1439}
            unitLabel="horas"
            format={formatClock}
          />
        </View>
      </View>

      <Text
        maxFontSizeMultiplier={1.3}
        className="pt-3 text-center font-body text-sm text-texto-soft">
        É dentro desse intervalo que os lembretes acontecem — nunca de madrugada.
      </Text>
    </OnboardingStep>
  );
}
