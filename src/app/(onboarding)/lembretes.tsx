import { useRouter } from 'expo-router';
import { BellOff, BellRing, Clock } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { OnboardingStep } from '@/components/OnboardingStep';
import { tokens } from '@/design/tokens';
import { reminderSlots } from '@/domain/reminders';
import { formatClock } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';
import { requestNotificationPermission, syncReminders } from '@/lib/notifications';
import { useProfile } from '@/store/useProfile';

/**
 * Último passo: a permissão de notificação (§6.4).
 *
 * Pedimos **aqui** e não no boot porque o iOS dá uma chance só: negada, o diálogo
 * nunca volta. Então a tela primeiro mostra o que vai acontecer — com os horários
 * de verdade, tirados da rotina que a pessoa acabou de informar — e só depois abre
 * o diálogo do sistema.
 *
 * Negar não trava nada: o app segue igual, sem lembrete, e o caminho de volta fica
 * nos Ajustes.
 */
export default function Lembretes() {
  const router = useRouter();
  const perfil = useProfile((s) => s.profile);
  const reminders = useProfile((s) => s.reminders);
  const setReminders = useProfile((s) => s.setReminders);
  const completeOnboarding = useProfile((s) => s.completeOnboarding);
  const [pedindo, setPedindo] = useState(false);

  /**
   * Lê o intervalo **guardado**, não a constante padrão.
   *
   * Com `DEFAULT_INTERVAL_MIN` cravado aqui, esta prévia mostrava a contagem de 90 min
   * enquanto os Ajustes exibiam outro valor selecionado — a tela prometia um número de
   * avisos que o app não ia entregar.
   */
  const slots = reminderSlots(perfil.wakeMinutes, perfil.sleepMinutes, reminders.intervalMinutes);
  const temJanela = slots.length > 0;

  function concluir() {
    completeOnboarding();
    router.replace('/');
  }

  async function aceitar() {
    setPedindo(true);
    try {
      const permitido = await requestNotificationPermission();
      // Só liga a preferência se o sistema deixou: `enabled: true` sem permissão
      // deixaria os Ajustes mostrando um lembrete ativo que nunca chega.
      if (permitido) {
        setReminders({ enabled: true });
        await syncReminders();
      }
    } finally {
      setPedindo(false);
      concluir();
    }
  }

  return (
    <OnboardingStep
      step={5}
      mood="animada"
      speech="Posso te lembrar de beber?"
      ctaLabel={pedindo ? 'Um instante...' : 'Quero ser lembrado'}
      onCta={() => {
        if (pedindo) return;
        tapFeedback();
        aceitar();
      }}
      secondary={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Seguir sem lembretes"
          onPress={() => {
            tapFeedback();
            concluir();
          }}
          className="min-h-[44px] flex-row items-center justify-center gap-2">
          <BellOff size={18} color={tokens.textoSoft} strokeWidth={2.5} />
          <Text maxFontSizeMultiplier={1.3} className="font-displayBold text-lg text-texto-soft">
            Agora não
          </Text>
        </Pressable>
      }>
      <View className="items-center gap-5">
        <View
          className="h-20 w-20 items-center justify-center rounded-pill"
          style={{ backgroundColor: tokens.aguaTint }}>
          <BellRing size={40} color={tokens.agua} strokeWidth={2.4} />
        </View>

        {temJanela ? (
          <>
            <View className="w-full gap-3 rounded-2xl border-2 border-linha bg-canvas p-4">
              <View className="flex-row items-center gap-2">
                <Clock size={18} color={tokens.agua} strokeWidth={2.6} />
                <Text className="font-displayBold text-base text-texto">
                  {`Das ${formatClock(slots[0])} às ${formatClock(slots.at(-1) ?? 0)}`}
                </Text>
              </View>
              {/* Texto curto de propósito. Com a escala tipográfica nova, a versão
                  longa — que citava o espaçamento por igual e a folga nas pontas —
                  ocupava quatro linhas aqui e outras quatro embaixo, e no iPhone SE o
                  parágrafo encostava no botão. O horário de início e fim, que é a
                  informação que importa, já está na linha de cima. */}
              <Text maxFontSizeMultiplier={1.3} className="font-body text-base text-texto-soft">
                {`${slots.length} avisos leves, espaçados por igual.`}
              </Text>
            </View>

            <Text maxFontSizeMultiplier={1.3} className="text-center font-body text-base text-texto-soft">
              Nada de madrugada, e a Gotinha para quando você bate a meta. Dá para mudar em
              Ajustes.
            </Text>
          </>
        ) : (
          <Text maxFontSizeMultiplier={1.3} className="text-center font-body text-lg text-texto-soft">
            Sua rotina é curta demais para avisos espaçados. Dá para ligar depois em Ajustes.
          </Text>
        )}
      </View>
    </OnboardingStep>
  );
}
