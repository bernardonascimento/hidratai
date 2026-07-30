import { Pressable, Text, View } from 'react-native';

import { tokens } from '@/design/tokens';
import { tapFeedback } from '@/lib/haptics';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Seleção de vista (Semana/Mês/Ano). Usa o **chip de seleção**, não o lip de 4px:
 * o lip marca ação, e trocar de recorte é navegação — o mesmo critério do chip na
 * aba ativa do BottomNav descrito na skill.
 *
 * O selecionado se marca por **borda**, não por fundo. Antes era branco sobre a
 * trilha `linhaSutil`: 1,07 de contraste, ou seja, invisível — e trocar o branco por
 * azul-clarinho não ajudaria (1,06). Fundo claro sobre fundo claro não separa em
 * nenhuma combinação da paleta; a borda separa em todas.
 *
 * A borda existe nos dois estados, transparente quando inativo: aparecendo só no
 * selecionado, ela mudaria a largura do chip e a fila daria um salto na troca.
 */
export function SegmentedPills<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View className="flex-row gap-2 rounded-pill border-2 border-linha bg-linha-sutil p-1">
      {options.map((opcao) => {
        const ativo = opcao.value === value;
        return (
          <Pressable
            key={opcao.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativo }}
            accessibilityLabel={opcao.label}
            onPress={() => {
              tapFeedback();
              onChange(opcao.value);
            }}
            className="min-h-[44px] flex-1 items-center justify-center rounded-pill px-3"
            style={{
              borderWidth: 2,
              borderColor: ativo ? tokens.agua : 'transparent',
              backgroundColor: ativo ? tokens.aguaTint : 'transparent',
            }}>
            {/* Negrito no selecionado: peso de fonte é um sinal que não depende de
                distinguir tons, então sobrevive onde a cor sozinha falharia. */}
            <Text
              maxFontSizeMultiplier={1.3}
              className={`text-base ${
                ativo ? 'font-displayBold text-agua' : 'font-display text-texto-soft'
              }`}>
              {opcao.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
