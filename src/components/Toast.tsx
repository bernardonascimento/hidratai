import {
  Award,
  CalendarCheck,
  CalendarDays,
  Check,
  Coffee,
  Crown,
  Droplet,
  Droplets,
  Flame,
  Flower2,
  Gem,
  GlassWater,
  type LucideIcon,
  Medal,
  Moon,
  Mountain,
  RotateCcw,
  Shield,
  Sparkles,
  Sprout,
  Star,
  Sunrise,
  Target,
  TrendingUp,
  Trophy,
  Undo2,
  Waves,
  Zap,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { LIP, LIP_PRESSED, RADIUS, tokens } from '@/design/tokens';
import { formatVolume } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';
import { useReducedMotionPref } from '@/lib/motion';
import type { Aviso } from '@/store/useToast';

/**
 * Tempo na tela.
 *
 * A vitória fica mais: o desfazer é uma **ação** que a pessoa aceita ou ignora em três
 * segundos, enquanto a comemoração é uma **notícia** para ler — e ler "Conquista: Sete
 * manhãs" mais o critério embaixo não cabe em três.
 */
const DURACAO_DESFAZER = 3000;
const DURACAO_VITORIA = 4200;

/**
 * Folga entre a área segura do topo e o toast.
 *
 * Ele nasceu embaixo, sobre a tabBar, para não cobrir a ação primária. No topo esse
 * cuidado deixa de existir — o botão de registrar fica livre por construção — e a
 * confirmação aparece perto de onde os olhos já estão depois do toque.
 */
const FOLGA_DO_TOPO = 8;

/** Os mesmos nomes que o domínio usa nas conquistas, mais os das vitórias. */
const ICONES: Record<string, LucideIcon> = {
  droplet: Droplet,
  droplets: Droplets,
  flame: Flame,
  trophy: Trophy,
  award: Award,
  crown: Crown,
  target: Target,
  medal: Medal,
  gem: Gem,
  sunrise: Sunrise,
  moon: Moon,
  sparkles: Sparkles,
  star: Star,
  mountain: Mountain,
  'glass-water': GlassWater,
  waves: Waves,
  'calendar-check': CalendarCheck,
  'calendar-days': CalendarDays,
  shield: Shield,
  'rotate-ccw': RotateCcw,
  sprout: Sprout,
  flower: Flower2,
  coffee: Coffee,
  zap: Zap,
  'trending-up': TrendingUp,
};

type Props = {
  /** `null` esconde. Trocar de aviso reinicia a contagem. */
  aviso: Aviso | null;
  onUndo: (entryId: string) => void;
  /** Chamado quando o tempo acaba — quem manda o `aviso` deve consumi-lo. */
  onExpire: () => void;
};

/**
 * A faixa de aviso do app, nos dois sabores: o "Desfazer" que aparece após registrar e
 * a comemoração de progressão.
 *
 * **Um componente e não dois** porque a posição, a animação de entrada e a contagem para
 * expirar são idênticas, e duas cópias divergiriam na primeira mexida — já aconteceu
 * neste projeto com o cálculo de dia da semana, que existia em três lugares. O que muda
 * entre os dois é a cara e a duração.
 */
export function Toast({ aviso, onUndo, onExpire }: Props) {
  const insets = useSafeAreaInsets();
  // Mantém o conteúdo durante a saída: sem isto o texto desaparece antes da animação.
  const [conteudo, setConteudo] = useState<Aviso | null>(null);
  const p = useSharedValue(0);
  const pop = useSharedValue(1);
  const reduzido = useReducedMotionPref();

  // Ajuste **durante o render**, não em `useEffect`. O padrão do React para
  // "corrigir estado quando a prop muda": o React reinicia o render antes de
  // pintar, sem o quadro extra nem a cascata que o effect provoca.
  if (aviso && aviso !== conteudo) setConteudo(aviso);

  const ehVitoria = conteudo?.kind === 'vitoria';

  useEffect(() => {
    p.value = withTiming(aviso ? 1 : 0, {
      duration: reduzido ? 0 : aviso ? 220 : 160,
      easing: Easing.out(Easing.quad),
    });
  }, [aviso, reduzido, p]);

  /**
   * O "pop" que dá o ar de comemoração: passa de 1.06 e volta.
   *
   * Só na vitória, e só em escala — a regra do sistema é animar apenas `transform` e
   * `opacity`. Passar do tamanho final e voltar é o que separa "apareceu" de
   * "chegou animado"; sem o excesso, a entrada é a mesma do desfazer.
   *
   * `withSequence` aqui é seguro porque **não** está dentro de `withRepeat` — foi essa
   * combinação que, na garrafa, fazia a animação reiniciar do valor em cache e dar salto.
   */
  useEffect(() => {
    if (!aviso || aviso.kind !== 'vitoria' || reduzido) {
      pop.value = 1;
      return;
    }
    pop.value = withSequence(
      withTiming(1.06, { duration: 160, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
    );
  }, [aviso, reduzido, pop]);

  // A contagem é por aviso: um novo aviso antes de expirar reinicia o prazo.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(onExpire, aviso.kind === 'vitoria' ? DURACAO_VITORIA : DURACAO_DESFAZER);
    return () => clearTimeout(t);
  }, [aviso, onExpire]);

  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [
      // Entra **de cima**, na direção de onde ele veio. Vindo de baixo no topo da tela,
      // o movimento contraria a origem e lê como tremida em vez de entrada.
      { translateY: (1 - p.value) * -20 },
      { scale: pop.value },
    ],
  }));

  if (!conteudo) return null;

  return (
    <Animated.View
      pointerEvents={aviso && conteudo.kind === 'desfazer' ? 'auto' : 'none'}
      accessibilityLiveRegion="polite"
      style={[
        {
          position: 'absolute',
          left: 20,
          right: 20,
          top: insets.top + FOLGA_DO_TOPO,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          /**
           * `RADIUS.card`, o mesmo do `Button` e do `Card` — não mais a pill de 999.
           *
           * A pill custava duas coisas. **Cobertura:** as pontas arredondadas deixavam as
           * pílulas do HUD aparecerem atrás nos cantos, e um aviso translúcido pelas
           * bordas lê como falha de render. **Largura:** com duas linhas de texto, as
           * extremidades viravam duas lentes vazias que nenhum conteúdo alcançava.
           *
           * O raio de 16 resolve as duas e ainda alinha o toast com a linguagem do resto
           * do app: tudo que é bloco aqui usa `rounded-2xl`, e pill é reservada a
           * pastilha e a botão pequeno.
           */
          borderRadius: RADIUS.card,
          paddingLeft: 14,
          paddingRight: conteudo.kind === 'desfazer' ? 6 : 16,
          paddingVertical: conteudo.kind === 'desfazer' ? 8 : 12,
          /**
           * Duas caras.
           *
           * Desfazer: `aguaTint` com borda `agua`, a mesma dupla do `VolumeCard`
           * selecionado. Não é verde porque verde significa "meta batida".
           *
           * Vitória: amarelo `xp` cheio com o lip escuro embaixo, a linguagem 3D do
           * sistema. Amarelo e não verde pelo mesmo motivo — e amarelo é a cor que o app
           * já usa para XP, ou seja, para progresso. Cheia e não clarinha porque a
           * pessoa precisa **notar**: é o único aviso do app que interrompe para dar
           * boa notícia.
           *
           * A borda é estrutural nos dois casos, não enfeite: o toast passa por cima da
           * tabBar branca, e sem ela a faixa perde a silhueta. Sombra resolveria e o
           * design system não permite.
           */
          backgroundColor: ehVitoria ? tokens.xp : tokens.aguaTint,
          borderWidth: 2,
          borderColor: ehVitoria ? tokens.ofensiva : tokens.agua,
          borderBottomWidth: ehVitoria ? LIP : 2,
          borderBottomColor: ehVitoria ? tokens.ofensiva : tokens.agua,
        },
        style,
      ]}>
      {conteudo.kind === 'vitoria' ? (
        <Vitoria evento={conteudo.evento} />
      ) : (
        <Desfazer aviso={conteudo} onUndo={onUndo} />
      )}
    </Animated.View>
  );
}

