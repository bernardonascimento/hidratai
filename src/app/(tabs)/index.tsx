import { GlassWater, ListChecks } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bubbles } from '@/components/Bubbles';
import { Button } from '@/components/Button';
import { Celebration } from '@/components/Celebration';
import { DayResult } from '@/components/DayResult';
import { Gotinha } from '@/components/Gotinha';
import { MissionsPanel } from '@/components/MissionsPanel';
import { QuickAccess } from '@/components/QuickAccess';
import { SpeechBubble } from '@/components/SpeechBubble';
import { BOTTLE_VIEWBOX, ProgressBottle } from '@/components/ProgressBottle';
import { StatusHud } from '@/components/StatusHud';

import { VolumeCard } from '@/components/VolumeCard';
import { tokens } from '@/design/tokens';
import { WATER_DRINK_ID } from '@/domain/drinks';
import { mascotMood, mascotPhrase } from '@/domain/mascot';
import { missionStatus } from '@/domain/missions';
import { tipForDate } from '@/domain/tips';
import { previousDay } from '@/lib/date';
import { formatVolume } from '@/lib/format';
import { registerFeedback, successFeedback } from '@/lib/haptics';
import { syncReminders } from '@/lib/notifications';
import { useGamification } from '@/store/useGamification';
import { useProfile } from '@/store/useProfile';
import { useLogicalDay } from '@/store/useLogicalDay';
import { useUndoToast } from '@/store/useUndoToast';
import {
  useTodayEntries,
  useTodayHydrationMl,
  useTodayLog,
  useWater,
  useYesterdayLog,
} from '@/store/useWater';

/**
 * Altura da fila de volumes, fixa.
 *
 * É o que garante que **nada** abaixo dela se mexa durante um toque. O `Pressable3D`
 * mantém a altura constante trocando 2px de borda por 2px de padding, mas essa troca só
 * fecha quando a altura da face vem do conteúdo; com altura mínima, ela não fecha e o
 * bloco cresce 2px no press. Fixando a fila, o caso deixa de existir.
 *
 * Em 80 o conteúdo mais alto (ícone de 34 + rótulo de 18px = 63) só cabe com o padding
 * vertical do card reduzido — veja `VolumeCard`. Mexer neste número sem olhar lá aperta
 * o ícone.
 */
const VOLUME_ROW_H = 80;

/** O tamanho do ícone cresce com o volume: a figura comunica antes do número. */
const VOLUMES = [
  { ml: 200, iconSize: 22 },
  { ml: 300, iconSize: 28 },
  { ml: 500, iconSize: 34 },
];

/**
 * Altura reservada para tudo que **não** é a garrafa: HUD, fala, cartões, ação
 * primária, a tabBar e os espaçamentos entre eles.
 *
 * Só os espaços são fixos; a garrafa é quem absorve a diferença de tela. Por isso a
 * conta usa o inset real em vez da altura crua: o SE tem 20pt de inset contra 59 de um
 * Pro, e ignorar isso faria a garrafa encolher onde havia espaço.
 *
 * Histórico do número, porque ele é calibração e não dedução: 443 dava escala 1,5;
 * 406 dava 1,65 e deixou a ação primária a 8pt da tabBar — perto demais, medido em
 * tela. Em 418 a escala fica 1,60 e a folga volta para ~20pt.
 */
const ALTURA_SEM_GARRAFA = 418;
/** Menor que isto a garrafa perde a leitura de garrafa; maior, invade a largura. */
const ESCALA_MIN = 0.85;
/**
 * Teto. Subiu de 1,75 para 1,85 para o Pro Max aproveitar a altura que tem: ele batia
 * no teto com 62pt de folga sobrando, ou seja, o limite estava desperdiçando tela.
 */
const ESCALA_MAX = 1.85;

