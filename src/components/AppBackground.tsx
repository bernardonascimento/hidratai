import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { tokens } from '@/design/tokens';

const ONDA_H = 230;

/**
 * Fundo do app: superfície azul-clarinho (`fundo`) com uma faixa de ondas no topo.
 * Fica atrás das rotas: montado no layout raiz para as abas, que nunca coexistem
 * na tela. As telas do onboarding montam o seu **também** — ali é um Stack, e a
 * animação põe duas telas na tela ao mesmo tempo. Montar duas vezes é barato: são
 * três paths estáticos, sem animação.
 *
 * As bolhas **não moram aqui**: são a camada `Bubbles`, montada só pela tela Hoje.
 * No onboarding o fundo fica parado de propósito.
 */
export function AppBackground() {
  const { width } = useWindowDimensions();

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.fundo }]} pointerEvents="none">
      {/* Três cristas sólidas em tons do mesmo azul, sem gradiente. Nada de
          opacidade baixa: tint claro com opacidade sobre um fundo claro
          desaparece, foi o que aconteceu na primeira tentativa. */}
      <Svg width={width} height={ONDA_H} style={{ position: 'absolute', top: 0 }}>
        <Path
          d={`M0 0 H${width} V${ONDA_H * 0.78} C ${width * 0.72} ${ONDA_H * 1.0} ${width * 0.34} ${ONDA_H * 0.5} 0 ${ONDA_H * 0.74} Z`}
          fill={tokens.aguaVeuSuave}
        />
        <Path
          d={`M0 0 H${width} V${ONDA_H * 0.58} C ${width * 0.76} ${ONDA_H * 0.82} ${width * 0.38} ${ONDA_H * 0.3} 0 ${ONDA_H * 0.56} Z`}
          fill={tokens.aguaTint}
        />
        <Path
          d={`M0 0 H${width} V${ONDA_H * 0.34} C ${width * 0.66} ${ONDA_H * 0.58} ${width * 0.28} ${ONDA_H * 0.08} 0 ${ONDA_H * 0.3} Z`}
          fill={tokens.aguaVeu}
        />
      </Svg>
    </View>
  );
}
