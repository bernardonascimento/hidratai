import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { tokens } from '@/design/tokens';
import type { Mood } from '@/domain/mascot';
import { useReducedMotionPref } from '@/lib/motion';

export type { Mood };

type Props = {
  mood: Mood;
  size?: number;
};

/**
 * Gotinha — mascote em SVG: poucas formas redondas, silhueta primeiro.
 *
 * Poses trocáveis no mesmo corpo (§8.2), não sprite sheet: o bundle fica enxuto e
 * dá para animar partes soltas. O movimento acompanha o estado — `animada` respira,
 * `radiante` dá o pop de festa, `neutra` e `atenta` ficam paradas.
 */
export function Gotinha({ mood, size = 120 }: Props) {
  const bob = useSharedValue(0);
  const pop = useSharedValue(1);
  const reduzido = useReducedMotionPref();

  useEffect(() => {
    if (reduzido) {
      bob.value = 0;
      pop.value = 1;
      return;
    }

    if (mood === 'animada') {
      bob.value = withRepeat(
        withSequence(withTiming(-5, { duration: 1200 }), withTiming(0, { duration: 1200 })),
        -1,
        false,
      );
    } else {
      bob.value = withTiming(0, { duration: 200 });
    }

    if (mood === 'radiante') {
      pop.value = withSequence(
        withSpring(1.18, { damping: 6, stiffness: 220 }),
        withSpring(1, { damping: 10, stiffness: 180 }),
      );
    }
  }, [mood, reduzido, bob, pop]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { scale: pop.value }],
  }));

  return (
    <Animated.View style={style}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Corpo: gota com ponta para cima */}
        <Path
          d="M50 6 C 50 6 84 46 84 62 A 34 34 0 1 1 16 62 C 16 46 50 6 50 6 Z"
          fill={tokens.agua}
        />
        {/* Barriga clara — dá volume sem gradiente */}
        <Ellipse cx="50" cy="70" rx="21" ry="16" fill={tokens.aguaTint} />

        {mood === 'neutra' ? (
          <>
            {/* Olhos abertos e calmos, boca num traço curto: presente, sem euforia */}
            <Circle cx="39" cy="57" r="9" fill={tokens.canvas} />
            <Circle cx="61" cy="57" r="9" fill={tokens.canvas} />
            <Circle cx="39" cy="58" r="4.5" fill={tokens.texto} />
            <Circle cx="61" cy="58" r="4.5" fill={tokens.texto} />
            <Path
              d="M44 75 H56"
              stroke={tokens.aguaLip}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </>
        ) : mood === 'atenta' ? (
          <>
            {/* Curiosa, **não** triste: olhos grandes com a pupila alta, como quem
                acabou de notar algo, e a boca num "o" pequeno. Nada de sobrancelha
                caída nem canto de boca para baixo — culpa está fora do vocabulário. */}
            <Circle cx="38" cy="57" r="10.5" fill={tokens.canvas} />
            <Circle cx="62" cy="57" r="10.5" fill={tokens.canvas} />
            <Circle cx="38" cy="54.5" r="5" fill={tokens.texto} />
            <Circle cx="62" cy="54.5" r="5" fill={tokens.texto} />
            {/* Brilho: o que separa "atenta" de "assustada" */}
            <Circle cx="40" cy="52" r="1.6" fill={tokens.canvas} />
            <Circle cx="64" cy="52" r="1.6" fill={tokens.canvas} />
            <Circle
              cx="50"
              cy="75"
              r="3.6"
              fill="none"
              stroke={tokens.aguaLip}
              strokeWidth="3"
            />
          </>
        ) : mood === 'radiante' ? (
          <>
            {/* Olhos felizes em arco */}
            <Path
              d="M31 59 Q38 50 45 59"
              stroke={tokens.texto}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M55 59 Q62 50 69 59"
              stroke={tokens.texto}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Boca aberta de comemoração */}
            <Path
              d="M40 70 Q50 84 60 70 Z"
              fill={tokens.canvas}
              stroke={tokens.aguaLip}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            {/* animada: olhos abertos e sorriso suave */}
            <Circle cx="39" cy="57" r="9" fill={tokens.canvas} />
            <Circle cx="61" cy="57" r="9" fill={tokens.canvas} />
            <Circle cx="39" cy="58" r="4.5" fill={tokens.texto} />
            <Circle cx="61" cy="58" r="4.5" fill={tokens.texto} />
            <Path
              d="M42 74 Q50 80 58 74"
              stroke={tokens.aguaLip}
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}
