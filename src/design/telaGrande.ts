import { useWindowDimensions } from 'react-native';

/**
 * Folga lateral em tela grande. **60**, subido de 40 em 07/08/2026 depois de ver em tela.
 *
 * O app não tem mais teto de largura: num tablet ele preenche a tela (decisão de
 * 07/08/2026, ver `src/app/_layout.tsx`). Sem folga, porém, o conteúdo encosta na borda
 * física do vidro, e num tablet de 1067dp isso é mais visível que no celular, onde os
 * `px-4` de cada tela já dão respiro proporcional à largura.
 */
export const GUTTER_TELA_GRANDE = 60;

/**
 * Onde começa "tela grande": **600dp**, o mesmo limiar que o Android usa para separar
 * celular de tablet (`sw600dp`) e o mesmo da mudança de comportamento do Android 16.
 * Adotar o número deles evita um terceiro conceito de "grande" no projeto.
 *
 * Nenhum celular chega aos 600dp — o maior é o Pro Max, com 440pt — então isto **não
 * altera nada no celular**. Um dobrável aberto passa, e é o comportamento certo: ali a
 * janela é de tablet.
 */
export const TELA_GRANDE_MIN = 600;

/**
 * A folga que vale para a largura atual: 40 em tela grande, 0 no celular.
 *
 * Reage a mudança de tamanho de janela porque vem de `useWindowDimensions` — importa em
 * dobrável e em tela dividida, onde a largura muda com o app aberto.
 *
 * **Vai no conteúdo, nunca no container raiz.** O `AppBackground` é `absoluteFill`, e no
 * React Native um filho absoluto se posiciona pela borda interna do pai — folga no raiz
 * empurraria as ondas para dentro e abriria uma faixa vazia na beirada. A barra de abas
 * também fica de fora: ela é uma barra, e barra vai de ponta a ponta.
 */
export function useGutterTelaGrande(): number {
  const { width } = useWindowDimensions();
  return width >= TELA_GRANDE_MIN ? GUTTER_TELA_GRANDE : 0;
}