export default function Hoje() {
  const goalMl = useWater((s) => s.goalMl);
  const addEntry = useWater((s) => s.addEntry);

  // XP e ofensiva agora vêm da store de gamificação, não da água.
  const xp = useGamification((s) => s.xp);
  const streak = useGamification((s) => s.streak);
  const missionIds = useGamification((s) => s.missionIds);

  const total = useTodayHydrationMl();
  const entries = useTodayEntries();
  const hoje = useTodayLog();
  const ontem = useYesterdayLog();

  const missoes = missionStatus(missionIds, { day: hoje, previousDay: ontem });
  const missoesCumpridas = missoes.filter((m) => m.done).length;
  const todasMissoes = missoes.length > 0 && missoesCumpridas === missoes.length;

  // Resultado do dia (§4.4): mostra uma vez por dia, e só se ontem existiu de
  // fato — quem instalou hoje não tem "ontem" para resumir.
  const resultShownFor = useGamification((s) => s.resultShownFor);
  const yesterdayMissionIds = useGamification((s) => s.yesterdayMissionIds);
  const freezesUsedOn = useGamification((s) => s.freezesUsedOn);
  const markResultShown = useGamification((s) => s.markResultShown);

  // Do store reativo, não de `dayKey()`: com o app aberto na virada das 03:00 este
  // valor precisa mudar sozinho.
  const dataDeHoje = useLogicalDay((s) => s.today);
  const dataDeOntem = previousDay(dataDeHoje);
  const mostrarResultado =
    resultShownFor !== dataDeHoje && ontem !== undefined && ontem.entries.length > 0;
  const missoesDeOntem = missionStatus(yesterdayMissionIds, { day: ontem });

  // A garrafa é o único elemento que muda de tamanho com a tela: os espaços são
  // fixos, então é ela que absorve a diferença.
  const { height: alturaTela } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const escalaGarrafa = Math.min(
    ESCALA_MAX,
    Math.max(ESCALA_MIN, (alturaTela - insets.top - ALTURA_SEM_GARRAFA) / BOTTLE_VIEWBOX.h),
  );

  const [selecionado, setSelecionado] = useState(300);
  const [pulse, setPulse] = useState(0);
  const [celebracao, setCelebracao] = useState<{ xp: number; streak: number } | null>(null);
  const [missoesAbertas, setMissoesAbertas] = useState(false);

  // O toast vive no layout raiz para poder cobrir a tabBar; aqui só se avisa.
  const mostrarDesfazer = useUndoToast((s) => s.mostrar);
  const limparDesfazer = useUndoToast((s) => s.limpar);

  const progresso = goalMl > 0 ? total / goalMl : 0;
  const bateuMeta = total >= goalMl;

  // Estado e fala vêm do mesmo lugar (§8.2). Antes eram duas réguas: o rosto
  // olhava a contagem de registros e a frase olhava o progresso, então dava para
  // ver a Gotinha comemorando ao lado de um texto de "bom começo".
  const rotina = useProfile((s) => s.profile);
  const agora = new Date();
  const mood = mascotMood({
    progress: progresso,
    minutesOfDay: agora.getHours() * 60 + agora.getMinutes(),
    wakeMinutes: rotina.wakeMinutes,
    sleepMinutes: rotina.sleepMinutes,
  });

  function onBebi() {
    const resultado = addEntry(WATER_DRINK_ID, selecionado);
    setPulse((p) => p + 1);
    // Reagenda porque o registro pode ter batido a meta, e isso cala o resto do
    // dia (§6.1). Chamado daqui e não de dentro do store: `syncReminders` lê as
    // stores, e chamá-lo lá dentro faria `useWater` importar quem o importa.
    syncReminders();

    if (resultado.metGoalNow) {
      successFeedback();
      setCelebracao({ xp: resultado.xpGained, streak: resultado.streak });
      // A celebração toma a tela: dois avisos ao mesmo tempo competem, e desfazer
      // o registro que **acabou de bater a meta** não é o que ninguém quer ali.
      limparDesfazer();
    } else {
      registerFeedback();
      mostrarDesfazer({ entryId: resultado.entryId, volumeMl: selecionado });
    }
  }

  return (
    <View className="flex-1">
      {/* Bolhas só aqui: no onboarding e nas outras abas o fundo fica parado */}
      <Bubbles />

      {/* Só o topo: a tabBar já cobre a área segura de baixo, e pedir o edge
          `bottom` aqui punha 34pt de padding morto entre o fim do ScrollView e a
          tabBar — o conteúdo era cortado ali, com o último botão pela metade. */}
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}>
          {/* HUD: nível à esquerda, ofensiva e XP à direita. O atalho fica
              **sobreposto**, não no fluxo: somar altura aqui empurrava a ação
              primária para fora da tela. */}
          {/* O padding compensa o HUD ter crescido: sem isto a garrafa desce
              ~11pt e toda a tela escorrega junto. Medido em tela. */}
          <View className="py-1.5">
            <StatusHud xp={xp} streak={streak} />
          </View>

          <View className="absolute right-5 top-[80px] z-10">
            <QuickAccess
              accessibilityLabel={`Missões de hoje: ${missoesCumpridas} de ${missoes.length}`}
              icon={
                <ListChecks
                  size={32}
                  color={todasMissoes ? tokens.meta : tokens.agua}
                  strokeWidth={2.5}
                />
              }
              badge={todasMissoes ? '✓' : `${missoesCumpridas}/${missoes.length}`}
              badgeDone={todasMissoes}
              onPress={() => {
                // Sai da frente: com o painel aberto o toast fica atrás do escuro,
                // e reaparecer depois que ele fecha não faz sentido nenhum.
                limparDesfazer();
                setMissoesAbertas(true);
              }}
            />
          </View>

          {/* A garrafa sozinha é o herói da tela: duas figuras grandes
              empilhadas criavam duas âncoras visuais competindo. */}
          <View className="items-center pt-[18px]">
            <ProgressBottle
              hydrationMl={total}
              goalMl={goalMl}
              pulse={pulse}
              scale={escalaGarrafa}
            />
          </View>

          {/* A frase é a voz da Gotinha, então vira **fala**: ela ao lado, o texto
              num balão apontando para ela. Pequena de propósito — aqui ela
              comenta, a garrafa é que informa.
              O gap é curto porque o bico do balão já avança ~7px, e na altura do
              meio a silhueta da gota está bem dentro da caixa dela. */}
          <View className="flex-row items-center justify-center pb-4">
            {/* Margem negativa em vez de `gap`: na altura do bico a silhueta da gota
                está ~15pt dentro da caixa quadrada dela, então sem puxar o balão fica
                solto. Medido em tela: -6 deixava 13,7pt de folga; este valor fecha em
                ~18pt. */}
            <View style={{ marginRight: -2 }}>
              <Gotinha mood={mood} size={56} />
            </View>
            <SpeechBubble text={mascotPhrase(mood, entries.length > 0)} />
          </View>

          {/* Escolha do volume */}
          <View className="flex-row gap-3 pb-4" style={{ height: VOLUME_ROW_H + 16 }}>
            {VOLUMES.map((v) => (
              <VolumeCard
                key={v.ml}
                ml={v.ml}
                iconSize={v.iconSize}
                selected={selecionado === v.ml}
                onSelect={() => setSelecionado(v.ml)}
              />
            ))}
          </View>

          {/* Ação primária: mostra a bebida e o volume que vai registrar */}
          <Button
            label={`+ ${formatVolume(selecionado)}`}
            onPress={onBebi}
            variant={bateuMeta ? 'meta' : 'agua'}
            icon={<GlassWater size={22} color={tokens.canvas} strokeWidth={2.5} />}
          />

        </ScrollView>
      </SafeAreaView>

      {celebracao && (
        <Celebration
          xpGanho={celebracao.xp}
          streak={celebracao.streak}
          onClose={() => setCelebracao(null)}
        />
      )}

      {missoesAbertas && (
        <MissionsPanel missions={missoes} onClose={() => setMissoesAbertas(false)} />
      )}

      {/* A celebração tem precedência: o resumo de ontem espera a sua vez */}
      {!celebracao && mostrarResultado && ontem && (
        <DayResult
          day={ontem}
          missionsDone={missoesDeOntem.filter((m) => m.done).length}
          missionsTotal={missoesDeOntem.length}
          streak={streak}
          freezeUsed={freezesUsedOn.includes(dataDeOntem)}
          tip={tipForDate(dataDeHoje)}
          onClose={() => markResultShown(dataDeHoje)}
        />
      )}
    </View>
  );
}
