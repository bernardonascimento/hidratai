import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Transparente porque o branco do canvas deixava o onboarding chapado.
        // Em troca, **cada tela daqui monta o próprio `AppBackground`**: num Stack
        // as duas telas coexistem durante o slide, e sem fundo opaco a que entra
        // deixa ver a que sai.
        contentStyle: { backgroundColor: 'transparent' },
        // Voltar é permitido: mudar de ideia sobre o peso não deve custar caro.
        gestureEnabled: true,
      }}
    />
  );
}
