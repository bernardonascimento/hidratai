import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, Line, Path, Rect, Text as SvgText, Use } from 'react-native-svg';

import { tokens } from '@/design/tokens';
import { formatPair } from '@/lib/format';
import { useReducedMotionPref } from '@/lib/motion';

/**
 * A água é animada com `<Use>`, e **não** com `<G>` transladado.
 *
 * Motivo, descoberto em 30/07/2026: `x`/`y` são atributos SVG de verdade em `use` e
 * em `rect`, mas `g` não os tem — o react-native-svg os converte em `transform` no
 * render do JS, e a atualização de prop animada não chegava ao nativo. O resultado
 * era a água **congelada no nível da montagem**: apagar todos os registros deixava o
 * número em 0,0 com a garrafa ainda cheia. Os recortes do texto sempre funcionaram
 * porque são `rect`.
 */
const AnimatedUse = Animated.createAnimatedComponent(Use);

// Geometria da silhueta. A proporção importa: gargalo curto e largo o suficiente
// para a figura dizer "garrafa" — e não "bateria" — em 200 ms.
const W = 140;
const H = 248;

/**
 * Proporção do desenho, para a tela calcular que escala cabe no espaço que sobrou.
 * A geometria toda vive em unidades do viewBox: escalar aumenta a garrafa **e** o
 * texto interno juntos, sem recalcular nenhuma coordenada.
 */
export const BOTTLE_VIEWBOX = { w: W, h: H };
/** Teto da escala: o tamanho aprovado em tela de 874pt. Não passa disso. */
export const BOTTLE_SCALE_MAX = 1.5;

const CX = 70;
// Corpo e bico mais largos dentro do mesmo espaço de 140×248: a garrafa ganha
// presença sem ficar mais alta nem empurrar o layout.
const NECK_HALF = 28;
const BODY_HALF = 61;
const TOP = 16;
const NECK_END = 46;
const SHOULDER_END = 84;
const BODY_END = 236;
const R = 20;

const BOTTLE_D = [
  `M ${CX - NECK_HALF} ${TOP}`,
  `H ${CX + NECK_HALF}`,
  `V ${NECK_END}`,
  `C ${CX + NECK_HALF} ${NECK_END + 18} ${CX + BODY_HALF} ${SHOULDER_END - 22} ${CX + BODY_HALF} ${SHOULDER_END}`,
  `V ${BODY_END - R}`,
  `C ${CX + BODY_HALF} ${BODY_END - 6} ${CX + BODY_HALF - 6} ${BODY_END} ${CX + BODY_HALF - R} ${BODY_END}`,
  `H ${CX - BODY_HALF + R}`,
  `C ${CX - BODY_HALF + 6} ${BODY_END} ${CX - BODY_HALF} ${BODY_END - 6} ${CX - BODY_HALF} ${BODY_END - R}`,
  `V ${SHOULDER_END}`,
  `C ${CX - BODY_HALF} ${SHOULDER_END - 22} ${CX - NECK_HALF} ${NECK_END + 18} ${CX - NECK_HALF} ${NECK_END}`,
  'Z',
].join(' ');

/** Faixa que a água percorre: cheia encosta no ombro, vazia na base. */
const WATER_TOP = 70;
const WATER_BOTTOM = BODY_END;
const WATER_RANGE = WATER_BOTTOM - WATER_TOP;

const MILESTONES = [0.25, 0.5, 0.75];

/** Linha de base do número no centro do corpo da garrafa. */
const TEXT_Y = (SHOULDER_END + BODY_END) / 2 - 2;

/**
 * Onda senoidal aproximada por cúbicas, com o corpo preenchido abaixo dela.
 * A largura é o dobro da visível para o path poder deslizar sem revelar borda.
 */
function wavePath(width: number, periods: number, amplitude: number, depth: number): string {
  const p = width / periods;
  let d = 'M 0 0';
  for (let i = 0; i < periods; i += 1) {
    const x = i * p;
    d += ` C ${x + p * 0.25} ${-amplitude}, ${x + p * 0.75} ${amplitude}, ${x + p} 0`;
  }
  return `${d} L ${width} ${depth} L 0 ${depth} Z`;
}

const WAVE_W = W * 2;
const WAVE_DEPTH = WATER_RANGE + 40;

/**
 * As três camadas da superfície. Cada uma guarda o **próprio período**, porque o
 * loop só fecha sem salto se a translação for exatamente um período — a segunda
 * onda antes deslizava 1,5 período e dava um pulo visível a cada 4 segundos.
 *
 * Períodos e durações diferentes (e sentidos opostos) fazem as cristas se cruzarem
 * sem nunca repetir o mesmo desenho: é o que dá a leitura de "água mexendo".
 */
