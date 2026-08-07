// Espelho em JS dos tokens do tailwind.config.js.
// Usado onde className não chega: SVG (react-native-svg) e estilos animados
// (Reanimated), que precisam de valores literais.
export const tokens = {
  agua: '#1CB0F6',
  aguaLip: '#1899D6',
  aguaTint: '#DDF4FF',
  /** Tons de véu do mesmo azul, para o fundo em camadas. Não são acentos novos:
   *  são o azul-água diluído, então a regra de um acento por tela continua. */
  aguaVeu: '#C9EBFD',
  aguaVeuSuave: '#E4F5FE',
  meta: '#22C55E',
  metaLip: '#12A150',
  metaTint: '#DCFCE7',
  ofensiva: '#FF9600',
  xp: '#FFC800',
  atencao: '#FF4B4B',
  texto: '#4B4B4B',
  textoSoft: '#777777',
  textoOff: '#AFAFAF',
  linha: '#E5E5E5',
  linhaSutil: '#F7F7F7',
  /** Superfície neutra de aviso temporário (o toast de desfazer). Clara o
   *  bastante para texto escuro; por ser quase o tom da página, quem usar
   *  **precisa** de borda para a silhueta não se perder. */
  neutro: '#D4D4D4',
  /** Superfície das telas: azul-água diluído ao extremo — mais claro que a mais
   *  clara das ondas (`aguaVeuSuave`), para o fundo nunca competir com elas. Os
   *  cards ficam em `canvas` por cima, e é esse degrau que dá profundidade. */
  fundo: '#F2FAFE',
  canvas: '#FFFFFF',
} as const;

/** Altura do "lip" 3D: sombra sólida sem blur, a marca registrada do sistema. */
export const LIP = 4;

/**
 * Lip no estado pressionado. Não é zero de propósito: zerando, a borda inferior
 * pisca e desaparece; mantendo os 4px, o bloco todo desliza e o botão parece
 * chapado. Encurtar de 4 para 2 dá o afundamento **e** deixa a borda à vista.
 *
 * A face desce `LIP - LIP_PRESSED`, e a altura total fecha sozinha
 * (`paddingTop + face + lip` é constante).
 */
export const LIP_PRESSED = 2;

export const RADIUS = { card: 16, pill: 9999 } as const;
