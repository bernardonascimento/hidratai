import { Flame, Snowflake, Trophy, Zap } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AchievementTile } from '@/components/AchievementTile';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { tokens } from '@/design/tokens';
import { achievementsOf } from '@/domain/achievements';
import { levelFromXp, levelProgress, xpForLevel } from '@/domain/goal';
import { nextStage, stageForLevel } from '@/domain/levels';
import { useGamification } from '@/store/useGamification';
import { useWater } from '@/store/useWater';

export default function Conquistas() {
  const days = useWater((s) => s.days);

  const streak = useGamification((s) => s.streak);
  const bestStreak = useGamification((s) => s.bestStreak);
  const freezes = useGamification((s) => s.freezesAvailable);
  const xp = useGamification((s) => s.xp);

  const conquistas = achievementsOf({ days, streak });
  const desbloqueadas = conquistas.filter((c) => c.unlocked).length;

  const nivel = levelFromXp(xp);
  const progresso = levelProgress(xp);
  const faltaParaProximo = xpForLevel(nivel + 1) - xp;
  const estagio = stageForLevel(nivel);
  const proximoEstagio = nextStage(nivel);

  const pares: (typeof conquistas)[] = [];
  for (let i = 0; i < conquistas.length; i += 2) {
    pares.push(conquistas.slice(i, i + 2));
  }

  return (
    <View className="flex-1">
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}
          showsVerticalScrollIndicator={false}>
          <Text className="pt-2 font-displayBold text-2xl text-texto">Conquistas</Text>

          {/* Ofensiva */}
          <Card className="items-center">
            <View className="flex-row items-center gap-2">
              <Flame size={38} color={tokens.ofensiva} strokeWidth={2.5} />
              <Text className="font-displayBold text-4xl" style={{ color: tokens.ofensiva }}>
                {streak}
              </Text>
            </View>
            <Text maxFontSizeMultiplier={1.3} className="pt-1 font-body text-lg text-texto-soft">
              {streak === 1 ? 'dia de ofensiva' : 'dias de ofensiva'}
            </Text>

            {streak === 0 && (
              <Text
                maxFontSizeMultiplier={1.3}
                className="pt-2 text-center font-body text-base text-texto-soft">
                Recomeçar é normal. Bata a meta hoje para abrir uma nova.
              </Text>
            )}

            {/* A conversa é sobre o que se tem, nunca sobre o que se pode perder */}
            <View className="flex-row flex-wrap items-center justify-center gap-2 pt-3">
              {bestStreak > 0 && (
                <Pill
                  label={`Recorde: ${bestStreak} ${bestStreak === 1 ? 'dia' : 'dias'}`}
                  icon={<Trophy size={18} color={tokens.textoSoft} strokeWidth={2.5} />}
                />
              )}
              {freezes > 0 && (
                <Pill
                  tone="agua"
                  label={`${freezes} ${freezes === 1 ? 'congelamento' : 'congelamentos'}`}
                  icon={<Snowflake size={18} color={tokens.agua} strokeWidth={2.5} />}
                />
              )}
            </View>

            {freezes > 0 && (
              <Text
                maxFontSizeMultiplier={1.3}
                className="pt-2.5 text-center font-body text-sm text-texto-soft">
                Um dia sem bater a meta usa um congelamento e a ofensiva continua.
              </Text>
            )}
          </Card>

          {/* Nível com nome de estágio */}
          <Card>
            <View className="flex-row items-center justify-between pb-2">
              <View className="flex-row items-center gap-2">
                <Zap size={22} color={tokens.xp} strokeWidth={2.5} />
                <Text maxFontSizeMultiplier={1.3} className="font-displayBold text-xl text-texto">
                  {estagio.name} · nível {nivel}
                </Text>
              </View>
              <Text maxFontSizeMultiplier={1.2} className="font-displayBold text-base text-texto-soft">
                {xp} XP
              </Text>
            </View>

            <View className="h-3.5 w-full overflow-hidden rounded-pill bg-linha">
              <View
                className="h-full rounded-pill"
                style={{
                  width: `${Math.max(3, Math.round(progresso * 100))}%`,
                  backgroundColor: tokens.xp,
                }}
              />
            </View>
            <Text maxFontSizeMultiplier={1.3} className="pt-2.5 font-body text-sm text-texto-soft">
              {faltaParaProximo} XP para o nível {nivel + 1}
              {proximoEstagio ? ` · ${proximoEstagio.name} no nível ${proximoEstagio.from}` : ''}
            </Text>
          </Card>

          <Text maxFontSizeMultiplier={1.3} className="font-displayBold text-lg text-texto-soft">
            {desbloqueadas} de {conquistas.length} conquistadas
          </Text>

          <View className="gap-3">
            {pares.map((par) => (
              <View key={par[0].id} className="flex-row gap-3">
                {par.map((conquista) => (
                  <AchievementTile key={conquista.id} achievement={conquista} />
                ))}
                {par.length === 1 && <View className="flex-1" />}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
