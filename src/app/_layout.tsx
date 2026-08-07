import '../global.css';

/**
 * Fontes importadas por **subpath**, um peso por linha — nunca da raiz do pacote.
 *
 * O `index.js` da raiz de `@expo-google-fonts/*` é um barrel que faz `require()` de
 * cada `.ttf` da família. `require` de asset não é tree-shakeable no Metro, então
 * importar de lá arrasta a família inteira para o bundle mesmo desestruturando dois
 * nomes: eram 21 arquivos e 2,28 MB, incluindo todos os itálicos do Nunito, que o app
 * não usa em nenhum lugar.
 *
 * O `useFonts` vem de `expo-font` porque antes vinha de dentro do barrel do Fredoka —
 * ou seja, importar o hook era motivo suficiente para carregar a família toda.
 */
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold';
import { Fredoka_700Bold } from '@expo-google-fonts/fredoka/700Bold';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AppState, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/AppBackground';
import { Toast } from '@/components/Toast';
import { WATER_DRINK_ID } from '@/domain/drinks';
import { semearConquistasVistas } from '@/lib/celebrate';
import { msUntilNextLogicalDay } from '@/lib/date';
import {
  ACAO_BEBI,
  VOLUME_ACAO,
  clearBadge,
  configureNotifications,
  syncReminders,
} from '@/lib/notifications';
import { useGamification } from '@/store/useGamification';
import { useLogicalDay } from '@/store/useLogicalDay';
import { useProfile } from '@/store/useProfile';
import { useToast } from '@/store/useToast';
import { useWater } from '@/store/useWater';

SplashScreen.preventAutoHideAsync();

/**
 * O react-navigation pinta o fundo de cada cena com `colors.background` do tema
 * (um cinza claro, por padrão). Isso cobria o `AppBackground` por completo — a
 * onda e as bolhas existiam e ficavam escondidas atrás dele.
 */
const TEMA_TRANSPARENTE = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent' },
};

/**
 * Rede de segurança para uma janela larga e baixa.
 *
 * A orientação **é** travada em retrato desde 07/08/2026, nos dois sistemas: no iOS por
 * `UISupportedInterfaceOrientations` e no Android por `screenOrientation` mais o opt-out
 * do plugin `withRetratoEmTelaGrande`. Então girar o aparelho não chega mais aqui.
 *
 * Isto continua existindo porque **girar não é o único jeito de ganhar uma janela
 * deitada**: tela dividida em tablet, o modo desktop do Android 16 e um dobrável
 * entreaberto entregam formatos que a trava de orientação não governa. Custa duas
 * `<Text>` e evita a tela toda amassada nesses casos.
 *
 * Não apague por parecer inalcançável — pelo caminho do usuário girando o aparelho, é.
 */
