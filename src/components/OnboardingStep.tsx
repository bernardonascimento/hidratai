import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/AppBackground';
import { Button } from '@/components/Button';
import { Gotinha, type Mood } from '@/components/Gotinha';
import { SpeechBubble } from '@/components/SpeechBubble';

/** Peso · rotina · estilo · meta · lembretes. Boas-vindas não conta como passo. */
export const ONBOARDING_STEPS = 5;

type Props = {
  /** 1-based, para a barra de pills. */
  step: number;
  /** Fala da Gotinha: no máximo oito palavras (§5.1). */
  speech: string;
  children: ReactNode;
  ctaLabel: string;
  onCta: () => void;
  /** Ação secundária opcional, abaixo do CTA. */
  secondary?: ReactNode;
  mood?: Mood;
};

/**
 * Molde das telas de onboarding: barra de progresso em pills, Gotinha com uma
 * fala curta, **uma pergunta** e um botão grande fixo. Nunca um formulário com
 * vários campos (§5.1).
 */
export function OnboardingStep({
  step,
  speech,
  children,
  ctaLabel,
  onCta,
  secondary,
  mood = 'animada',
}: Props) {
  return (
    <View className="flex-1">
      {/* Fundo **próprio**, não o do layout raiz: aqui as telas são um Stack, e
          durante o slide as duas ficam na tela ao mesmo tempo. Sem fundo opaco, a
          que entra é translúcida e o conteúdo das duas aparece empilhado. */}
      <AppBackground />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Progresso em pills, **com o contador ao lado**.
            Só as pílulas obrigavam a contar quantas estavam azuis para saber onde se
            está — e, com cinco delas, ninguém conta. O número diz de uma vez. */}
        <View
          className="flex-row items-center gap-3 px-5 pt-3"
          accessibilityRole="progressbar"
          accessibilityLabel={`Passo ${step} de ${ONBOARDING_STEPS}`}>
          <View className="flex-1 flex-row gap-2">
            {Array.from({ length: ONBOARDING_STEPS }, (_, i) => (
              <View
                key={i}
                className={`h-2.5 flex-1 rounded-pill ${i < step ? 'bg-agua' : 'bg-linha'}`}
              />
            ))}
          </View>
          <Text
            maxFontSizeMultiplier={1.2}
            accessibilityElementsHidden
            className="font-displayBold text-sm text-texto-soft">
            {step} de {ONBOARDING_STEPS}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}>
          {/* Gotinha à esquerda com a fala.
              O balão é o **mesmo componente** da tela Hoje, com o bico apontando para
              ela — era um retângulo arredondado solto, que não lia como fala. E o
              `SpeechBubble` já abraça o texto, então falas curtas como "Essa é a sua
              meta!" não sobram com dois terços vazios à direita. */}
          <View className="flex-row items-center gap-1 pt-5">
            <Gotinha mood={mood} size={76} />
            <SpeechBubble text={speech} />
          </View>

          {/* O conteúdo assenta no **primeiro terço** do vão, com respiro proporcional
              acima e abaixo.

              Nem `justify-start` nem `justify-center` funcionavam: colado no topo
              deixava metade da tela vazia acima do botão, e centralizado empurrava a
              pergunta para o terço de baixo. Dois espaçadores com pesos 1 e 2 resolvem
              — a proporção se mantém em qualquer altura de tela. */}
          <View className="flex-1 pt-6">
            <View style={{ flexGrow: 1 }} />
            {children}
            <View style={{ flexGrow: 2 }} />
          </View>

          <Button label={ctaLabel} onPress={onCta} />
          {secondary && <View className="pt-3">{secondary}</View>}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
