import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';

import { useReducedMotionPref } from '@/lib/motion';

type Props = {
  value: number;
  format?: (value: number) => string;
  className?: string;
  durationMs?: number;
};

/**
 * Contador interpolado (§8.1): o número sobe até o valor em ~400 ms.
 *
 * A interpolação roda em JS porque o que muda é **texto**, não um estilo — não há
 * como fazer isso no worklet do Reanimated. Sob movimento reduzido, vai direto ao
 * valor final.
 */
export function AnimatedNumber({ value, format, className, durationMs = 400 }: Props) {
  const reduzido = useReducedMotionPref();
  const [atual, setAtual] = useState(reduzido ? value : 0);
  const anterior = useRef(reduzido ? value : 0);

  // Sem movimento não há o que animar: o valor vem direto da prop, e o efeito só
  // existe para o caso animado. Antes isto era um `setState` dentro do effect, que
  // custava um render a mais em cada mudança de valor.
  const exibido = reduzido ? value : atual;

  useEffect(() => {
    if (reduzido) {
      anterior.current = value;
      return;
    }

    const de = anterior.current;
    const inicio = Date.now();
    anterior.current = value;

    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - inicio) / durationMs);
      // easeOutCubic, para casar com a subida da água
      const eased = 1 - (1 - t) ** 3;
      setAtual(Math.round(de + (value - de) * eased));
      if (t >= 1) clearInterval(timer);
    }, 16);

    return () => clearInterval(timer);
  }, [value, durationMs, reduzido]);

  return (
    <Text maxFontSizeMultiplier={1.2} className={className}>
      {format ? format(exibido) : String(exibido)}
    </Text>
  );
}
