import { useEffect, useRef } from 'react';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

import { tokens } from '@/design/tokens';
import { useReducedMotionPref } from '@/lib/motion';
import { useTodayHydrationMl, useWater } from '@/store/useWater';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** Lado do quadro. Enxuto de propósito: o botão não deve competir com a garrafa. */
const CAIXA = 50;
const C = CAIXA / 2;

/** Anel de progresso, a borda de tudo. */
const R_ANEL = 21;
const TRACO_ANEL = 2.5;
const VOLTA = 2 * Math.PI * R_ANEL;

/**
 * A gota, em coordenadas do quadro — a mesma silhueta do ícone do app, para o botão
 * central e o ícone da tela inicial rimarem.
 *
 * `GOTA_TOPO` e `GOTA_BASE` são a faixa que a água percorre por dentro dela.
 */
const GOTA_TOPO = 12;
const GOTA_BASE = 38.5;
const GOTA_D = [
  `M ${C} ${GOTA_TOPO}`,
  `C ${C} ${GOTA_TOPO} ${C + 9.5} 23 ${C + 9.5} 29`,
  `A 9.5 9.5 0 1 1 ${C - 9.5} 29`,
  `C ${C - 9.5} 23 ${C} ${GOTA_TOPO} ${C} ${GOTA_TOPO}`,
  'Z',
].join(' ');

/** Amplitude do respiro, em pontos. */
const RESPIRO = 0.9;
/** Segundos de um ciclo do respiro. */
const RESPIRO_SEG = 4;

/**
 * Aba central: a gota **enche com o dia**, com o anel de progresso em volta.
 *
 * O botão era o maior elemento da barra e não dizia nada. Agora dá para ler o dia de
 * qualquer aba, sem abrir a tela Hoje.
 *
 * ## Sem o círculo cheio atrás — e é ele que fazia o preenchimento não funcionar
 *
 * A primeira versão punha a gota sobre um círculo azul sólido, e aí o interior vazio
 * da gota ficava do **mesmo azul do botão** (1,00 de contraste): o vazio desaparecia e
 * a forma lia como partida em duas. Tirando o círculo, o vazio passa a ser o branco da
 * barra e a água aparece contra ele — o mesmo desenho que não funcionava antes funciona
 * agora, porque o fundo mudou.
 *
 * De quebra o botão parou de competir com a garrafa, que é a heroína da tela: um disco
 * cheio de 54pt ao lado de uma garrafa verde eram dois blocos de cor disputando.
 */
export function TabDrop() {
  const total = useTodayHydrationMl();
  const goalMl = useWater((s) => s.goalMl);
  const reduzido = useReducedMotionPref();

  const progresso = goalMl > 0 ? Math.min(1, Math.max(0, total / goalMl)) : 0;
  const bateu = total > 0 && total >= goalMl;
  const cor = bateu ? tokens.meta : tokens.agua;

  const nivelDe = (p: number) => GOTA_BASE - p * (GOTA_BASE - GOTA_TOPO);

  // Nascem no valor certo — mesma lição da garrafa: começar em zero e animar faz a aba
  // dar um giro completo a cada montagem.
  const nivel = useSharedValue(nivelDe(progresso));
  const andado = useSharedValue(progresso);
  const pulo = useSharedValue(1);
  const faseRespiro = useSharedValue(0);

  useEffect(() => {
    const alvo = nivelDe(progresso);
    if (reduzido) {
      nivel.value = withTiming(alvo, { duration: 0 });
      andado.value = withTiming(progresso, { duration: 0 });
      return;
    }
    nivel.value = withSpring(alvo, { damping: 15, stiffness: 160 });
    andado.value = withSpring(progresso, { damping: 16, stiffness: 130 });
  }, [progresso, reduzido, nivel, andado]);

  /**
   * Pulo ao registrar. O gatilho é o **crescimento** do total, não um `pulse` vindo de
   * fora: a barra não tem acesso ao estado da tela Hoje, e comparar com o valor
   * anterior mantém o componente autossuficiente. Só na subida — apagar registro não
   * merece festa.
   */
  const totalAnterior = useRef(total);
  useEffect(() => {
    const cresceu = total > totalAnterior.current;
    totalAnterior.current = total;
    if (!cresceu || reduzido) return;

    pulo.value = withSequence(
      withSpring(1.18, { damping: 9, stiffness: 320 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
  }, [total, reduzido, pulo]);

  /** Respiro contínuo, no mesmo relógio de quadro da garrafa e das bolhas. */
  const relogio = useFrameCallback((quadro) => {
    const dt = Math.min((quadro.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    faseRespiro.value = (faseRespiro.value + dt / RESPIRO_SEG) % 1;
  }, false);

  useEffect(() => {
    relogio.setActive(!reduzido);
  }, [reduzido, relogio]);

  const vivaStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: Math.sin(faseRespiro.value * 2 * Math.PI) * RESPIRO },
      { scale: pulo.value },
    ],
  }));

  // `strokeDashoffset` e o `y` de um `rect` são atributos de apresentação de verdade,
  // então animam — ao contrário de `x`/`y` num `<G>`, que foi o que travou a garrafa.
  const anelProps = useAnimatedProps(() => ({
    strokeDashoffset: VOLTA * (1 - andado.value),
  }));
  const aguaProps = useAnimatedProps(() => ({ y: nivel.value }));

  return (
    <Animated.View style={vivaStyle}>
      <Svg width={CAIXA} height={CAIXA}>
        <Defs>
          <ClipPath id="dentroDaGota">
            <Path d={GOTA_D} />
          </ClipPath>
        </Defs>

        {/* Trilha: mostra que existe uma volta a completar. Fraca de propósito — ela
            orienta, não compete. */}
        <Circle
          cx={C}
          cy={C}
          r={R_ANEL}
          fill="none"
          stroke={tokens.linha}
          strokeWidth={TRACO_ANEL}
        />

        {/* Progresso. O giro de -90° põe o início no topo em vez de na direita. */}
        <AnimatedCircle
          cx={C}
          cy={C}
          r={R_ANEL}
          fill="none"
          stroke={cor}
          strokeWidth={TRACO_ANEL}
          strokeLinecap="round"
          strokeDasharray={`${VOLTA}`}
          transform={`rotate(-90 ${C} ${C})`}
          animatedProps={anelProps}
        />

        {/* Gota vazia: branca por dentro. Explícito, e não transparente, para a onda e
            as bolhas do fundo não passarem por dentro dela. */}
        <Path d={GOTA_D} fill={tokens.canvas} />

        {/* Água subindo, recortada pela própria silhueta. */}
        <G clipPath="url(#dentroDaGota)">
          <AnimatedRect x={0} width={CAIXA} height={CAIXA} fill={cor} animatedProps={aguaProps} />
        </G>

        {/* Contorno por cima, para a água não passar da linha. */}
        <Path d={GOTA_D} fill="none" stroke={cor} strokeWidth={1.8} strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}
