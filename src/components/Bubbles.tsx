import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import { tokens } from '@/design/tokens';
import { useReducedMotionPref } from '@/lib/motion';

type Semente = {
  /** Chave estável da lista — não usar `x`, que pode repetir ao mexer no arranjo. */
  id: string;
  /** Fração da largura da tela. */
  x: number;
  r: number;
  /** Segundos para atravessar a tela de baixo a cima. */
  seg: number;
  /** Onde ela começa no trajeto, em [0,1). Distribui as bolhas na largada. */
  fase: number;
  /** Amplitude do bamboleio lateral, em pontos. */
  desvio: number;
  /**
   * Meias-voltas do bamboleio ao longo da subida. **Múltiplo de 0,5** de propósito:
   * é o que faz o seno fechar em zero nas duas pontas, sem tranco na volta do ciclo.
   */
  voltas: number;
  /** 0 = véu; 1 = véu suave, que lê como bolha mais ao fundo. */
  tom: 0 | 1;
  /**
   * Fase em que a bolha **estoura**, ou `null` para subir até o topo e sumir de leve.
   * Estourar é um momento, então não vale para todas: se a tela inteira pipocasse, o
   * fundo roubaria a atenção da garrafa.
   */
  estouraEm: number | null;
};

/** Quanto da fase dura o estouro. Curto de propósito — é um estalo, não um sumiço. */
const ESTOURO = 0.07;

/**
 * Posição e tamanho determinísticos por índice — nada de `Math.random`, para o fundo
 * ser sempre o mesmo e não "piscar" diferente a cada abertura.
 *
 * Duas famílias de tamanho misturadas de propósito: as grandes e lentas dão a
 * sensação de profundidade, as pequenas e rápidas dão vida. Se todas tivessem o mesmo
 * porte, a tela leria como um padrão em vez de água.
 *
 * **As que estouram vivem nas faixas laterais.** No centro a garrafa cobre quase toda
 * a altura útil, então estouro ali é trabalho jogado fora — a primeira versão tinha
 * quatro dos sete escondidos atrás dela.
 *
 * As posições foram conferidas contra a tela **mais estreita** (375pt, o SE): no pico
 * o estouro chega a 2,6× do raio e ainda soma o bamboleio, então x perto da borda
 * cortava metade do estalo. A folga mínima que sobrou é de 5pt.
 */
const BOLHAS: Semente[] = [
  // Estouram — laterais, tom cheio e raio maior, para o estalo ter presença
  { id: 'p1', x: 0.12, r: 13, seg: 12, fase: 0.1, desvio: 8, voltas: 1.5, tom: 0, estouraEm: 0.3 },
  { id: 'p2', x: 0.18, r: 15, seg: 15, fase: 0.55, desvio: 7, voltas: 1, tom: 0, estouraEm: 0.52 },
  { id: 'p3', x: 0.24, r: 12, seg: 11, fase: 0.8, desvio: 9, voltas: 1.5, tom: 0, estouraEm: 0.22 },
  { id: 'p4', x: 0.14, r: 12, seg: 13, fase: 0.42, desvio: 10, voltas: 2, tom: 0, estouraEm: 0.7 },
  { id: 'p5', x: 0.8, r: 15, seg: 14, fase: 0.35, desvio: 8, voltas: 1, tom: 0, estouraEm: 0.45 },
  { id: 'p6', x: 0.86, r: 13, seg: 12, fase: 0.68, desvio: 9, voltas: 1.5, tom: 0, estouraEm: 0.62 },
  { id: 'p7', x: 0.84, r: 14, seg: 16, fase: 0.05, desvio: 6, voltas: 1, tom: 0, estouraEm: 0.35 },

  // Sobem até o topo e sumem de leve
  { id: 'n1', x: 0.03, r: 9, seg: 11, fase: 0.25, desvio: 12, voltas: 2.5, tom: 1, estouraEm: null },
  { id: 'n2', x: 0.16, r: 10, seg: 13, fase: 0.9, desvio: 11, voltas: 2, tom: 1, estouraEm: null },
  { id: 'n3', x: 0.28, r: 20, seg: 20, fase: 0.3, desvio: 7, voltas: 1, tom: 0, estouraEm: null },
  { id: 'n4', x: 0.3, r: 8, seg: 10, fase: 0.62, desvio: 14, voltas: 3, tom: 1, estouraEm: null },
  { id: 'n5', x: 0.37, r: 13, seg: 15, fase: 0.15, desvio: 9, voltas: 1.5, tom: 0, estouraEm: null },
  { id: 'n6', x: 0.44, r: 23, seg: 22, fase: 0.48, desvio: 6, voltas: 1, tom: 1, estouraEm: null },
  { id: 'n7', x: 0.5, r: 9, seg: 12, fase: 0.85, desvio: 13, voltas: 2.5, tom: 0, estouraEm: null },
  { id: 'n8', x: 0.57, r: 16, seg: 18, fase: 0.2, desvio: 8, voltas: 1, tom: 1, estouraEm: null },
  { id: 'n9', x: 0.63, r: 11, seg: 13, fase: 0.72, desvio: 11, voltas: 2, tom: 0, estouraEm: null },
  { id: 'n10', x: 0.7, r: 26, seg: 23, fase: 0.4, desvio: 6, voltas: 1, tom: 1, estouraEm: null },
  { id: 'n11', x: 0.76, r: 10, seg: 12, fase: 0.08, desvio: 12, voltas: 2, tom: 0, estouraEm: null },
  { id: 'n12', x: 0.86, r: 8, seg: 10, fase: 0.58, desvio: 14, voltas: 3, tom: 1, estouraEm: null },
  { id: 'n13', x: 0.97, r: 12, seg: 14, fase: 0.78, desvio: 9, voltas: 1.5, tom: 1, estouraEm: null },
];