function Vitoria({ evento }: { evento: Extract<Aviso, { kind: 'vitoria' }>['evento'] }) {
  const Icone = ICONES[evento.icone] ?? Sparkles;

  return (
    <>
      {/*
       * Ícone numa pastilha branca, não solto.
       *
       * Sobre o amarelo cheio, um ícone escuro solto se perde no meio do texto; a
       * pastilha branca dá a ele uma âncora e faz o conjunto ler como medalha. É o mesmo
       * recurso do sino no onboarding de lembretes.
       */}
      <View
        className="h-11 w-11 items-center justify-center rounded-pill"
        style={{ backgroundColor: tokens.canvas }}>
        <Icone size={22} color={tokens.ofensiva} strokeWidth={2.6} />
      </View>

      <View className="flex-1">
        {/* Texto escuro sobre o amarelo: `texto` dá 6,6:1 contra `xp`, enquanto branco
            daria 1,7:1 e sairia ilegível. O amarelo carrega o destaque; a legibilidade
            é do escuro. */}
        <Text
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
          className="font-displayBold text-lg"
          style={{ color: tokens.texto }}>
          {evento.titulo}
        </Text>
        {/* Duas linhas no detalhe, uma no título.
            O detalhe da conquista é o critério inteiro, e com a escala tipográfica nova
            "Beber antes das 9h por 7 dias seguidos" não cabe numa linha — chegava
            truncado em "por 7 dias segui…", que é pior que ocupar a segunda linha. */}
        <Text
          maxFontSizeMultiplier={1.3}
          numberOfLines={2}
          className="font-body text-sm"
          style={{ color: tokens.texto }}>
          {evento.detalhe}
        </Text>
      </View>
    </>
  );
}

