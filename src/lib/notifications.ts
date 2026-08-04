import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { WATER_DRINK_ID, findDrink } from '@/domain/drinks';
import { hourMinute, momentoDe, perennialSlots, phraseFor, reminderSlots } from '@/domain/reminders';
import { dayKey, weekdayOf } from '@/lib/date';
import { useGamification } from '@/store/useGamification';
import { useProfile } from '@/store/useProfile';
import { useWater } from '@/store/useWater';

/** Categoria que carrega a ação rápida. */
const CATEGORIA = 'lembrete-agua';
/** Identificador da ação — o listener compara com isto. */
export const ACAO_BEBI = 'BEBI';

/** Dias que a camada A cobre com data explícita: hoje, amanhã e depois. */
const DIAS_PRECISOS = 3;
/** Quantos lembretes ficam perenes na camada B. */
const PERENES = 4;

/** Volume da ação rápida — o padrão da água no catálogo, não um número solto. */
export const VOLUME_ACAO = findDrink(WATER_DRINK_ID)?.defaultMl ?? 250;

/**
 * O nome do app vai no **título**, e a frase no **corpo** — não `"Hidrataí: frase"`
 * num título só.
 *
 * Testado com `simctl push` no simulador, porque a diferença não é de gosto: a tarja
 * compacta do iOS dá **uma linha** ao título, com espaço para ~30 caracteres. Com o
 * prefixo, "Hidrataí: Falta pouco para a meta." chegava como *"Hidrataí: Falta pouco
 * para a m…"* — os 10 caracteres da marca comiam o fim da mensagem.
 *
 * Separando, a tarja usa duas linhas: "Hidrataí" em negrito e a frase inteira embaixo.
 * A marca fica mais visível do que era no prefixo, e a frase não paga nada.
 */
const TITULO = 'Hidrataí';

export type SyncResult = {
  scheduled: number;
  /** Por que não agendou nada, quando `scheduled` é 0. */
  reason?: 'web' | 'desligado' | 'sem-permissao' | 'janela-curta' | 'meta-batida';
};

/**
 * Handler e categoria. Roda uma vez no boot, antes de qualquer agendamento — sem
 * a categoria registrada, a notificação chega sem o botão de ação.
 */
export async function configureNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // Sem banner com o app aberto: quem já está olhando a garrafa não precisa de
      // um aviso na frente dela. Fica na central, para não se perder.
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });

  try {
    await Notifications.setNotificationCategoryAsync(CATEGORIA, [
      {
        identifier: ACAO_BEBI,
        buttonTitle: `Bebi ${VOLUME_ACAO} ml`,
        // Abre o app de propósito: registrar em background não é confiável em RN,
        // e prometer isso daria um botão que às vezes não faz nada (§6.3).
        options: { opensAppToForeground: true },
      },
    ]);
  } catch {
    // Categoria é enfeite: sem ela o lembrete ainda chega.
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

/**
 * Pede a permissão. Chamar **só** depois de explicar o valor (§6.4) — pedir no
 * boot queima a única chance que o iOS dá.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  // `canAskAgain` falso = já negou antes; insistir não abre diálogo nenhum, só
  // devolve negado. Quem chama deve mandar o usuário para os Ajustes do sistema.
  if (!atual.canAskAgain) return false;

  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

/** Zera o badge. Chamado quando o app vem para a frente. */
export async function clearBadge(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // Badge é enfeite.
  }
}

/** Data real de um slot, `dia` dias à frente. `setMinutes` normaliza > 59 sozinho. */
function dataDoSlot(dia: number, minutoDoDia: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dia);
  d.setMinutes(minutoDoDia);
  return d;
}

/**
 * Reagenda **tudo** a partir do estado atual. Único lugar do app que agenda
 * notificação (§6.2) — espalhar isso pelos componentes é como o app de referência
 * seca depois de algumas horas.
 *
 * Idempotente: cancela todas as pendentes e reconstrói. Chamar de novo é seguro e
 * é justamente o que se faz no foreground, a cada registro e a cada mudança de
 * configuração.
 *
 * ## As duas camadas, e o conflito entre elas
 *
 * A camada A dá precisão (data explícita, 3 dias) e a B dá perenidade (`DAILY`
 * infinito, sobrevive a semanas sem abrir o app). O plano não diz o que fazer
 * quando as duas cobrem o mesmo horário — e cobririam: o `DAILY` das 15h dispara
 * hoje também, junto com o `DATE` de hoje às 15h. Seriam **duas notificações no
 * mesmo minuto** durante os 3 primeiros dias.
 *
 * Resolvido dividindo o dia: os horários perenes pertencem à camada B, e a camada
 * A agenda só os **outros**. Nenhum horário tem dois donos, e o total pendente cai
 * de ~36 para ~20 — bem abaixo do limite de 64 do iOS.
 */