function camadaDeOnda(periodos: number, amplitude: number, opacidade: number, segundos: number) {
  return {
    d: wavePath(WAVE_W, periodos, amplitude, WAVE_DEPTH),
    periodo: WAVE_W / periodos,
    opacidade,
    /** Segundos para a onda percorrer um período inteiro. */
    segundos,
  };
}

/**
 * Só a crista, **sem fechar o corpo**. É o que a espuma da superfície precisa: um
 * `wavePath` completo desce `WAVE_DEPTH` para baixo, então em branco ele lavava a
 * água inteira em vez de marcar a linha d'água.
 */
function waveLine(width: number, periods: number, amplitude: number): string {
  const p = width / periods;
  let d = 'M 0 0';
  for (let i = 0; i < periods; i += 1) {
    const x = i * p;
    d += ` C ${x + p * 0.25} ${-amplitude}, ${x + p * 0.75} ${amplitude}, ${x + p} 0`;
  }
  return d;
}

const ONDA_A = camadaDeOnda(4, 5.5, 1, 6.5);
const ONDA_B = camadaDeOnda(3, 3.5, 0.45, 9);
/** Espuma: traço na linha d'água, não corpo preenchido. */
const ESPUMA = {
  d: waveLine(WAVE_W, 6, 2.5),
  periodo: WAVE_W / 6,
  segundos: 5,
};

/** Segundos de um ciclo completo do respiro (sobe e desce). */
const RESPIRO_SEG = 4.5;

/** Amplitude do respiro contínuo da superfície, em unidades do viewBox. */
const RESPIRO = 1.6;

/**
 * Folga que afunda a superfície quando o dia está zerado.
 *
 * A crista da onda sobe `amplitude` acima da linha do nível, e o respiro soma mais.
 * Com o nível exatamente na base da garrafa, isso empurrava uns 7 unidades de água
 * para dentro do desenho: sobrava uma lâmina azul tremendo no fundo de uma garrafa
 * que devia estar vazia. A folga é a maior amplitude (5,5) + respiro + meia
 * espessura do traço da espuma.
 */
const FOLGA_VAZIO = 9;

/**
 * Onde a superfície fica para uma fração da meta. Zerado afunda a água inteira sob a
 * base; cheio encosta em `WATER_TOP`. As marcações usam a **mesma** conta, senão a
 * linha d'água não pararia em cima da marca dos 25/50/75%.
 */
function nivelDe(fracao: number): number {
  return WATER_BOTTOM + FOLGA_VAZIO - fracao * (WATER_RANGE + FOLGA_VAZIO);
}

type Props = {
  /** Água efetiva de hoje, em ml. */
  hydrationMl: number;
  goalMl: number;
  /** Incrementa a cada registro — dispara a subida e o pop de marco. */
  pulse: number;
  /**
   * Quanto o desenho cresce sobre o viewBox. Quem manda é a tela, que sabe
   * quanta altura sobrou — daí não haver escala fixa aqui dentro.
   */
  scale?: number;
};

/**
 * O herói da tela: garrafa em SVG com preenchimento animado.
 *
 * Só `transform`, `opacity` e o `fill` do SVG são animados (§12 do plano): o nível
 * sobe transladando o grupo da água, nunca mudando altura, e a virada para verde é
 * interpolação de `fill` via `useAnimatedProps`.
 */
