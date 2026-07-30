import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/AppBackground';
import { Button } from '@/components/Button';
import { Gotinha } from '@/components/Gotinha';

/** Passo 0: a Gotinha se apresenta. Uma decisão, um botão (§5.1). */
export default function BoasVindas() {
  const router = useRouter();

  return (
    <View className="flex-1">
      {/* Fundo próprio: ver a nota em `OnboardingStep`. */}
      <AppBackground />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Pesos 1,4 e 1 em vez de centralizar: centralizado, sobravam ~200pt entre a
            fala e o botão. Assim o bloco assenta um pouco abaixo do centro e a ação
            fica ao alcance da leitura. */}
        <View style={{ flexGrow: 1.4 }} />

        <View className="items-center gap-6 px-8">
          {/* mood cheer = entra com pop, o "pulinho" do plano */}
          <Gotinha mood="radiante" size={168} />

          <Text className="text-center font-displayBold text-3xl text-texto">
            Oi! Eu sou a Gotinha
          </Text>
          <Text className="text-center font-body text-lg text-texto-soft">
            Vou te ajudar a beber água todo dia. São três perguntas rápidas e já
            começamos.
          </Text>
        </View>

        <View style={{ flexGrow: 1 }} />

        <View className="px-5 pb-4">
          <Button label="Vamos" onPress={() => router.push('/peso')} />
        </View>
      </SafeAreaView>
    </View>
  );
}
