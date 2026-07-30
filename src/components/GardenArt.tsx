import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { tokens } from '@/design/tokens';
import type { GardenElementId } from '@/domain/garden';

/**
 * Arte do Cantinho: cada elemento é um SVG de poucas formas, mesma gramática do
 * mascote (silhueta primeiro, cantos redondos, sem gradiente).
 *
 * Todos desenham num quadro de 100×100 para o cenário poder posicioná-los por
 * fração, sem cada um ter sua própria escala.
 */

const VERDE = '#5FBF6A';
const VERDE_ESCURO = '#3E9E4C';
const TERRA = '#C98B5E';
const TERRA_ESCURA = '#A8703F';
const PEDRA = '#B9C2C9';
const PEDRA_ESCURA = '#93A0A9';

function Vaso() {
  return (
    <>
      <Path d="M32 66 H68 L63 92 C 62 96 59 98 55 98 H45 C41 98 38 96 37 92 Z" fill={TERRA} />
      <Rect x="29" y="58" width="42" height="10" rx="4" fill={TERRA_ESCURA} />
    </>
  );
}

export function GardenArt({ id, size = 100 }: { id: GardenElementId; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {desenho(id)}
    </Svg>
  );
}

function desenho(id: GardenElementId) {
  switch (id) {
    case 'muda':
      return (
        <G>
          <Vaso />
          <Path d="M50 58 V40" stroke={VERDE_ESCURO} strokeWidth="5" strokeLinecap="round" />
          <Ellipse cx="38" cy="36" rx="12" ry="8" fill={VERDE} transform="rotate(-25 38 36)" />
          <Ellipse cx="62" cy="32" rx="12" ry="8" fill={VERDE} transform="rotate(25 62 32)" />
        </G>
      );

    case 'planta':
      return (
        <G>
          <Vaso />
          <Path d="M50 58 V28" stroke={VERDE_ESCURO} strokeWidth="5" strokeLinecap="round" />
          <Ellipse cx="34" cy="44" rx="14" ry="9" fill={VERDE} transform="rotate(-28 34 44)" />
          <Ellipse cx="66" cy="38" rx="14" ry="9" fill={VERDE} transform="rotate(28 66 38)" />
          <Ellipse cx="50" cy="22" rx="10" ry="13" fill={VERDE} />
        </G>
      );

    case 'samambaia':
      return (
        <G>
          <Vaso />
          {[-40, -20, 0, 20, 40].map((ang) => (
            <G key={ang} transform={`rotate(${ang} 50 58)`}>
              <Path d="M50 58 V16" stroke={VERDE_ESCURO} strokeWidth="4" strokeLinecap="round" />
              <Ellipse cx="50" cy="26" rx="6" ry="11" fill={VERDE} />
            </G>
          ))}
        </G>
      );

    case 'cacto':
      return (
        <G>
          <Vaso />
          <Rect x="41" y="20" width="18" height="42" rx="9" fill={VERDE} />
          <Rect x="24" y="34" width="12" height="22" rx="6" fill={VERDE} />
          <Rect x="64" y="28" width="12" height="26" rx="6" fill={VERDE} />
          <Circle cx="50" cy="26" r="3" fill={VERDE_ESCURO} />
        </G>
      );

    case 'flor':
      return (
        <G>
          <Vaso />
          <Path d="M50 58 V34" stroke={VERDE_ESCURO} strokeWidth="5" strokeLinecap="round" />
          {[0, 72, 144, 216, 288].map((ang) => (
            <Ellipse
              key={ang}
              cx="50"
              cy="18"
              rx="8"
              ry="12"
              fill={tokens.aguaTint}
              transform={`rotate(${ang} 50 30)`}
            />
          ))}
          <Circle cx="50" cy="30" r="8" fill={tokens.xp} />
          <Ellipse cx="36" cy="46" rx="10" ry="6" fill={VERDE} transform="rotate(-20 36 46)" />
        </G>
      );

    case 'pedra':
      return (
        <G>
          <Path d="M14 84 C 18 58 42 48 60 56 C 78 64 88 78 86 86 Z" fill={PEDRA} />
          <Path d="M14 84 C 30 78 62 76 86 86 Z" fill={PEDRA_ESCURA} />
        </G>
      );

    case 'pedrinhas':
      return (
        <G>
          <Ellipse cx="30" cy="76" rx="18" ry="12" fill={PEDRA} />
          <Ellipse cx="62" cy="82" rx="14" ry="9" fill={PEDRA_ESCURA} />
          <Ellipse cx="80" cy="74" rx="10" ry="7" fill={PEDRA} />
        </G>
      );

    case 'poca':
      return (
        <G>
          <Ellipse cx="50" cy="76" rx="40" ry="14" fill={tokens.aguaTint} />
          <Ellipse cx="42" cy="72" rx="18" ry="6" fill={tokens.canvas} opacity={0.7} />
        </G>
      );

    case 'nuvem':
      return (
        <G>
          <Circle cx="36" cy="56" r="18" fill={tokens.canvas} />
          <Circle cx="58" cy="50" r="22" fill={tokens.canvas} />
          <Circle cx="76" cy="60" r="15" fill={tokens.canvas} />
          <Rect x="30" y="60" width="52" height="16" rx="8" fill={tokens.canvas} />
        </G>
      );

    case 'sol':
      return (
        <G>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => (
            <Rect
              key={ang}
              x="47"
              y="6"
              width="6"
              height="16"
              rx="3"
              fill={tokens.xp}
              transform={`rotate(${ang} 50 50)`}
            />
          ))}
          <Circle cx="50" cy="50" r="24" fill={tokens.xp} />
        </G>
      );

    case 'regador':
      return (
        <G>
          <Rect x="30" y="46" width="40" height="34" rx="10" fill={tokens.agua} />
          <Path d="M70 54 L88 40 L92 46 L74 62 Z" fill={tokens.agua} />
          <Path
            d="M34 46 C 30 30 48 26 50 40"
            stroke={tokens.aguaLip}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <Circle cx="88" cy="70" r="4" fill={tokens.aguaTint} />
          <Circle cx="82" cy="82" r="3" fill={tokens.aguaTint} />
        </G>
      );

    case 'peixinho':
      return (
        <G>
          {/* pote de vidro com água */}
          <Path d="M22 40 H78 V74 C 78 86 68 94 56 94 H44 C32 94 22 86 22 74 Z" fill={tokens.aguaTint} />
          <Rect x="18" y="34" width="64" height="8" rx="4" fill={tokens.linha} />
          {/* peixe */}
          <Ellipse cx="48" cy="66" rx="14" ry="10" fill={tokens.ofensiva} />
          <Path d="M62 66 L74 58 V74 Z" fill={tokens.ofensiva} />
          <Circle cx="43" cy="63" r="2.5" fill={tokens.texto} />
        </G>
      );

    default:
      return null;
  }
}
