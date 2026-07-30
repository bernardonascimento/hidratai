import { CalendarCheck, Check, Droplets, Star, Target } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { EntryList, horaDe } from '@/components/EntryList';
import { MonthCalendar } from '@/components/MonthCalendar';
import { Pressable3D } from '@/components/Pressable3D';
import { SegmentedPills } from '@/components/SegmentedPills';
import { WeekBars } from '@/components/WeekBars';
import { YearBars } from '@/components/YearBars';
import { WATER_DRINK_ID } from '@/domain/drinks';
import { monthGrid, shortDate, statsOf, weekSlots, yearMonths } from '@/domain/history';
import { formatVolume } from '@/lib/format';
import { tokens } from '@/design/tokens';
import { registerFeedback } from '@/lib/haptics';
import { syncReminders } from '@/lib/notifications';
import {
  useTodayEntries,
  useTodayHydrationMl,
  useWater,
  useYesterdayLog,
} from '@/store/useWater';
import type { Entry } from '@/domain/types';

type Vista = 'semana' | 'mes' | 'ano';
type Dia = 'hoje' | 'ontem';

const DIAS: { value: Dia; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
];

/** Volumes do preenchimento retroativo — os mesmos presets da tela Hoje. */
const VOLUMES_RETRO = [200, 300, 500];

const VISTAS: { value: Vista; label: string }[] = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
];

