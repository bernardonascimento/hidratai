import { ChevronDown, ChevronUp, Clock, GlassWater, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { tokens } from '@/design/tokens';
import type { Entry } from '@/domain/types';
import { formatVolume } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';

type Props = {
  entries: Entry[];
  /** Recebe o registro inteiro, não o id: quem chama precisa dele para confirmar. */
  onRemove: (entry: Entry) => void;
  emptyLabel?: string;
  /** Quantos aparecem antes do "mostrar todos". */
  limit?: number;
};

export function horaDe(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Registros de um dia em lista vertical, cada um com o seu apagar.
 *
 * Vertical e não as pills horizontais da `DayTimeline`: ali o alvo de toque tem a
 * largura do texto, e apagar exige um alvo confortável e uma linha que não deixe
 * dúvida sobre **qual** registro vai embora.
 *
 * Vem do mais recente para o mais antigo de propósito: o registro que se quer
 * corrigir é quase sempre o que acabou de entrar, e assim ele é o primeiro da
 * lista — o que dispensa um botão separado de "desfazer o último".
 *
 * A lixeira é cinza, não vermelha: uma lista de doze linhas com doze ícones
 * vermelhos grita perigo onde não há. O vermelho aparece na confirmação.
 *
 * Mostra só os primeiros porque um dia de quinze registros virava um card de tela
 * inteira, que empurrava todo o resto da página para fora de vista.
 */
export function EntryList({ entries, onRemove, emptyLabel = 'Nada por aqui', limit = 5 }: Props) {
  const [tudo, setTudo] = useState(false);

  if (entries.length === 0) {
    return (
      // Mais respiro acima que abaixo: com a lista vazia o cabeçalho de resumo não é
      // renderizado, então esta frase encosta direto no que vem antes — o seletor
      // Hoje/Ontem. Embaixo o `p-4` do `Card` já dá o espaço.
      <Text maxFontSizeMultiplier={1.3} className="pb-1 pt-5 font-body text-base text-texto-soft">
        {emptyLabel}
      </Text>
    );
  }

  const recentesPrimeiro = [...entries].sort((a, b) => b.at - a.at);
  const escondidos = Math.max(0, recentesPrimeiro.length - limit);
  const visiveis = tudo ? recentesPrimeiro : recentesPrimeiro.slice(0, limit);

  return (
    <View>
      {visiveis.map((entry, i) => (
        <View
          key={entry.id}
          // O divisor usa `linha` e não `linha-sutil`: com as fontes maiores as linhas
          // ficaram altas o bastante para se fundirem numa massa sob um traço fraco.
          className={`flex-row items-center gap-3 py-2.5 ${
            i > 0 ? 'border-t border-linha' : ''
          }`}>
          <View
            className="h-10 w-10 items-center justify-center rounded-pill"
            style={{ backgroundColor: tokens.aguaTint }}>
            <GlassWater size={20} color={tokens.agua} strokeWidth={2.5} />
          </View>

          <Text maxFontSizeMultiplier={1.3} className="flex-1 font-displayBold text-lg text-texto">
            {formatVolume(entry.volumeMl)}
          </Text>

          {/* Relógio + hora, centralizados numa caixa de largura fixa: as horas têm
              larguras diferentes ("09:05" contra "15:29"), e sem a caixa a lixeira
              dançava de linha para linha.

              `texto-soft` e não `texto-off`: o horário em #AFAFAF dava 2,19:1 sobre o
              branco do card e reprovava AA. Em #777777 sobe para 4,48 e passa — e é
              informação, não decoração. */}
          <View className="w-[92px] flex-row items-center justify-center gap-1.5">
            <Clock size={15} color={tokens.textoOff} strokeWidth={2.4} />
            <Text maxFontSizeMultiplier={1.3} className="font-body text-base text-texto-soft">
              {horaDe(entry.at)}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Apagar ${formatVolume(entry.volumeMl)} de ${horaDe(entry.at)}`}
            hitSlop={8}
            onPress={() => {
              tapFeedback();
              onRemove(entry);
            }}
            className="h-11 w-11 items-center justify-center">
            <Trash2 size={20} color={tokens.textoOff} strokeWidth={2.3} />
          </Pressable>
        </View>
      ))}

      {escondidos > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tudo ? 'Mostrar menos' : `Mostrar todos os ${entries.length}`}
          onPress={() => {
            tapFeedback();
            setTudo((v) => !v);
          }}
          className="min-h-[48px] flex-row items-center justify-center gap-1.5 border-t border-linha">
          <Text maxFontSizeMultiplier={1.3} className="font-displayBold text-base text-agua">
            {tudo ? 'Mostrar menos' : `Mostrar todos os ${entries.length}`}
          </Text>
          {tudo ? (
            <ChevronUp size={18} color={tokens.agua} strokeWidth={2.6} />
          ) : (
            <ChevronDown size={18} color={tokens.agua} strokeWidth={2.6} />
          )}
        </Pressable>
      )}
    </View>
  );
}
