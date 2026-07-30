import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { tokens } from '@/design/tokens';

type Props = {
  text: string;
  /** Lado onde fica quem fala — o bico aponta para lá. */
  from?: 'left' | 'right';
};

/** Quanto o bico avança para fora do corpo do balão. */
const BICO_W = 12;
/** Meia-altura da base do bico: onde as diagonais encontram a curva. */
const BICO_B = 6;
/** Raio da ponta: bico em bico de agulha destoa do arredondado do app. */
const BICO_R = 1.5;
/** Espessura do contorno. */
const TRACO = 2;
/**
 * Folga entre o desenho e a moldura do SVG.
 *
 * Não é enfeite: o traço é centrado no path, então metade dele fica **para fora** da
 * linha. Com o desenho encostado na borda do SVG, essa metade era cortada — o arco
 * direito chega a `x = w` e o traço queria ir até `w + 1`. Dava um balão com as
 * bordas raspadas. `TRACO / 2` é o mínimo; o ponto extra cobre arredondamento.
 */
const FOLGA = TRACO / 2 + 1;

/**
 * Contorno do balão em **um traço só**: a pill e o bico no mesmo path.
 *
 * O bico não é um elemento colado por cima. Remendar a junção não funciona: o
 * traço do bico sobra fora da curva (viram riscos soltos) e tapar isso com um
 * retângulo branco come pedaços da própria curva. Aqui as diagonais **entram no
 * contorno**, encontrando o arco esquerdo exatamente em `cy ± BICO_B`, e o arco
 * segue de onde elas param — não existe junção para consertar.
 *
 * `bw` e `bh` são as medidas do **corpo** do balão. Todo o desenho sai deslocado de
 * `FOLGA`, e o SVG é criado com `2 * FOLGA` a mais em cada eixo — é isso que dá lugar
 * para o traço inteiro.
 */
function contorno(bw: number, bh: number): string {
  const o = FOLGA;
  const r = bh / 2;
  const b = Math.min(BICO_B, r - 2);
  const cxE = o + BICO_W + r;
  const cxD = o + bw - r;
  const cy = o + r;
  // Onde a diagonal cruza o arco, para o contorno não ter degrau.
  const px = cxE - Math.sqrt(r * r - b * b);

  return [
    `M ${cxE} ${o}`,
    `L ${cxD} ${o}`,
    `A ${r} ${r} 0 0 1 ${cxD} ${o + bh}`,
    `L ${cxE} ${o + bh}`,
    `A ${r} ${r} 0 0 1 ${px} ${cy + b}`,
    // Ponta arredondada: entra e sai a `BICO_R` do vértice, com ele de controle.
    `L ${o + BICO_R} ${cy + BICO_R}`,
    `Q ${o} ${cy} ${o + BICO_R} ${cy - BICO_R}`,
    `L ${px} ${cy - b}`,
    `A ${r} ${r} 0 0 1 ${cxE} ${o}`,
    'Z',
  ].join(' ');
}

/**
 * Balão de fala do mascote: pill branca com um bico apontando para quem fala.
 *
 * **Sem lip.** O lip de 4px é exclusivo do que se pode apertar (§9): aqui é
 * container, então o peso vem da borda de 2px, igual ao `Card`.
 *
 * Como o contorno é um path, o balão precisa saber o tamanho que o texto pediu —
 * daí o `onLayout`. O primeiro quadro sai sem contorno e o texto não pula, porque
 * o padding que define a caixa vive no `View`, não no desenho.
 */
export function SpeechBubble({ text, from = 'left' }: Props) {
  const [caixa, setCaixa] = useState<{ w: number; h: number } | null>(null);
  const naEsquerda = from === 'left';

  function medir(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    // Só re-renderiza em mudança real: `onLayout` repete o mesmo valor.
    if (caixa && Math.abs(caixa.w - width) < 0.5 && Math.abs(caixa.h - height) < 0.5) return;
    setCaixa({ w: width, h: height });
  }

  return (
    <View
      onLayout={medir}
      className="shrink px-4 py-2"
      style={naEsquerda ? { marginLeft: BICO_W } : { marginRight: BICO_W }}>
      {caixa && (
        <Svg
          width={caixa.w + BICO_W + FOLGA * 2}
          height={caixa.h + FOLGA * 2}
          style={{
            position: 'absolute',
            // O negativo tira a folga do caminho: o corpo do balão continua alinhado
            // com a caixa do texto, e o SVG só cresce para fora.
            top: -FOLGA,
            [naEsquerda ? 'left' : 'right']: -(BICO_W + FOLGA),
          }}>
          <G
            // Espelha para o bico apontar à direita, sem duplicar o path.
            transform={
              naEsquerda
                ? undefined
                : `translate(${caixa.w + BICO_W + FOLGA * 2}, 0) scale(-1, 1)`
            }>
            <Path
              d={contorno(caixa.w + BICO_W, caixa.h)}
              fill={tokens.canvas}
              stroke={tokens.linha}
              strokeWidth={TRACO}
              strokeLinejoin="round"
            />
          </G>
        </Svg>
      )}

      <Text maxFontSizeMultiplier={1.4} className="font-display text-lg text-texto">
        {text}
      </Text>
    </View>
  );
}
