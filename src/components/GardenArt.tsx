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
    case 'pedrinhas2':
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
    case 'nuvem2':
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
          {/* Pote de vidro. O corpo era `aguaTint` (#DDF4FF), **a mesma cor do fundo do
              cenário** (`bg-agua-tint`) — o pote sumia e sobrava um peixe flutuando no
              céu. Branco translúcido com aro cinza lê como vidro sobre o azul claro. */}
          <Path
            d="M22 40 H78 V74 C 78 86 68 94 56 94 H44 C32 94 22 86 22 74 Z"
            fill={tokens.canvas}
            opacity={0.75}
            stroke={tokens.linha}
            strokeWidth="2.5"
          />
          <Rect x="18" y="34" width="64" height="8" rx="4" fill={tokens.linha} />
          {/* peixe */}
          <Ellipse cx="48" cy="66" rx="14" ry="10" fill={tokens.ofensiva} />
          <Path d="M62 66 L74 58 V74 Z" fill={tokens.ofensiva} />
          <Circle cx="43" cy="63" r="2.5" fill={tokens.texto} />
        </G>
      );

    // ---------- Adereços de chão ----------

    case 'grama':
    case 'grama4':
      return (
        <G>
          {[24, 38, 50, 62, 76].map((x, i) => (
            <Path
              key={x}
              d={`M${x} 88 C ${x - 4} 74 ${x - 2} 66 ${x + (i % 2 === 0 ? 3 : -3)} 58`}
              stroke={VERDE}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </G>
      );

    case 'cogumelo':
      return (
        <G>
          <Rect x="43" y="62" width="14" height="26" rx="6" fill="#F2E3CE" />
          <Path d="M18 62 C 20 40 40 30 50 30 C 60 30 80 40 82 62 Z" fill="#E5645C" />
          <Circle cx="38" cy="50" r="5" fill={tokens.canvas} />
          <Circle cx="60" cy="46" r="4" fill={tokens.canvas} />
          <Circle cx="66" cy="56" r="3" fill={tokens.canvas} />
        </G>
      );

    case 'tulipa':
      return (
        <G>
          <Path d="M50 88 V50" stroke={VERDE_ESCURO} strokeWidth="5" strokeLinecap="round" />
          <Ellipse cx="34" cy="66" rx="12" ry="6" fill={VERDE} transform="rotate(-20 34 66)" />
          {/* A tulipa é três pétalas fechadas, não uma margarida: o desenho tem de se
              distinguir da 'flor' quando as duas estiverem no cenário. */}
          <Path d="M36 50 C 36 30 50 22 50 22 C 50 22 64 30 64 50 C 64 58 58 62 50 62 C 42 62 36 58 36 50 Z" fill="#E86A9A" />
          <Path d="M50 22 C 50 22 44 34 44 52" stroke="#D4507F" strokeWidth="3" fill="none" />
        </G>
      );

    case 'girassol':
      return (
        <G>
          <Path d="M50 92 V44" stroke={VERDE_ESCURO} strokeWidth="6" strokeLinecap="round" />
          <Ellipse cx="30" cy="68" rx="14" ry="7" fill={VERDE} transform="rotate(-25 30 68)" />
          <Ellipse cx="70" cy="76" rx="13" ry="7" fill={VERDE} transform="rotate(25 70 76)" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => (
            <Ellipse
              key={ang}
              cx="50"
              cy="16"
              rx="8"
              ry="13"
              fill={tokens.xp}
              transform={`rotate(${ang} 50 34)`}
            />
          ))}
          <Circle cx="50" cy="34" r="12" fill={TERRA_ESCURA} />
        </G>
      );

    case 'banquinho':
      return (
        <G>
          <Rect x="18" y="48" width="64" height="12" rx="5" fill={TERRA} />
          <Rect x="26" y="58" width="9" height="32" rx="4" fill={TERRA_ESCURA} />
          <Rect x="65" y="58" width="9" height="32" rx="4" fill={TERRA_ESCURA} />
        </G>
      );

    // ---------- Faixa do meio ----------

    case 'arbusto':
      return (
        <G>
          <Circle cx="34" cy="66" r="20" fill={VERDE} />
          <Circle cx="62" cy="62" r="24" fill={VERDE_ESCURO} />
          <Circle cx="50" cy="76" r="18" fill={VERDE} />
        </G>
      );

    case 'arvorezinha':
      return (
        <G>
          <Rect x="44" y="58" width="12" height="34" rx="5" fill={TERRA_ESCURA} />
          <Circle cx="50" cy="34" r="26" fill={VERDE_ESCURO} />
          <Circle cx="33" cy="46" r="16" fill={VERDE} />
          <Circle cx="67" cy="46" r="16" fill={VERDE} />
        </G>
      );

    case 'trepadeira':
      return (
        <G>
          <Path
            d="M50 92 C 34 74 66 60 50 42 C 38 28 58 18 50 8"
            stroke={VERDE_ESCURO}
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          {[
            [34, 78],
            [64, 60],
            [36, 40],
            [62, 22],
          ].map(([cx, cy]) => (
            <Ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="10" ry="7" fill={VERDE} />
          ))}
        </G>
      );

    case 'varal':
      /**
       * A primeira versão era uma corda em arco raso com quatro retângulos pequenos, e
       * no cenário lia como um sorriso com um paninho — a corda curvava demais e os
       * panos eram estreitos e claros sobre fundo claro.
       *
       * Corrigido com: dois postes que ancoram a cena, corda quase reta, panos maiores
       * e com contorno. O que faz ler como varal são os postes, não a corda.
       */
      return (
        <G>
          <Rect x="12" y="28" width="6" height="58" rx="3" fill={TERRA_ESCURA} />
          <Rect x="82" y="28" width="6" height="58" rx="3" fill={TERRA_ESCURA} />
          <Path
            d="M15 32 C 40 40 60 40 85 32"
            stroke={TERRA_ESCURA}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          {[
            [30, 37, tokens.canvas],
            [50, 39, tokens.aguaTint],
            [70, 37, tokens.metaTint],
          ].map(([x, y, cor]) => (
            <Rect
              key={String(x)}
              x={Number(x) - 9}
              y={Number(y)}
              width="18"
              height="26"
              rx="3"
              fill={String(cor)}
              stroke={tokens.linha}
              strokeWidth="2"
            />
          ))}
        </G>
      );

    // ---------- Céu ----------

    case 'borboleta':
      return (
        <G>
          {/* Asas em dois pares espelhados, o de cima maior — é o que faz ler como
              borboleta e não como laço. Rosa da tulipa, para não inventar cor nova. */}
          <Ellipse cx="34" cy="38" rx="17" ry="21" fill="#E86A9A" transform="rotate(-18 34 38)" />
          <Ellipse cx="66" cy="38" rx="17" ry="21" fill="#E86A9A" transform="rotate(18 66 38)" />
          <Ellipse cx="38" cy="64" rx="12" ry="14" fill="#D4507F" transform="rotate(-12 38 64)" />
          <Ellipse cx="62" cy="64" rx="12" ry="14" fill="#D4507F" transform="rotate(12 62 64)" />
          <Rect x="46" y="30" width="8" height="42" rx="4" fill={TERRA_ESCURA} />
          <Path d="M50 32 C 44 22 38 20 36 22" stroke={TERRA_ESCURA} strokeWidth="3" fill="none" strokeLinecap="round" />
          <Path d="M50 32 C 56 22 62 20 64 22" stroke={TERRA_ESCURA} strokeWidth="3" fill="none" strokeLinecap="round" />
        </G>
      );

    case 'passarinho':
      return (
        <G>
          <Ellipse cx="48" cy="56" rx="22" ry="16" fill={tokens.agua} />
          <Circle cx="66" cy="46" r="12" fill={tokens.agua} />
          <Path d="M76 44 L88 48 L76 52 Z" fill={tokens.ofensiva} />
          <Circle cx="69" cy="43" r="2.5" fill={tokens.texto} />
          <Path d="M30 50 C 22 38 42 34 46 48 Z" fill={tokens.aguaLip} />
        </G>
      );

    case 'arcoiris':
      return (
        <G>
          {/* Arcos concêntricos desenhados do maior para o menor: sem gradiente, que é
              regra do sistema de desenho. */}
          {[
            [42, '#E5645C'],
            [34, tokens.ofensiva],
            [26, tokens.xp],
            [18, VERDE],
            [10, tokens.agua],
          ].map(([r, cor]) => (
            <Path
              key={String(r)}
              d={`M${50 - Number(r)} 78 A ${r} ${r} 0 0 1 ${50 + Number(r)} 78`}
              stroke={String(cor)}
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </G>
      );

    default:
      return null;
  }
}