export async function syncReminders(): Promise<SyncResult> {
  if (Platform.OS === 'web') return { scheduled: 0, reason: 'web' };

  // Cancela sempre, mesmo desligado: é o que apaga o que ficou de uma configuração
  // anterior. Sem isso, desligar o lembrete não pararia de notificar.
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { profile, reminders } = useProfile.getState();
  if (!reminders.enabled) return { scheduled: 0, reason: 'desligado' };
  if (!(await hasNotificationPermission())) return { scheduled: 0, reason: 'sem-permissao' };

  const slots = reminderSlots(profile.wakeMinutes, profile.sleepMinutes, reminders.intervalMinutes);
  if (slots.length === 0) return { scheduled: 0, reason: 'janela-curta' };

  const perenes = perennialSlots(slots, PERENES);
  const ehPerene = new Set(perenes);

  /**
   * Posição do slot no dia, usada só para escolher a frase — não mais para o badge.
   * Ver o bloco do badge mais abaixo.
   */
  const posicao = new Map(slots.map((minuto, i) => [minuto, i + 1]));

  /**
   * Contador do badge. Cresce **na ordem em que os avisos vão disparar**, a partir
   * de agora — e não a posição do slot na grade do dia.
   *
   * O iOS não soma badges: cada notificação **define** o número. Com a posição na
   * grade, ligar os lembretes ao meio-dia fazia o primeiro aviso recebido mostrar
   * "5", porque era o quinto horário do dia — com duas notificações na central.
   *
   * Como `syncReminders()` roda a cada foreground, contar daqui para frente dá ao
   * número o sentido que se espera de um badge: **quantos avisos passaram desde a
   * última vez que você abriu o app**.
   */
  let contadorBadge = 0;

  const hoje = dayKey();
  const agua = useWater.getState();
  const metaHoje = agua.days[hoje]?.goalMl ?? agua.goalMl;
  const totalHoje = agua.days[hoje]?.totalHydrationMl ?? 0;
  const metaBatidaHoje = totalHoje >= metaHoje;
  /**
   * Progresso de hoje, e **só de hoje**. É o único dia sobre o qual a frase pode
   * afirmar algo: `syncReminders()` roda a cada registro e a cada abertura, então os
   * avisos de hoje que ainda não dispararam são reescritos com o número fresco.
   */
  const fracaoHoje = metaHoje > 0 ? totalHoje / metaHoje : 0;

  /**
   * Dia livre: `0` = domingo … `6` = sábado, ou `null`.
   *
   * No dia livre a camada A não agenda nada, e sobram só os 4 perenes. É uma escolha
   * de produto, não uma limitação: silêncio total exigiria trocar o `DAILY` perene por
   * seis `WEEKLY` por slot, o que levaria o total pendente de 37 para 57 no pior caso —
   * perto demais do limite de 64 do iOS, que é justamente por onde este tipo de app
   * seca. E beber água no dia livre continua importando: o dia é de folga da
   * **ofensiva**, não do corpo.
   */
  const { restDay } = useGamification.getState();

  let agendadas = 0;

  // Camada B — perene. Fica de pé mesmo com a meta batida hoje: é o preço de
  // sobreviver a semanas sem abrir o app, já que `DAILY` não sabe de meta nenhuma.
  // São 4 avisos por dia em tom de convite, não de cobrança.
  for (const minuto of perenes) {
    const { hour, minute } = hourMinute(minuto);
    await Notifications.scheduleNotificationAsync({
      content: {
        // Semente do dia, não fixa: `syncReminders` roda a cada abertura, então as
        // frases perenes se renovam com o uso. Quem sumir por semanas fica com as
        // últimas — melhor repetido que calado.
        //
        // **Sem `fracao` de propósito.** Um `DAILY` repete para sempre com o texto que
        // recebeu, então "falta pouco para a meta" estaria certo no dia em que foi
        // agendado e errado em todos os seguintes. Estas quatro frases reagem só ao
        // horário — e continuam válidas até para quem já bateu a meta, que é o caso em
        // que esta camada dispara mesmo assim.
        title: TITULO,
        body: phraseFor(hoje, posicao.get(minuto) ?? 1, { momento: momentoDe(minuto) }),
        categoryIdentifier: CATEGORIA,
        // **Sem badge de propósito.** Um `DAILY` é agendado uma vez e repete para
        // sempre, então qualquer número que eu ponha aqui estaria certo em um dia e
        // errado em todos os outros. Omitir deixa o badge intacto: quem manda nele é
        // a camada A, que sabe a ordem real dos disparos.
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
    agendadas += 1;
  }

  // Camada A — precisa, e só nos horários que a B não cobre.
  const agora = Date.now();
  for (let dia = 0; dia < DIAS_PRECISOS; dia += 1) {
    // Meta batida cala o resto de **hoje**; amanhã começa de novo.
    if (dia === 0 && metaBatidaHoje) continue;

    /**
     * Dia livre: a camada A não agenda, e o dia fica só com os 4 perenes.
     *
     * O dia da semana sai da **chave do dia lógico**, não de `data.getDay()`. Hoje dá
     * no mesmo, porque nenhum slot cai antes das 03:00 — mas derivar do relógio seria
     * uma bomba armada para quem configurar uma janela que atravesse a virada.
     */
    if (restDay !== null && weekdayOf(dayKey(dataDoSlot(dia, 12 * 60))) === restDay) continue;

    for (const minuto of slots) {
      if (ehPerene.has(minuto)) continue;

      const data = dataDoSlot(dia, minuto);
      // Um minuto de folga: agendar para "agora" dispara na hora e assusta.
      if (data.getTime() <= agora + 60_000) continue;

      contadorBadge += 1;
      await Notifications.scheduleNotificationAsync({
        content: {
          // Só hoje leva o progresso. Amanhã e depois de amanhã ainda não aconteceram,
          // então prometer "falta pouco" neles seria adivinhar.
          title: TITULO,
          body: phraseFor(dayKey(data), posicao.get(minuto) ?? 1, {
            momento: momentoDe(minuto),
            fracao: dia === 0 ? fracaoHoje : undefined,
          }),
          categoryIdentifier: CATEGORIA,
          badge: contadorBadge,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: data },
      });
      agendadas += 1;
    }
  }

  return { scheduled: agendadas };
}
