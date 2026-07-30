import { useRouter } from 'expo-router';
import { Armchair, CloudSun, Dumbbell, Footprints, type LucideIcon, Sun } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { OnboardingStep } from '@/components/OnboardingStep';
import { Pressable3D } from '@/components/Pressable3D';
import { tokens } from '@/design/tokens';
import { ACTIVITY_OPTIONS, CLIMATE_OPTIONS } from '@/domain/profileOptions';
import type { Activity, Climate } from '@/domain/types';
import { useProfile } from '@/store/useProfile';

/** Ícones por valor; o rótulo vem de `profileOptions`, para não divergir dos Ajustes. */
const ICONES_ATIVIDADE: Record<Activity, LucideIcon> = {
  baixa: Armchair,
  media: Footprints,
  alta: Dumbbell,
};
const ICONES_CLIMA: Record<Climate, LucideIcon> = {
  temperado: CloudSun,
  quente: Sun,
};

const ATIVIDADES = ACTIVITY_OPTIONS.map((o) => ({ ...o, icon: ICONES_ATIVIDADE[o.value] }));
const CLIMAS = CLIMATE_OPTIONS.map((o) => ({ ...o, icon: ICONES_CLIMA[o.value] }));


function CardIcone({
  Icone,
  label,
  selecionado,
  onPress,
}: {
  Icone: LucideIcon;
  label: string;
  selecionado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable3D
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: selecionado }}
      accessibilityLabel={label}
      className="flex-1"
      faceClassName={`min-h-[104px] items-center justify-center gap-2 rounded-2xl border-2 px-2 py-3 ${
        selecionado
          ? 'border-agua border-b-agua-lip bg-agua-tint'
          : 'border-linha border-b-linha bg-canvas'
      }`}>
      <Icone size={30} color={selecionado ? tokens.agua : tokens.textoSoft} strokeWidth={2.2} />
      <Text
        maxFontSizeMultiplier={1.2}
        className={`text-base ${
          selecionado ? 'font-displayBold text-agua' : 'font-display text-texto-soft'
        }`}>
        {label}
      </Text>
    </Pressable3D>
  );
}

export default function Estilo() {
  const router = useRouter();
  const activity = useProfile((s) => s.profile.activity);
  const climate = useProfile((s) => s.profile.climate);
  const setProfile = useProfile((s) => s.setProfile);

  return (
    <OnboardingStep
      step={3}
      speech="Como é o seu dia?"
      ctaLabel="Próximo"
      onCta={() => router.push('/meta')}>
      <View className="gap-7">
        <View className="gap-3">
          <Text className="font-display text-base text-texto-soft">Você se move</Text>
          <View className="flex-row gap-3">
            {ATIVIDADES.map((opcao) => (
              <CardIcone
                key={opcao.value}
                Icone={opcao.icon}
                label={opcao.label}
                selecionado={activity === opcao.value}
                onPress={() => setProfile({ activity: opcao.value })}
              />
            ))}
          </View>
        </View>

        <View className="gap-3">
          <Text className="font-display text-base text-texto-soft">Onde você vive</Text>
          <View className="flex-row gap-3">
            {CLIMAS.map((opcao) => (
              <CardIcone
                key={opcao.value}
                Icone={opcao.icon}
                label={opcao.label}
                selecionado={climate === opcao.value}
                onPress={() => setProfile({ climate: opcao.value })}
              />
            ))}
          </View>
        </View>
      </View>
    </OnboardingStep>
  );
}
