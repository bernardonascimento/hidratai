import { Stack } from 'expo-router';

import { useGutterTelaGrande } from '@/design/telaGrande';

export default function OnboardingLayout() {
  const gutter = useGutterTelaGrande();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Transparente porque o branco do canvas deixava o onboarding chapado.
        // Em troca, **cada tela daqui monta o próprio `AppBackground`**: num Stack
        // as duas telas coexistem durante o slide, e sem fundo opaco a que entra
        // deixa ver a que sai.
        // A folga de tela grande entra aqui, e não no `_layout` raiz, para o
        // `AppBackground` de cada tela continuar sangrando até a borda.
        contentStyle: { backgroundColor: 'transparent', paddingHorizontal: gutter },
        // Voltar é permitido: mudar de ideia sobre o peso não deve custar caro.
        gestureEnabled: true,
      }}
    />
  );
}
