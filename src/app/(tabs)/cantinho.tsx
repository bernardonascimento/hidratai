import { Droplets, Share2 } from 'lucide-react-native';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { GardenArt } from '@/components/GardenArt';
import { GardenScene } from '@/components/GardenScene';
import { Pressable3D } from '@/components/Pressable3D';
import { tokens } from '@/design/tokens';
import { GARDEN_ELEMENTS, nextTarget } from '@/domain/garden';
import { celebrarCantinho } from '@/lib/celebrate';
import { mascotMood } from '@/domain/mascot';
import { milestonesOf, shareText } from '@/domain/milestones';
import { successFeedback, tapFeedback } from '@/lib/haptics';
import { useGamification } from '@/store/useGamification';
import { useProfile } from '@/store/useProfile';
import { useTodayHydrationMl, useWater } from '@/store/useWater';

export default function Cantinho() {
  const days = useWater((s) => s.days);
  const goalMl = useWater((s) => s.goalMl);
  const totalHoje = useTodayHydrationMl();

  const streak = useGamification((s) => s.streak);
  const bestStreak = useGamification((s) => s.bestStreak);
  const drops = useGamification((s) => s.drops);
  const unlocked = useGamification((s) => s.gardenUnlocked);
  const lifetimeMl = useGamification((s) => s.lifetimeMl);
  const unlockElement = useGamification((s) => s.unlockElement);

  const alvo = nextTarget(unlocked);
  const marcos = milestonesOf({ lifetimeMl, days });
  // Mesma régua da tela Hoje: a Gotinha do Cantinho não pode estar de outro humor.
  const rotina = useProfile((s) => s.profile);
  const agoraMin = new Date().getHours() * 60 + new Date().getMinutes();
  const mood = mascotMood({
    progress: goalMl > 0 ? totalHoje / goalMl : 0,
    minutesOfDay: agoraMin,
    wakeMinutes: rotina.wakeMinutes,
    sleepMinutes: rotina.sleepMinutes,
  });

  // Três por linha, para os cards dividirem a largura por igual.
  const trios: (typeof GARDEN_ELEMENTS)[] = [];
  for (let i = 0; i < GARDEN_ELEMENTS.length; i += 3) {
    trios.push(GARDEN_ELEMENTS.slice(i, i + 3));
  }

  async function compartilhar() {
    try {
      await Share.share({ message: shareText({ lifetimeMl, streak, bestStreak }) });
    } catch {
      // Cancelar o share sheet não é erro.
    }
  }

  return (
    <View className="flex-1">
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}
          showsVerticalScrollIndicator={false}>
          <Text className="pt-2 font-displayBold text-2xl text-texto">Cantinho da Gotinha</Text>

          <GardenScene unlocked={unlocked} mood={mood} />

          {/* Gotas e o que dá para desbloquear */}
          <Card>
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-2">
                <Droplets size={24} color={tokens.agua} strokeWidth={2.5} />
                <Text maxFontSizeMultiplier={1.3} className="font-displayBold text-xl text-texto">
                  {drops} {drops === 1 ? 'gota' : 'gotas'}
                </Text>
              </View>
              <Text maxFontSizeMultiplier={1.2} className="font-body text-sm text-texto-soft">
                {unlocked.length} de {GARDEN_ELEMENTS.length} no cantinho
              </Text>
            </View>

            <Text maxFontSizeMultiplier={1.3} className="pt-1.5 font-body text-sm text-texto-soft">
              Cada dia com a meta batida rende uma gota.
              {alvo ? ` Próximo: ${alvo.name} por ${alvo.cost}.` : ' Você já tem tudo!'}
            </Text>

            {/* Trios com `flex-1`, não largura fixa: os cards dividem a largura
                do card inteiro, sem sobra à direita. */}
            <View className="gap-2 pt-4">
              {trios.map((trio) => (
                <View key={trio[0].id} className="flex-row gap-2">
                  {trio.map((elemento) => {
                    const jaTem = unlocked.includes(elemento.id);
                    const podeComprar = !jaTem && drops >= elemento.cost;

                    return (
                      <Pressable3D
                        key={elemento.id}
                        disabled={!podeComprar}
                        // Já conquistado não é "indisponível": não esmaece.
                        dimWhenDisabled={!jaTem}
                        accessibilityRole="button"
                        accessibilityLabel={
                          jaTem
                            ? `${elemento.name}, já no cantinho`
                            : `${elemento.name}, custa ${elemento.cost} gotas`
                        }
                        onPress={() => {
                          if (unlockElement(elemento.id)) {
                            successFeedback();
                            celebrarCantinho(elemento);
                          }
                        }}
                        className="flex-1"
                        faceClassName={`items-center gap-1 rounded-2xl border-2 px-2 py-3 ${
                          jaTem
                            ? 'border-meta border-b-meta-lip bg-meta-tint'
                            : podeComprar
                              ? 'border-agua border-b-agua-lip bg-agua-tint'
                              : 'border-linha border-b-linha bg-canvas'
                        }`}>
                        <GardenArt id={elemento.id} size={64} />
                        <Text
                          maxFontSizeMultiplier={1.2}
                          className={`font-displayBold text-sm ${
                            jaTem ? 'text-meta' : 'text-texto-soft'
                          }`}>
                          {elemento.name}
                        </Text>
                        {!jaTem && (
                          <View className="flex-row items-center gap-1">
                            {/* 15 e não 12: `Droplets` tem duas gotas sobrepostas, e em
                                12px os traços se fundiam num borrão que não lia como
                                gota nenhuma. */}
                            <Droplets
                              size={15}
                              color={podeComprar ? tokens.agua : tokens.textoOff}
                              strokeWidth={2.5}
                            />
                            <Text
                              maxFontSizeMultiplier={1.2}
                              className={`font-displayBold text-sm ${
                                podeComprar ? 'text-agua' : 'text-texto-off'
                              }`}>
                              {elemento.cost}
                            </Text>
                          </View>
                        )}
                      </Pressable3D>
                    );
                  })}
                  {/* Preenche a linha incompleta para os cards não esticarem */}
                  {trio.length < 3 &&
                    Array.from({ length: 3 - trio.length }, (_, i) => (
                      <View key={`vazio-${i}`} className="flex-1" />
                    ))}
                </View>
              ))}
            </View>
          </Card>

          {/* Marcos de vida (§4.5) */}
          <Card>
            <View className="flex-row items-center justify-between pb-3">
              <Text maxFontSizeMultiplier={1.3} className="font-displayBold text-xl text-texto">
                Sua marca
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Compartilhar"
                onPress={() => {
                  tapFeedback();
                  compartilhar();
                }}
                className="min-h-[44px] flex-row items-center gap-1.5 px-1">
                <Share2 size={19} color={tokens.agua} strokeWidth={2.5} />
                <Text maxFontSizeMultiplier={1.2} className="font-displayBold text-base text-agua">
                  Compartilhar
                </Text>
              </Pressable>
            </View>

            <View className="gap-4">
              {marcos.map((marco) => {
                const fracao = marco.target > 0 ? Math.min(1, marco.current / marco.target) : 0;
                return (
                  <View key={marco.id} className="gap-1.5">
                    <View className="flex-row items-center justify-between gap-3">
                      <Text maxFontSizeMultiplier={1.3} className="font-body text-base text-texto-soft">
                        {marco.label}
                      </Text>
                      <Text maxFontSizeMultiplier={1.3} className="font-displayBold text-base text-texto">
                        {marco.current}
                        {marco.reached ? '' : ` / ${marco.target}`}
                      </Text>
                    </View>
                    {/* Trilha de 10px, não 8: com o rótulo em 16px a barra fina parecia
                        um detalhe solto abaixo do texto em vez do par dele. */}
                    <View className="h-2.5 w-full overflow-hidden rounded-pill bg-linha">
                      <View
                        className="h-full rounded-pill"
                        style={{
                          width: `${Math.round(fracao * 100)}%`,
                          backgroundColor: tokens.agua,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