function Bolha({
  tempo,
  bolha,
  altura,
  largura,
}: {
  /** Segundos desde a montagem, sempre crescente. */
  tempo: SharedValue<number>;
  bolha: Semente;
  altura: number;
  largura: number;
}) {
  const { r, seg, fase, desvio, voltas, estouraEm } = bolha;

  const style = useAnimatedStyle(() => {
    // Fase própria a partir do relógio comum. O módulo é o que fecha o ciclo: em vez
    // de reiniciar a animação, o valor só dá a volta — e a volta cai onde a opacidade
    // já é zero, então não se vê.
    const p = (tempo.value / seg + fase) % 1;

    // Ancorada na base (`bottom: 0`), então **subir é translateY negativo**.
    const subida = (f: number) => r * 2 - f * (altura + r * 4);
    // Bamboleio: bolha de verdade não sobe em linha reta.
    const lado = (f: number) => Math.sin(f * Math.PI * 2 * voltas) * desvio;

    if (estouraEm !== null) {
      if (p < estouraEm) {
        // Subindo em direção ao ponto do estouro. A entrada é uma rampa curta em vez
        // do seno inteiro: a bolha precisa estar cheia de opacidade quando estoura.
        return {
          transform: [
            { translateY: subida(p) },
            { translateX: lado(p) },
            { scale: 0.85 + p * 0.3 },
          ],
          opacity: Math.min(1, p / 0.15) * 0.9,
        };
      }

      const t = Math.min(1, (p - estouraEm) / ESTOURO);
      // Estoura **no lugar**: a posição congela no ponto, e o que muda é o tamanho.
      // Expoentes diferentes em escala e opacidade dão o estalo — abre rápido e o
      // rastro apaga mais rápido ainda. Curvas lineares dariam um balão inflando.
      return {
        transform: [
          { translateY: subida(estouraEm) },
          { translateX: lado(estouraEm) },
          { scale: (0.85 + estouraEm * 0.3) * (1 + Math.pow(t, 0.55) * 1.6) },
        ],
        opacity: Math.pow(1 - t, 1.6) * 0.9,
      };
    }

    return {
      transform: [
        { translateY: subida(p) },
        { translateX: lado(p) },
        // Cresce um pouco na subida, como quem perde pressão.
        { scale: 0.85 + p * 0.3 },
      ],
      // Some nas duas pontas do trajeto, para não nascer nem morrer na cara de quem
      // está olhando.
      opacity: Math.sin(p * Math.PI) * 0.9,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          bottom: 0,
          left: bolha.x * largura - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: bolha.tom === 0 ? tokens.aguaVeu : tokens.aguaVeuSuave,
        },
        style,
      ]}
    />
  );
}

/**
 * Camada de bolhas subindo. **Só a tela Hoje monta isto** — no onboarding o fundo
 * fica quieto, para a atenção ficar na pergunta da vez.
 *
 * Um relógio único move todas: em vez de uma animação repetida por bolha, cada uma
 * deriva a própria fase do tempo corrido. Isso mantém o movimento contínuo (nada
 * reinicia) e troca vinte animações por um `useFrameCallback` só.
 *
 * É movimento decorativo, exceção registrada no SKILL.md. Sob movimento reduzido
 * nada é montado.
 */
export function Bubbles() {
  const { width, height } = useWindowDimensions();
  const reduzido = useReducedMotionPref();
  const tempo = useSharedValue(0);

  const relogio = useFrameCallback((quadro) => {
    // Teto no `dt`: voltar do segundo plano entrega um quadro longo, e sem o limite
    // as bolhas dariam um salto justamente ao reabrir o app.
    tempo.value += Math.min((quadro.timeSincePreviousFrame ?? 16) / 1000, 0.05);
  }, false);

  useEffect(() => {
    relogio.setActive(!reduzido);
  }, [reduzido, relogio]);

  if (reduzido) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {BOLHAS.map((bolha) => (
        <Bolha key={bolha.id} tempo={tempo} bolha={bolha} altura={height} largura={width} />
      ))}
    </View>
  );
}
