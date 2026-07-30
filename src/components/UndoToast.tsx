import { Check, Undo2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { LIP, LIP_PRESSED, tokens } from '@/design/tokens';
import { formatVolume } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';
import { useReducedMotionPref } from '@/lib/motion';

/** Tempo na tela. Curto o bastante para não virar mobília, longo para dar conta. */
const DURACAO = 3000;
/**
 * Folga entre a área segura do topo e o toast.
 *
 * Ele nasceu embaixo, sobre a tabBar, para não cobrir a ação primária. No topo esse
 * cuidado deixa de existir — o botão de registrar fica livre por construção — e a
 * confirmação aparece perto de onde os olhos já estão depois do toque.
 *
 * O preço é cobrir o HUD (nível, ofensiva, XP) por 3 segundos. Vale: são justamente os
 * números que o registro acabou de mudar, e eles reaparecem já atualizados.
 */
const FOLGA_DO_TOPO = 8;

export type UndoAviso = { entryId: string; volumeMl: number };

type Props = {
  /** `null` esconde. Trocar de aviso reinicia a contagem. */
  aviso: UndoAviso | null;
  onUndo: (entryId: string) => void;
  /** Chamado quando o tempo acaba — quem manda o `aviso` deve zerá-lo. */
  onExpire: () => void;
};

/**
 * Faixa que aparece após registrar, com um "Desfazer" que expira sozinho.
 *
 * Existe porque a correção precisa acontecer **onde o erro acontece**: tocar 500 ml
 * sem querer e ter de ir ao Histórico para arrumar é caro demais para um deslize de
 * um toque. Um botão fixo na tela resolveria, mas custava espaço permanente numa
 * tela que já está no limite — daí ser temporário.
 *
 * Aqui o apagar **não** pede confirmação, ao contrário da lista do Histórico: o
 * registro nasceu há segundos, quem toca sabe o que está desfazendo, e a intenção
 * de "corrigir agora" morre se houver um diálogo no caminho.
 */
export function UndoToast({ aviso, onUndo, onExpire }: Props) {
  const insets = useSafeAreaInsets();
  // Mantém o conteúdo durante a saída: sem isto o texto desaparece antes da animação.
  const [conteudo, setConteudo] = useState<UndoAviso | null>(null);
  const p = useSharedValue(0);
  const reduzido = useReducedMotionPref();

  // Ajuste **durante o render**, não em `useEffect`. O padrão do React para
  // "corrigir estado quando a prop muda": o React reinicia o render antes de
  // pintar, sem o quadro extra nem a cascata que o effect provoca.
  if (aviso && aviso !== conteudo) setConteudo(aviso);

  useEffect(() => {
    p.value = withTiming(aviso ? 1 : 0, {
      duration: reduzido ? 0 : aviso ? 220 : 160,
      easing: Easing.out(Easing.quad),
    });
  }, [aviso, reduzido, p]);

  // A contagem é por aviso: registrar de novo antes de expirar reinicia o prazo.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(onExpire, DURACAO);
    return () => clearTimeout(t);
  }, [aviso, onExpire]);

  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    // Entra **de cima**, na direção de onde ele veio. Vindo de baixo no topo da tela,
    // o movimento contraria a origem e lê como tremida em vez de entrada.
    transform: [{ translateY: (1 - p.value) * -20 }],
  }));

  if (!conteudo) return null;

  return (
    <Animated.View
      pointerEvents={aviso ? 'auto' : 'none'}
      style={[
        {
          position: 'absolute',
          left: 20,
          right: 20,
          top: insets.top + FOLGA_DO_TOPO,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderRadius: 999,
          paddingLeft: 14,
          paddingRight: 6,
          // 6 e não 8: o alvo de 44pt do "Desfazer" é o piso da altura, então a
          // sobra que dá para tirar está toda no padding — 2pt de cada lado.
          paddingVertical: 6,
          // Mesma dupla do `VolumeCard` selecionado: fundo `aguaTint` com borda
          // `agua`. Não é verde porque verde significa "meta batida" — e este toast
          // só aparece quando a meta **não** foi batida (batida, quem toma a tela é
          // a celebração).
          //
          // A borda é estrutural, não enfeite: `aguaTint` tem 1,14:1 contra a tabBar
          // branca por onde o toast passa, então sem ela a faixa perde a silhueta.
          // Sombra resolveria e o design system não permite.
          backgroundColor: tokens.aguaTint,
          borderWidth: 2,
          borderColor: tokens.agua,
        },
        style,
      ]}>
      <Check size={24} color={tokens.agua} strokeWidth={3} />

      {/* Texto escuro, não azul: o azul do app sobre `aguaTint` dá 2,15:1, enquanto
          o escuro dá 7,67:1. O azul fica no ícone e na borda, onde é decoração. */}
      <Text
        maxFontSizeMultiplier={1.3}
        className="flex-1 font-displayBold text-xl"
        style={{ color: tokens.texto }}>
        {`+ ${formatVolume(conteudo.volumeMl)}`}
      </Text>

      {/* Azul cheio sobre o fundo claro: o botão é a ação, então é ele que carrega o
          peso da faixa — e é o mesmo azul da ação primária do app, com o mesmo lip.
          Este é um botão de verdade, não um link de texto. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Desfazer ${formatVolume(conteudo.volumeMl)}`}
        onPress={() => {
          tapFeedback();
          onUndo(conteudo.entryId);
        }}
        style={({ pressed }) => ({ paddingTop: pressed ? LIP - LIP_PRESSED : 0 })}>
        {({ pressed }) => (
          <View
            className="min-h-[44px] flex-row items-center gap-1.5 rounded-pill px-4"
            style={{
              backgroundColor: tokens.agua,
              borderBottomWidth: pressed ? LIP_PRESSED : LIP,
              borderBottomColor: tokens.aguaLip,
            }}>
            <Undo2 size={17} color={tokens.canvas} strokeWidth={2.8} />
            <Text
              maxFontSizeMultiplier={1.3}
              className="font-displayBold text-sm"
              style={{ color: tokens.canvas }}>
              Desfazer
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