export default function Historico() {
  const days = useWater((s) => s.days);
  const goalMl = useWater((s) => s.goalMl);
  const removeEntry = useWater((s) => s.removeEntry);
  const addEntryYesterday = useWater((s) => s.addEntryYesterday);
  const entriesHoje = useTodayEntries();
  const totalHoje = useTodayHydrationMl();
  const ontem = useYesterdayLog();
  const [vista, setVista] = useState<Vista>('semana');
  const [dia, setDia] = useState<Dia>('hoje');

  const olhandoOntem = dia === 'ontem';
  const entries = olhandoOntem ? (ontem?.entries ?? []) : entriesHoje;
  const total = olhandoOntem ? (ontem?.totalHydrationMl ?? 0) : totalHoje;

  /**
   * Confirma antes de apagar. Não é zelo excessivo: um registro apagado **não
   * volta** com o horário original — `addEntry` marca sempre "agora" —, então um
   * toque errado custa o dado, não só um passo a mais.
   */
  function confirmarExclusao(entry: Entry) {
    Alert.alert(
      'Apagar registro?',
      `${formatVolume(entry.volumeMl)} das ${horaDe(entry.at)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            removeEntry(entry.id);
            registerFeedback();
            // Apagar pode tirar o dia de cima da meta: os avisos de hoje voltam.
            syncReminders();
          },
        },
      ],
    );
  }

  const semana = weekSlots(days, goalMl);
  const grade = monthGrid(days, goalMl);
  const ano = yearMonths(days);
  // As estatísticas seguem o recorte escolhido; no ano, o mês corrente é o recorte
  // mais próximo que existe — a média anual seria outra conta.
  const stats = statsOf(vista === 'semana' ? semana : grade.slots);

  return (
    <View className="flex-1">
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}
          showsVerticalScrollIndicator={false}>
          <Text className="pt-2 font-displayBold text-2xl text-texto">Histórico</Text>

          <SegmentedPills options={VISTAS} value={vista} onChange={setVista} />

          {vista === 'semana' && (
            <Card>
              <WeekBars slots={semana} />
            </Card>
          )}

          {vista === 'mes' && (
            <Card>
              <MonthCalendar grade={grade} />
            </Card>
          )}

          {vista === 'ano' && (
            <Card>
              <YearBars meses={ano} goalMl={goalMl} mesAtual={grade.month} />
            </Card>
          )}

          {/* Rodapé de estatísticas (§5.4) */}
          <Card>
            <View className="gap-3.5">
              <Linha
                Icone={Droplets}
                rotulo="Média diária"
                valor={stats.daysTracked > 0 ? formatVolume(stats.averageMl) : '—'}
              />
              <Linha
                Icone={Star}
                rotulo="Melhor dia"
                valor={
                  stats.bestDate
                    ? `${formatVolume(stats.bestMl)} · ${shortDate(stats.bestDate)}`
                    : '—'
                }
              />
              <Linha Icone={Target} rotulo="Metas batidas" valor={`${stats.goalsMet}`} />
              <Linha Icone={CalendarCheck} rotulo="Dias registrados" valor={`${stats.daysTracked}`} />
            </View>
          </Card>

          {/* Registros do dia, com o apagar de cada um e o preenchimento de ontem.
              A lista mostra só os primeiros: um dia de quinze registros virava um
              card de tela inteira. */}
          <Card>
            <SegmentedPills options={DIAS} value={dia} onChange={setDia} />

            {/* O resumo só aparece quando há registro: com a lista vazia, "sem
                registros" repetia em cinza claro o que a frase logo abaixo já dizia por
                extenso — dois avisos para a mesma ausência. */}
            {(entries.length > 0 || (olhandoOntem && ontem?.metGoal)) && (
              <View className="flex-row items-baseline justify-between gap-3 pb-2 pt-3">
                {entries.length > 0 && (
                  <Text maxFontSizeMultiplier={1.3} className="font-body text-base text-texto-soft">
                    {`${formatVolume(total)} em ${entries.length} ${
                      entries.length === 1 ? 'registro' : 'registros'
                    }`}
                  </Text>
                )}
                {olhandoOntem && ontem?.metGoal && (
                  <View className="flex-row items-center gap-1.5 rounded-pill border-2 border-meta bg-meta-tint px-2.5 py-1">
                    <Check size={15} color={tokens.meta} strokeWidth={3} />
                    <Text
                      maxFontSizeMultiplier={1.2}
                      className="font-displayBold text-sm text-meta">
                      meta batida
                    </Text>
                  </View>
                )}
              </View>
            )}

            <EntryList
              entries={entries}
              onRemove={confirmarExclusao}
              emptyLabel={
                olhandoOntem
                  ? 'Nada registrado ontem. Dá para preencher abaixo.'
                  : 'Nenhum registro hoje. O que você beber aparece aqui.'
              }
            />

            {olhandoOntem && (
              <View className="gap-2 pt-4">
                <Text
                  maxFontSizeMultiplier={1.3}
                  className="font-body text-sm text-texto-soft">
                  Bebeu e esqueceu de marcar? Preencha aqui — a ofensiva é recalculada. Sem
                  XP: pontuar o passado seria fácil demais.
                </Text>
                <View className="flex-row gap-2">
                  {VOLUMES_RETRO.map((ml) => (
                    <Pressable3D
                      key={ml}
                      accessibilityRole="button"
                      accessibilityLabel={`Adicionar ${ml} mililitros a ontem`}
                      onPress={() => {
                        addEntryYesterday(WATER_DRINK_ID, ml);
                        registerFeedback();
                      }}
                      className="flex-1"
                      faceClassName="min-h-[48px] items-center justify-center rounded-2xl border-2 border-agua border-b-agua-lip bg-agua-tint py-3">
                      <Text
                        maxFontSizeMultiplier={1.3}
                        className="font-displayBold text-lg text-agua">{`+ ${ml}`}</Text>
                    </Pressable3D>
                  ))}
                </View>
              </View>
            )}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/**
 * Linha de estatística: rótulo à esquerda, valor e ícone à direita.
 *
 * O ícone fica **depois** do valor, encostado na borda, para os quatro formarem uma
 * coluna alinhada — os valores têm larguras muito diferentes ("4,4 L" contra
 * "5,0 L · 29/07"), e com o ícone antes do valor a coluna sairia serrilhada.
 *
 * `w-6` no ícone é o que garante esse alinhamento: sem largura fixa, cada glifo puxaria
 * a coluna para um lado diferente.
 */
function Linha({
  Icone,
  rotulo,
  valor,
}: {
  Icone: LucideIcon;
  rotulo: string;
  valor: string;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text maxFontSizeMultiplier={1.3} className="font-body text-lg text-texto-soft">
        {rotulo}
      </Text>
      <View className="flex-row items-center gap-2.5">
        <Text maxFontSizeMultiplier={1.3} className="font-displayBold text-lg text-texto">
          {valor}
        </Text>
        <View className="w-6 items-center">
          <Icone size={19} color={tokens.agua} strokeWidth={2.4} />
        </View>
      </View>
    </View>
  );
}
