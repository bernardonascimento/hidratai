import { GlassWater } from 'lucide-react-native';
import { Text } from 'react-native';

import { Pressable3D } from '@/components/Pressable3D';
import { tokens } from '@/design/tokens';

type Props = {
  ml: number;
  selected: boolean;
  onSelect: () => void;
  /** Escala do ícone: comunica o volume pela figura, não pelo texto. */
  iconSize: number;
};

/**
 * Card de escolha de volume — icon-first, com o mesmo ícone da família Lucide em
 * três tamanhos: o volume se lê pela figura antes de ler o número.
 *
 * É pressável, então tem lip de 4px como qualquer pressável do app.
 *
 * A face usa `flex-1` e **não** uma altura mínima. Com `min-h`, o card do maior ícone
 * ficava 93px e os outros 88: só nele a altura vinha do conteúdo, então só o press dele
 * mexia na altura da fila — e o botão logo abaixo dava um pulo de 1pt. Preenchendo o
 * envelope, os três têm exatamente a mesma altura, e ela vem da fila (`VOLUME_ROW_H`).
 *
 * O `py-1` é curto porque a fila mede 80: com as bordas (6) e o conteúdo mais alto (63),
 * sobram 11px para o padding dos dois lados. O respiro visual vem do `justify-center`,
 * não do padding.
 */
export function VolumeCard({ ml, selected, onSelect, iconSize }: Props) {
  return (
    <Pressable3D
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${ml} mililitros`}
      className="flex-1"
      faceClassName={`flex-1 items-center justify-center gap-1 rounded-2xl border-2 px-2 py-1 ${
        selected
          ? 'border-agua border-b-agua-lip bg-agua-tint'
          : 'border-linha border-b-linha bg-canvas'
      }`}>
      <GlassWater
        size={iconSize}
        color={selected ? tokens.agua : tokens.textoSoft}
        strokeWidth={2}
      />
      {/* 18px, não 14: o número é a confirmação do que o ícone já sugere, e em corpo
          pequeno ele exigia esforço para uma informação que se lê de passagem. Cabe nos
          88px do card — o maior ícone (34) mais o texto somam 86 com os paddings. */}
      <Text
        maxFontSizeMultiplier={1.3}
        className={`font-displayBold text-lg ${selected ? 'text-agua' : 'text-texto-soft'}`}>
        {ml}
      </Text>
    </Pressable3D>
  );
}
