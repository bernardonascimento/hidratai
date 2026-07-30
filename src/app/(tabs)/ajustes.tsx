import {
  BellRing,
  Clock,
  Download,
  Info,
  Minus,
  Plus,
  Settings2,
  Snowflake,
  Target,
  Trash2,
  User,
  Vibrate,
  Wind,
} from 'lucide-react-native';
import { type ReactNode, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Pressable,
  ScrollView,
  Share,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { Pressable3D } from '@/components/Pressable3D';
import { tokens } from '@/design/tokens';
import { GOAL_MAX_ML, GOAL_MIN_ML, computeGoal } from '@/domain/goal';
import { ACTIVITY_OPTIONS, CLIMATE_OPTIONS } from '@/domain/profileOptions';
import { DEFAULT_REMINDERS, INTERVAL_OPTIONS, reminderSlots } from '@/domain/reminders';
import { formatClock, formatVolume } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';
import {
  hasNotificationPermission,
  requestNotificationPermission,
  syncReminders,
} from '@/lib/notifications';
import { DEFAULT_PROFILE, useProfile } from '@/store/useProfile';
import { useGamification } from '@/store/useGamification';
import { useSettings } from '@/store/useSettings';
import { useWater } from '@/store/useWater';

const INTERVALOS = INTERVAL_OPTIONS.map((min) => ({
  value: String(min),
  label: min >= 120 ? `${min / 60} h` : `${min} min`,
}));

/** Índice = `Date.getDay()`: 0 é domingo. */
const DIAS_DA_SEMANA = [
  { value: 0, letra: 'D', nome: 'Domingo' },
  { value: 1, letra: 'S', nome: 'Segunda' },
  { value: 2, letra: 'T', nome: 'Terça' },
  { value: 3, letra: 'Q', nome: 'Quarta' },
  { value: 4, letra: 'Q', nome: 'Quinta' },
  { value: 5, letra: 'S', nome: 'Sexta' },
  { value: 6, letra: 'S', nome: 'Sábado' },
];

export default function Ajustes() {
  const goalMl = useWater((s) => s.goalMl);
  const profile = useProfile((s) => s.profile);
  const goalOverride = useProfile((s) => s.goalOverride);
  const setProfile = useProfile((s) => s.setProfile);
  const setGoalOverride = useProfile((s) => s.setGoalOverride);

  const hapticsEnabled = useSettings((s) => s.hapticsEnabled);
  const forceReducedMotion = useSettings((s) => s.forceReducedMotion);
  const toggleHaptics = useSettings((s) => s.toggleHaptics);
  const toggleReducedMotion = useSettings((s) => s.toggleReducedMotion);

  const restDay = useGamification((s) => s.restDay);
  const setRestDay = useGamification((s) => s.setRestDay);

  const reminders = useProfile((s) => s.reminders);
  const setReminders = useProfile((s) => s.setReminders);

  /**
   * Permissão do sistema, que é coisa diferente da preferência do usuário: dá para
   * ter `reminders.enabled` verdadeiro e a permissão revogada nos Ajustes do iOS.
   * `null` = ainda checando.
   */
  const [permitido, setPermitido] = useState<boolean | null>(null);

  useEffect(() => {
    let vivo = true;
    const checar = () =>
      hasNotificationPermission().then((p) => {
        if (vivo) setPermitido(p);
      });

    checar();
    // Revalida ao voltar dos Ajustes do sistema — sem isto a tela seguiria dizendo
    // "bloqueado" depois de o usuário autorizar lá fora.
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') checar();
    });
    return () => {
      vivo = false;
      sub.remove();
    };
  }, []);

  /**
   * O que o switch mostra. Não é `reminders.enabled` puro: com a permissão revogada
   * no sistema, o lembrete não acontece, então mostrar "ligado" seria mentira — e o
   * toque precisa **tentar ligar** de novo, não desligar o que já não funciona.
   */
  const lembretesAtivos = reminders.enabled && permitido !== false;

  const slotsPrevistos = reminderSlots(
    profile.wakeMinutes,
    profile.sleepMinutes,
    reminders.intervalMinutes,
  );

  async function alternarLembretes(ligar: boolean) {
    if (ligar) {
      const ok = await requestNotificationPermission();
      setPermitido(ok);
      if (!ok) {
        Alert.alert(
          'Precisa autorizar no sistema',
          'O iOS pede essa permissão uma vez só. Abra os Ajustes para liberar as notificações do Hidrataí.',
          [
            { text: 'Deixa assim', style: 'cancel' },
            { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
    }

    setReminders({ enabled: ligar });
    await syncReminders();
  }

  async function trocarIntervalo(minutos: number) {
    setReminders({ intervalMinutes: minutos });
    await syncReminders();
  }

  /**
   * Mudar a rotina move a janela inteira, então precisa reagendar como qualquer
   * outra troca de configuração. Antes da F3 esses dois campos só existiam no
   * onboarding — quem mudava de turno ficava preso nos horários do primeiro dia.
   */
  async function trocarRotina(patch: { wakeMinutes?: number; sleepMinutes?: number }) {
    setProfile(patch);
    await syncReminders();
  }

  const sugerida = computeGoal(profile);

  async function exportar() {
    const agua = useWater.getState();
    // XP e ofensiva vêm da gamificação: os campos de mesmo nome em `useWater`
    // estão deprecados e param no valor da semente.
    const jogo = useGamification.getState();
    const dados = {
      app: 'Hidrataí',
      exportadoEm: new Date().toISOString(),
      metaMl: agua.goalMl,
      perfil: useProfile.getState().profile,
      jogo: {
        xp: jogo.xp,
        ofensiva: jogo.streak,
        recorde: jogo.bestStreak,
        congelamentos: jogo.freezesAvailable,
        diaLivre: jogo.restDay,
        gotas: jogo.drops,
        cantinho: jogo.gardenUnlocked,
        mlNaVida: jogo.lifetimeMl,
      },
      dias: agua.days,
    };
    try {
      await Share.share({ message: JSON.stringify(dados, null, 2) });
    } catch {
      // Cancelar o share sheet não é erro.
    }
  }

  function apagarTudo() {
    Alert.alert(
      'Apagar todos os dados?',
      'O histórico, a ofensiva e o XP somem deste aparelho. Não há como desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Tem certeza?', 'Última confirmação antes de apagar tudo.', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Apagar',
                style: 'destructive',
                onPress: async () => {
                  await Promise.resolve(useWater.persist.clearStorage());
                  await Promise.resolve(useProfile.persist.clearStorage());
                  await Promise.resolve(useGamification.persist.clearStorage());
                  useWater.setState({ days: {}, xp: 0, streak: 0, lastMetDate: null });
                  // Sem isto, ofensiva, XP, gotas e cantinho sobreviveriam ao
                  // "apagar tudo" — o pior tipo de bug de privacidade.
                  useGamification.getState().reset();
                  useProfile.setState({
                    profile: DEFAULT_PROFILE,
                    goalOverride: null,
                    onboardingDone: false,
                    // `reminders` também: sem isto o intervalo escolhido sobrevivia ao
                    // apagar — e, pior, `enabled: true` sobrevivia junto, então o app
                    // seguia notificando alguém que acabou de apagar tudo.
                    reminders: DEFAULT_REMINDERS,
                  });
                  // Cancela o que já estava agendado. `syncReminders` é idempotente e,
                  // com o lembrete desligado, o efeito dele é limpar a fila — sem esta
                  // chamada as notificações pendentes seguiriam disparando até o próximo
                  // foreground do app.
                  await syncReminders();
                },
              },
            ]),
        },
      ],
    );
  }

  return (
    <View className="flex-1">
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}
          showsVerticalScrollIndicator={false}>
          <Text className="pt-2 font-displayBold text-2xl text-texto">Ajustes</Text>

          {/* Meta diária */}
          <Card>
            <Cabecalho icone={<Target size={20} color={tokens.agua} strokeWidth={2.5} />} titulo="Meta diária" />

            <View className="flex-row items-center justify-between pt-3">
              <Passo
                rotulo="Diminuir 50 mililitros"
                icone={<Minus size={22} color={tokens.texto} strokeWidth={3} />}
                onPress={() => setGoalOverride(goalMl - 50)}
              />
              <Text className="font-displayBold text-3xl text-texto">{formatVolume(goalMl)}</Text>
              <Passo
                rotulo="Aumentar 50 mililitros"
                icone={<Plus size={22} color={tokens.texto} strokeWidth={3} />}
                onPress={() => setGoalOverride(goalMl + 50)}
              />
            </View>

            <Text className="pt-3 font-body text-sm text-texto-soft">
              É uma estimativa de hábito, não recomendação médica. O limite vai de{' '}
              {formatVolume(GOAL_MIN_ML)} a {formatVolume(GOAL_MAX_ML)}: beber água em excesso
              também faz mal.
            </Text>

            {goalOverride !== null && goalOverride !== sugerida && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  tapFeedback();
                  setGoalOverride(null);
                }}
                className="min-h-[44px] justify-center">
                <Text maxFontSizeMultiplier={1.2} className="font-displayBold text-base text-agua">
                  Voltar para a sugerida ({formatVolume(sugerida)})
                </Text>
              </Pressable>
            )}
          </Card>

          {/* Perfil */}
          <Card>
            <Cabecalho icone={<User size={20} color={tokens.agua} strokeWidth={2.5} />} titulo="Perfil" />

            <View className="flex-row items-center justify-between pt-3">
              <Text maxFontSizeMultiplier={1.3} className="font-body text-lg text-texto-soft">Peso</Text>
              <View className="flex-row items-center gap-4">
                <Passo
                  rotulo="Diminuir 1 quilo"
                  icone={<Minus size={18} color={tokens.texto} strokeWidth={3} />}
                  onPress={() => setProfile({ weightKg: Math.max(30, profile.weightKg - 1) })}
                />
                <Text className="w-[76px] text-center font-displayBold text-xl text-texto">
                  {profile.weightKg} kg
                </Text>
                <Passo
                  rotulo="Aumentar 1 quilo"
                  icone={<Plus size={18} color={tokens.texto} strokeWidth={3} />}
                  onPress={() => setProfile({ weightKg: Math.min(250, profile.weightKg + 1) })}
                />
              </View>
            </View>

            <Escolha
              rotulo="Atividade"
              opcoes={ACTIVITY_OPTIONS}
              valor={profile.activity}
              onChange={(activity) => setProfile({ activity })}
            />

            <Escolha
              rotulo="Clima"
              opcoes={CLIMATE_OPTIONS}
              valor={profile.climate}
              onChange={(climate) => setProfile({ climate })}
            />

            <Text className="pt-3 font-body text-sm text-texto-soft">
              Com esse perfil, a meta sugerida é {formatVolume(sugerida)}.
            </Text>
          </Card>

          {/* Lembretes (§6) */}
          <Card>
            <Interruptor
              icone={<BellRing size={20} color={tokens.agua} strokeWidth={2.5} />}
              titulo="Lembretes"
              descricao="Avisos leves ao longo do dia"
              valor={lembretesAtivos}
              onChange={() => {
                alternarLembretes(!lembretesAtivos);
              }}
            />

            {permitido === false && reminders.enabled && (
              <View className="mt-3 rounded-2xl border-2 border-linha bg-linha-sutil p-3">
                <Text className="font-body text-sm text-texto-soft">
                  Você ligou os lembretes aqui, mas o sistema está bloqueando. Libere nos
                  Ajustes do iPhone.
                </Text>
                <View className="h-2" />
                <Acao
                  icone={<Settings2 size={20} color={tokens.agua} strokeWidth={2.5} />}
                  titulo="Abrir Ajustes do sistema"
                  onPress={() => Linking.openSettings()}
                />
              </View>
            )}

            {reminders.enabled && permitido && (
              <>
                <Escolha
                  rotulo="A cada"
                  opcoes={INTERVALOS}
                  valor={String(reminders.intervalMinutes)}
                  onChange={(v) => trocarIntervalo(Number(v))}
                />

                {/* A rotina vive aqui, e não no card de Perfil, porque hoje ela só
                    serve para os lembretes: `computeGoal` não usa acordar/dormir. Se
                    um dia passar a usar, ela sobe para o Perfil. */}
                <View className="mt-4 gap-3 border-t border-linha-sutil pt-4">
                  <View className="flex-row items-center justify-between">
                    <Text maxFontSizeMultiplier={1.3} className="font-body text-lg text-texto-soft">Acordo às</Text>
                    <View className="flex-row items-center gap-4">
                      <Passo
                        rotulo="Acordar 30 minutos mais cedo"
                        icone={<Minus size={18} color={tokens.texto} strokeWidth={3} />}
                        onPress={() =>
                          trocarRotina({ wakeMinutes: Math.max(0, profile.wakeMinutes - 30) })
                        }
                      />
                      <Text className="w-[76px] text-center font-displayBold text-xl text-texto">
                        {formatClock(profile.wakeMinutes)}
                      </Text>
                      <Passo
                        rotulo="Acordar 30 minutos mais tarde"
                        icone={<Plus size={18} color={tokens.texto} strokeWidth={3} />}
                        onPress={() =>
                          trocarRotina({ wakeMinutes: Math.min(720, profile.wakeMinutes + 30) })
                        }
                      />
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text maxFontSizeMultiplier={1.3} className="font-body text-lg text-texto-soft">Durmo às</Text>
                    <View className="flex-row items-center gap-4">
                      <Passo
                        rotulo="Dormir 30 minutos mais cedo"
                        icone={<Minus size={18} color={tokens.texto} strokeWidth={3} />}
                        onPress={() =>
                          trocarRotina({ sleepMinutes: Math.max(720, profile.sleepMinutes - 30) })
                        }
                      />
                      <Text className="w-[76px] text-center font-displayBold text-xl text-texto">
                        {formatClock(profile.sleepMinutes)}
                      </Text>
                      <Passo
                        rotulo="Dormir 30 minutos mais tarde"
                        icone={<Plus size={18} color={tokens.texto} strokeWidth={3} />}
                        onPress={() =>
                          trocarRotina({ sleepMinutes: Math.min(1439, profile.sleepMinutes + 30) })
                        }
                      />
                    </View>
                  </View>
                </View>

                <View className="mt-3 flex-row items-center gap-2">
                  <Clock size={16} color={tokens.textoOff} strokeWidth={2.5} />
                  <Text className="font-body text-sm text-texto-soft">
                    {slotsPrevistos.length > 0
                      ? `${slotsPrevistos.length} avisos, das ${formatClock(slotsPrevistos[0])} às ${formatClock(slotsPrevistos.at(-1) ?? 0)}`
                      : 'Sua rotina é curta demais para avisos espaçados'}
                  </Text>
                </View>
              </>
            )}
          </Card>

          {/* Dia livre da ofensiva (§4.3 do PLANO-GAMIFICACAO) */}
          <Card>
            <Cabecalho
              icone={<Snowflake size={20} color={tokens.agua} strokeWidth={2.5} />}
              titulo="Dia livre"
            />
            <Text className="pt-2 font-body text-sm text-texto-soft">
              Um dia da semana que não quebra a ofensiva. Para quem tem uma rotina que
              muda — e não deveria perder a sequência por isso.
            </Text>

            <View className="flex-row gap-1.5 pt-3">
              {DIAS_DA_SEMANA.map((dia) => {
                const ativo = restDay === dia.value;
                return (
                  <Pressable
                    key={dia.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ativo }}
                    accessibilityLabel={dia.nome}
                    onPress={() => {
                      tapFeedback();
                      setRestDay(ativo ? null : dia.value);
                    }}
                    className={`min-h-[44px] flex-1 items-center justify-center rounded-2xl border-2 ${
                      ativo ? 'border-agua bg-agua-tint' : 'border-linha bg-canvas'
                    }`}>
                    <Text
                      className={`text-base ${
                        ativo ? 'font-displayBold text-agua' : 'font-display text-texto-soft'
                      }`}>
                      {dia.letra}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="pt-2 font-body text-sm text-texto-soft">
              {restDay === null
                ? 'Nenhum dia livre. Toque num dia para escolher.'
                : `${DIAS_DA_SEMANA[restDay].nome} está livre. Toque de novo para remover.`}
            </Text>
          </Card>

          {/* Interruptores */}
          <Card>
            <Interruptor
              icone={<Vibrate size={20} color={tokens.agua} strokeWidth={2.5} />}
              titulo="Vibração"
              valor={hapticsEnabled}
              onChange={toggleHaptics}
            />
            <View className="h-3" />
            <Interruptor
              icone={<Wind size={20} color={tokens.agua} strokeWidth={2.5} />}
              titulo="Reduzir movimento"
              descricao="Corta as animações, mesmo que o sistema não peça"
              valor={forceReducedMotion}
              onChange={toggleReducedMotion}
            />
          </Card>

          {/* Dados */}
          <Card>
            <Acao
              icone={<Download size={20} color={tokens.agua} strokeWidth={2.5} />}
              titulo="Exportar dados"
              descricao="Seu histórico em JSON"
              onPress={exportar}
            />
            <View className="h-2" />
            <Acao
              icone={<Trash2 size={20} color={tokens.atencao} strokeWidth={2.5} />}
              titulo="Apagar tudo"
              descricao="Confirmação dupla"
              destrutivo
              onPress={apagarTudo}
            />
          </Card>

          <Card>
            <Cabecalho icone={<Info size={20} color={tokens.textoOff} strokeWidth={2.5} />} titulo="Sobre" />
            <Text className="pt-2 font-body text-sm text-texto-soft">
              Hidrataí 1.0.0 — tudo fica no seu aparelho. Sem conta, sem nuvem, sem anúncio.
            </Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Cabecalho({ icone, titulo }: { icone: ReactNode; titulo: string }) {
  return (
    <View className="flex-row items-center gap-2">
      {icone}
      <Text maxFontSizeMultiplier={1.3} className="font-displayBold text-xl text-texto">
        {titulo}
      </Text>
    </View>
  );
}

function Passo({
  icone,
  onPress,
  rotulo,
}: {
  icone: ReactNode;
  onPress: () => void;
  rotulo: string;
}) {
  // Usa a mesma base dos outros pressáveis: sem isto, estes eram os únicos
  // botões do app sem lip nem reação ao toque.
  return (
    <Pressable3D
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      faceClassName="h-12 w-12 items-center justify-center rounded-2xl border-2 border-linha border-b-linha bg-canvas">
      {icone}
    </Pressable3D>
  );
}

function Escolha<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
}: {
  rotulo: string;
  opcoes: { value: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="pt-4">
      <Text maxFontSizeMultiplier={1.3} className="pb-2 font-body text-lg text-texto-soft">
        {rotulo}
      </Text>
      <View className="flex-row gap-2">
        {opcoes.map((opcao) => {
          const ativo = opcao.value === valor;
          return (
            <Pressable
              key={opcao.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={opcao.label}
              onPress={() => {
                tapFeedback();
                onChange(opcao.value);
              }}
              className={`min-h-[48px] flex-1 items-center justify-center rounded-2xl border-2 px-2 ${
                ativo ? 'border-agua bg-agua-tint' : 'border-linha bg-canvas'
              }`}>
              {/* Mesma regra do `SegmentedPills`: fonte 16 e negrito no selecionado —
                  peso é sinal que não depende de distinguir tons. */}
              <Text
                className={`text-base ${
                  ativo ? 'font-displayBold text-agua' : 'font-display text-texto-soft'
                }`}>
                {opcao.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Interruptor({
  icone,
  titulo,
  descricao,
  valor,
  onChange,
}: {
  icone: ReactNode;
  titulo: string;
  descricao?: string;
  valor: boolean;
  onChange: () => void;
}) {
  return (
    <View className="min-h-[56px] flex-row items-center justify-between gap-3">
      <View className="flex-1 flex-row items-center gap-2">
        {icone}
        <View className="flex-1">
          <Text maxFontSizeMultiplier={1.3} className="font-displayBold text-lg text-texto">
            {titulo}
          </Text>
          {descricao && <Text className="font-body text-sm text-texto-soft">{descricao}</Text>}
        </View>
      </View>
      <Switch
        value={valor}
        onValueChange={() => {
          tapFeedback();
          onChange();
        }}
        trackColor={{ false: tokens.linha, true: tokens.agua }}
        thumbColor={tokens.canvas}
        accessibilityLabel={titulo}
      />
    </View>
  );
}

function Acao({
  icone,
  titulo,
  descricao,
  onPress,
  destrutivo,
}: {
  icone: ReactNode;
  titulo: string;
  descricao?: string;
  onPress: () => void;
  destrutivo?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      className="min-h-[64px] flex-row items-center gap-3">
      {icone}
      <View className="flex-1">
        <Text
          maxFontSizeMultiplier={1.3}
          className={`font-displayBold text-lg ${destrutivo ? 'text-atencao' : 'text-texto'}`}>
          {titulo}
        </Text>
        {descricao && <Text className="font-body text-sm text-texto-soft">{descricao}</Text>}
      </View>
    </Pressable>
  );
}