function Desfazer({
  aviso,
  onUndo,
}: {
  aviso: Extract<Aviso, { kind: 'desfazer' }>;
  onUndo: (entryId: string) => void;
}) {
  return (
    <>
      {/*
       * Ícone e texto num bloco próprio com `marginBottom: LIP`.
       *
       * Sem isso eles ficavam 2pt abaixo do centro **visual** do botão. O
       * `alignItems: 'center'` do container centraliza pela caixa do botão, e essa caixa
       * tem 48pt — 44 de face mais 4 de lip. O centro da caixa fica 2pt abaixo do centro
       * da face colorida, que é o que o olho lê como o botão. Descontar o lip alinha pelo
       * que se vê, não pelo que o layout mede.
       */}
      <View className="flex-1 flex-row items-center gap-2.5" style={{ marginBottom: LIP }}>
        <Check size={24} color={tokens.agua} strokeWidth={3} />

        {/*
         * Azul `agua`, o mesmo dos botões de opção.
         *
         * Registro honesto do custo: sobre o `aguaTint` do fundo isso dá **2,15:1**,
         * contra 7,67:1 do escuro que estava aqui — abaixo dos 3:1 que texto grande em
         * negrito pede.
         *
         * Fica assim por **coerência**, que é um argumento real: o app já usa
         * `text-agua` sobre `bg-agua-tint` no `VolumeCard` selecionado, nos
         * `SegmentedPills` e nas pills de intervalo dos Ajustes. Se o combo vale nesses
         * quatro lugares, não faz sentido o toast ser a exceção — e a informação aqui é
         * redundante: o volume acabou de ser tocado pela pessoa.
         *
         * Se um dia isso for corrigido, corrija **junto** nos cinco lugares, e o caminho
         * é escurecer o fundo ou usar um azul mais fundo que o `aguaLip` (que só chega a
         * 2,81:1).
         */}
        <Text
          maxFontSizeMultiplier={1.3}
          className="flex-1 font-displayBold text-xl"
          style={{ color: tokens.agua }}>
          {`+ ${formatVolume(aviso.volumeMl)}`}
        </Text>
      </View>

      {/* Azul cheio sobre o fundo claro: o botão é a ação, então é ele que carrega o
          peso da faixa — e é o mesmo azul da ação primária do app, com o mesmo lip.
          Este é um botão de verdade, não um link de texto. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Desfazer ${formatVolume(aviso.volumeMl)}`}
        onPress={() => {
          tapFeedback();
          onUndo(aviso.entryId);
        }}
        style={({ pressed }) => ({ paddingTop: pressed ? LIP - LIP_PRESSED : 0 })}>
        {({ pressed }) => (
          <View
            className="min-h-[44px] flex-row items-center gap-1.5 rounded-pill px-4"
            style={{
              backgroundColor: tokens.agua,
              borderBottomWidth: pressed ? LIP_PRESSED : LIP,
              borderBottomColor: tokens.aguaLip,
            }}>
            <Undo2 size={17} color={tokens.canvas} strokeWidth={2.8} />
            <Text
              maxFontSizeMultiplier={1.3}
              className="font-displayBold text-sm"
              style={{ color: tokens.canvas }}>
              Desfazer
            </Text>
          </View>
        )}
      </Pressable>
    </>
  );
}