export function ProgressBottle({
  hydrationMl,
  goalMl,
  pulse,
  scale = BOTTLE_SCALE_MAX,
}: Props) {
  const progress = goalMl > 0 ? Math.min(1, Math.max(0, hydrationMl / goalMl)) : 0;
  const done = hydrationMl >= goalMl;
  const alvoDoNivel = nivelDe(progress);

  /**
   * Nasce **no nível certo**, não vazio. Antes começava em `WATER_BOTTOM` e subia
   * por 600 ms a cada montagem: abrir o app ou voltar para a aba mostrava a garrafa
   * branca e só depois a água — era a "camada branca antes da água".
   */
  const nivel = useSharedValue(alvoDoNivel);
  const cor = useSharedValue(done ? 1 : 0);
  /**
   * Fases em [0,1) das quatro animações contínuas — as três derivas e o respiro.
   *
   * São avançadas por um relógio de quadro, e **não** por `withRepeat`: aquele
   * reinicia o ciclo do valor guardado no início, o que dava o salto que se via como
   * "a onda vai de uma vez para a direita". Com fase + módulo o movimento é contínuo
   * por construção, e a volta ao zero é matematicamente invisível.
   */
  const faseA = useSharedValue(0);
  const faseB = useSharedValue(0);
  const faseC = useSharedValue(0);
  const faseRespiro = useSharedValue(0);
  const pop = useSharedValue(1);
  const anel = useSharedValue(0);

  const reduzido = useReducedMotionPref();
  const marcoAnterior = useRef(0);

  /**
   * Sobe a água. `withSpring` em vez de `withTiming`: o começo é mais rápido — o
   * azul aparece nos primeiros ~120 ms em vez de rastejar por 600 — e a chegada tem
   * o assentamento de líquido, que um easing não dá.
   *
   * O leve passar do alvo é bem-vindo aqui: no cheio a água entra no gargalo, o que
   * lê como garrafa cheia, e o recorte da silhueta impede qualquer vazamento.
   */
  useEffect(() => {
    nivel.value = reduzido
      ? withTiming(alvoDoNivel, { duration: 0 })
      : withSpring(alvoDoNivel, { damping: 13, stiffness: 150, mass: 0.85 });
  }, [alvoDoNivel, reduzido, nivel]);

  /**
   * Relógio único de tudo que se move sem parar: as três derivas e o respiro.
   *
   * Um `useFrameCallback` avança as fases pelo tempo real de cada quadro. Isso troca
   * quatro animações que se reiniciavam por quatro contadores que só crescem — o
   * movimento fica contínuo por construção, sem o salto no fim do ciclo.
   *
   * O `dt` é limitado: voltar do segundo plano entrega um quadro com centenas de
   * milissegundos, e sem o teto a onda daria um pulo grande justamente ao reabrir.
   */
  const relogio = useFrameCallback((quadro) => {
    const dt = Math.min((quadro.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    faseA.value = (faseA.value + dt / ONDA_A.segundos) % 1;
    faseB.value = (faseB.value + dt / ONDA_B.segundos) % 1;
    faseC.value = (faseC.value + dt / ESPUMA.segundos) % 1;
    faseRespiro.value = (faseRespiro.value + dt / RESPIRO_SEG) % 1;
  }, false);

  useEffect(() => {
    relogio.setActive(!reduzido);
  }, [reduzido, relogio]);

  useEffect(() => {
    cor.value = withTiming(done ? 1 : 0, { duration: 400 });
  }, [done, cor]);

  // Marco de 25/50/75%: pop na garrafa + anel expandindo.
  useEffect(() => {
    const cruzou = MILESTONES.filter((m) => progress >= m).length;
    const anterior = marcoAnterior.current;
    marcoAnterior.current = cruzou;

    if (cruzou <= anterior || reduzido || pulse === 0) return;

    pop.value = withSequence(
      withTiming(1.12, { duration: 140, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
    anel.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(1, { duration: 620, easing: Easing.out(Easing.quad) }),
    );
  }, [progress, pulse, reduzido, pop, anel]);

  /**
   * A superfície: nível da água mais o respiro, que é uma senoide da fase. Seno em
   * vez de vai-e-volta interpolado porque é suave nas duas pontas por definição — não
   * existe instante em que ele mude de direção com quina.
   */
  const superficie = () => {
    'worklet';
    return nivel.value + Math.sin(faseRespiro.value * 2 * Math.PI) * RESPIRO;
  };

  /** Deriva de uma camada: a fase vira deslocamento dentro de um período. */
  const deriva = (fase: number, periodo: number, paraDireita: boolean) => {
    'worklet';
    // O deslocamento fica sempre em (-periodo, 0]: a forma tem o dobro da largura
    // visível, então nessa faixa ela cobre a garrafa inteira em qualquer fase.
    return paraDireita ? -periodo * (1 - fase) : -periodo * fase;
  };

  const aguaFill = () => {
    'worklet';
    return interpolateColor(cor.value, [0, 1], [tokens.agua, tokens.meta]);
  };

  // Cada camada carrega x, y e cor num só `animatedProps`: o `<Use>` recebe a
  // posição horizontal da onda e a vertical da superfície de uma vez.
  const ondaAProps = useAnimatedProps(() => ({
    x: deriva(faseA.value, ONDA_A.periodo, false),
    y: superficie(),
    fill: aguaFill(),
  }));
  const ondaBProps = useAnimatedProps(() => ({
    x: deriva(faseB.value, ONDA_B.periodo, true),
    y: superficie(),
    fill: aguaFill(),
  }));
  const espumaProps = useAnimatedProps(() => ({
    x: deriva(faseC.value, ESPUMA.periodo, false),
    y: superficie(),
  }));
  /**
   * Recorte do texto submerso. É a **mesma forma da onda**, não um retângulo no nível
   * médio: com a linha reta, na crista a água já cobria o número e ele seguia escuro,
   * e no vale o branco era desenhado sobre o fundo branco e sumia — o número aparecia
   * quebrado. Seguindo a onda, o corte cai exatamente na borda molhada.
   */
  const submersoProps = useAnimatedProps(() => ({
    x: deriva(faseA.value, ONDA_A.periodo, false),
    y: superficie(),
  }));

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const anelStyle = useAnimatedStyle(() => ({
    opacity: anel.value === 0 ? 0 : 0.5 * (1 - anel.value),
    transform: [{ scale: 0.9 + anel.value * 0.5 }],
  }));

  const par = formatPair(hydrationMl, goalMl);

  return (
    <View
      className="items-center justify-center"
      accessible
      accessibilityLabel={`${par.value} de ${par.total} ${par.unit} bebidos hoje`}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: W * scale,
            height: W * scale,
            borderRadius: (W * scale) / 2,
            borderWidth: 3,
            borderColor: done ? tokens.meta : tokens.agua,
          },
          anelStyle,
        ]}
      />

      <Animated.View style={popStyle}>
        <Svg width={W * scale} height={H * scale} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <ClipPath id="interior">
              <Path d={BOTTLE_D} />
            </ClipPath>
            {/* As ondas moram aqui e são posicionadas por `<Use>` lá embaixo. */}
            <Path id="ondaA" d={ONDA_A.d} />
            <Path id="ondaB" d={ONDA_B.d} />
            <Path id="espuma" d={ESPUMA.d} />

            <ClipPath id="submerso">
              <AnimatedUse href="#ondaA" animatedProps={submersoProps} />
            </ClipPath>
          </Defs>

          {/* Trilha */}
          <Path d={BOTTLE_D} fill={tokens.canvas} />

          {/* Marcações: cinzas no vazio, cobertas pela água conforme sobe */}
          <G clipPath="url(#interior)">
            {MILESTONES.map((m) => {
              const y = nivelDe(m);
              return (
                <Line
                  key={m}
                  x1={CX + 18}
                  y1={y}
                  x2={CX + BODY_HALF - 8}
                  y2={y}
                  stroke={tokens.linha}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Água: cada camada é um `<Use>` posicionado em x (deriva da onda) e y
                (nível da superfície). O `fill` estático é a rede do primeiro quadro —
                sem ele o path existe antes de `animatedProps` pintar. */}
            <AnimatedUse href="#ondaA" fill={tokens.agua} animatedProps={ondaAProps} />
            <AnimatedUse
              href="#ondaB"
              fill={tokens.agua}
              opacity={ONDA_B.opacidade}
              animatedProps={ondaBProps}
            />
            {/* Espuma: `fill="none"` — só o traço. Com preenchimento, a forma desceria
                até o fundo e clarearia a água inteira. */}
            <AnimatedUse
              href="#espuma"
              fill="none"
              stroke={tokens.canvas}
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={0.55}
              animatedProps={espumaProps}
            />

            {/* Marcações sobre a água */}
            {MILESTONES.map((m) => {
              const y = nivelDe(m);
              return (
                <Line
                  key={`sobre-${m}`}
                  x1={CX + 18}
                  y1={y}
                  x2={CX + BODY_HALF - 8}
                  y2={y}
                  stroke={tokens.canvas}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  opacity={0.4}
                />
              );
            })}
          </G>

          {/* Tampa e contorno */}
          <Rect
            x={CX - 26}
            y={4}
            width={52}
            height={15}
            rx={5}
            fill={tokens.linhaSutil}
            stroke={tokens.linha}
            strokeWidth={2.5}
          />
          <Path d={BOTTLE_D} fill="none" stroke={tokens.linha} strokeWidth={2.5} />

          {/* Total no centro (§5.2). Escrito **duas vezes**: a versão escura inteira, e
              a branca por cima recortada pela água. Assim a troca de cor acontece na
              borda molhada — e não há como sobrar buraco, porque a camada de baixo
              está sempre completa. Uma cor só não resolveria: a superfície corta o
              texto no meio. */}
          {(
            [
              { chave: 'seco', recorte: undefined, cor: tokens.texto, corSub: tokens.textoOff },
              { chave: 'molhado', recorte: 'url(#submerso)', cor: tokens.canvas, corSub: tokens.canvas },
            ] as const
          ).map(({ chave, recorte, cor, corSub }) => (
            <G key={chave} clipPath={recorte}>
              <SvgText
                x={CX}
                y={TEXT_Y}
                textAnchor="middle"
                fontFamily="Fredoka_700Bold"
                fontSize={36}
                fill={cor}>
                {par.value}
              </SvgText>
              <SvgText
                x={CX}
                y={TEXT_Y + 22}
                textAnchor="middle"
                fontFamily="Nunito_600SemiBold"
                fontSize={14}
                fill={corSub}>
                {`de ${par.total} ${par.unit}`}
              </SvgText>
            </G>
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}