function AvisoPaisagem() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-canvas px-8">
      <Text className="text-center font-display text-xl text-texto">Gire para retrato</Text>
      <Text className="text-center font-body text-base text-texto-soft">
        O Hidrataí foi feito para uma mão só.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  /**
   * Três pesos, não quatro. O `Nunito_800ExtraBold` estava aqui e no
   * `tailwind.config.js` como `font-bodyBold`, e **nenhuma tela o usava** — 129 KB
   * carregados no boot, dentro do gate que segura a splash, para nada. Se algum dia
   * o corpo precisar de um negrito, o caminho é voltar as duas pontas juntas: o peso
   * aqui e a família na config.
   */
  const [fontesCarregadas] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_600SemiBold,
  });
  const { width, height } = useWindowDimensions();
  const paisagemApertada = width > height && height < 520;

  // A leitura do AsyncStorage é assíncrona: sem esperar a hidratação, um toque
  // nos primeiros milissegundos seria sobrescrito pelo estado salvo — e o gate de
  // onboarding leria `onboardingDone` como falso e mandaria todo mundo para lá.
  const [aguaPronta, setAguaPronta] = useState(() => useWater.persist.hasHydrated());
  const [perfilPronto, setPerfilPronto] = useState(() => useProfile.persist.hasHydrated());
  const [jogoPronto, setJogoPronto] = useState(() => useGamification.persist.hasHydrated());
  useEffect(() => useWater.persist.onFinishHydration(() => setAguaPronta(true)), []);
  useEffect(() => useProfile.persist.onFinishHydration(() => setPerfilPronto(true)), []);
  useEffect(() => useGamification.persist.onFinishHydration(() => setJogoPronto(true)), []);

  const onboardingDone = useProfile((s) => s.onboardingDone);
  const router = useRouter();
  const pronto = fontesCarregadas && aguaPronta && perfilPronto && jogoPronto;

  /**
   * Resposta que **abriu** o app pela ação rápida. Usamos o hook em vez de um
   * listener no `useEffect` porque, quando o app estava morto, o evento chega antes
   * de qualquer componente montar — um listener registrado depois nunca o veria.
   */
  const respostaNotificacao = Notifications.useLastNotificationResponse();
  const respostaTratada = useRef<string | null>(null);

  const avisoDaVez = useToast((s) => s.fila[0] ?? null);
  const avancarAviso = useToast((s) => s.avancar);

  // Ponte única entre as stores, feita aqui porque exige as duas já hidratadas:
  // importa o XP/ofensiva que viviam em `useWater`, sorteia as missões do dia e
  // reavalia a ofensiva (consumindo congelamento por dia perdido).
  useEffect(() => {
    if (!pronto) return;
    const agua = useWater.getState();
    const jogo = useGamification.getState();

    jogo.seedFrom({ xp: agua.xp, streak: agua.streak, lastMetDate: agua.lastMetDate });
    jogo.ensureMissions();
    jogo.syncStreak(agua.days);

    /**
     * Marca as conquistas já desbloqueadas **sem anunciar**, uma vez só.
     *
     * Sem isto, quem já usava o app antes desta feature abriria e receberia dez
     * comemorações em fila por coisas conquistadas semanas atrás. Também cobre quem
     * preencheu dias no Histórico, que muda o histórico sem passar pela tela Hoje.
     *
     * Depois do `syncStreak`: ele pode mudar a ofensiva, e duas conquistas dependem
     * dela.
     */
    semearConquistasVistas();
  }, [pronto]);

  // Gate do onboarding (§5.1): quem ainda não configurou vai para as boas-vindas.
  useEffect(() => {
    if (pronto && !onboardingDone) router.replace('/boas-vindas');
  }, [pronto, onboardingDone, router]);

  // Handler e categoria da ação rápida, uma vez só.
  useEffect(() => {
    configureNotifications();
  }, []);

  /**
   * Virada do dia lógico (03:00) com o app **aberto**.
   *
   * `dayKey()` dentro de um seletor do Zustand não é reativo — o seletor só roda de
   * novo quando a store muda, e às 03:00 nada muda. Sem isto, quem deixa o app aberto
   * atravessa a virada vendo o dia anterior: total, registros e missões velhos.
   *
   * Dois gatilhos, porque nenhum dos dois basta sozinho: o timer cobre o app aberto,
   * e o foreground cobre o app suspenso, onde o iOS não garante que o timer acorde.
   */
  useEffect(() => {
    if (!pronto) return;

    let timer: ReturnType<typeof setTimeout>;

    const aoVirar = () => {
      if (!useLogicalDay.getState().refresh()) return;
      // Efeitos que são por dia: as missões do novo dia e a ofensiva, que pode ter
      // perdido a sequência de ontem (ou consumido um congelamento).
      const jogo = useGamification.getState();
      jogo.ensureMissions();
      jogo.syncStreak(useWater.getState().days);
      syncReminders();
    };

    // Reagenda a cada virada: um único `setTimeout` cobriria só a primeira noite.
    const agendar = () => {
      timer = setTimeout(() => {
        aoVirar();
        agendar();
      }, msUntilNextLogicalDay() + 1000);
    };

    agendar();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') aoVirar();
    });

    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [pronto]);

  /**
   * Reagenda no foreground e zera o badge. É o gatilho mais importante dos quatro
   * (§6.2): a camada precisa cobre 3 dias, então abrir o app de vez em quando é o
   * que a mantém à frente.
   */
  useEffect(() => {
    if (!pronto) return;

    const aoAtivar = () => {
      clearBadge();
      syncReminders();
    };

    aoAtivar();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') aoAtivar();
    });
    return () => sub.remove();
  }, [pronto]);

  /** Ação rápida "Bebi 250 ml" (§6.3) — o registro acontece aqui, no app aberto. */
  useEffect(() => {
    if (!pronto || !respostaNotificacao) return;
    if (respostaNotificacao.actionIdentifier !== ACAO_BEBI) return;

    const id = respostaNotificacao.notification.request.identifier;
    if (respostaTratada.current === id) return;

    // O hook devolve a última resposta da sessão, e ela sobrevive a um remount.
    // Sem a janela de tempo, reabrir o app registraria água de novo, sozinho.
    const idade = Date.now() - respostaNotificacao.notification.date;
    if (idade > 30_000) return;

    respostaTratada.current = id;
    useWater.getState().addEntry(WATER_DRINK_ID, VOLUME_ACAO);
    syncReminders();
  }, [pronto, respostaNotificacao]);

  useEffect(() => {
    if (pronto) SplashScreen.hideAsync();
  }, [pronto]);

  if (!pronto) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={TEMA_TRANSPARENTE}>
        <StatusBar style="dark" />
        {/* O app ocupa a largura inteira, inclusive em tablet.
            Havia um teto de 480dp aqui, com moldura cinza nas laterais. Num tablet de
            1067dp aquilo virava 480 de app e 587 de cinza, e lia como defeito em vez de
            escolha. Decisão de 07/08/2026: preencher.
            Preço aceito com conhecimento: a tela foi afinada para 375–430dp, então em
            tablet os cartões de volume e as barras da semana ficam largos. Nada quebra —
            fica largo. A garrafa não acompanha, porque a escala dela tem teto em 1,85. */}
        <View className="flex-1 overflow-hidden bg-fundo">
          {paisagemApertada ? (
            <AvisoPaisagem />
          ) : (
            <>
              {/* Um fundo só, atrás de todas as rotas — telas ficam transparentes */}
              <AppBackground />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: 'transparent' },
                }}
              />

              {/* Depois do `Stack` de propósito: é o que faz o toast passar **por
                  cima da tabBar**, deixando a ação primária livre. Dentro da tela ele
                  nunca alcançaria a barra, que é desenhada pelo navegador. */}
              <Toast
                aviso={avisoDaVez}
                onUndo={(id) => {
                  useWater.getState().removeEntry(id);
                  avancarAviso();
                  // Desfazer pode devolver o dia para baixo da meta: os avisos voltam.
                  syncReminders();
                }}
                onExpire={avancarAviso}
              />
            </>
          )}
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
