import { Tabs } from 'expo-router/js-tabs';
import { CalendarDays, Settings, Sprout, Trophy } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { TabDrop } from '@/components/TabDrop';
import { tokens } from '@/design/tokens';

export const unstable_settings = { initialRouteName: 'index' };

/**
 * Quanto o botão central desce para casar com o centro visual do bloco
 * ícone+rótulo das outras abas. Medido na tela, não chutado.
 */
const CENTRO_OPTICO = 16;

/**
 * Cinco abas com **Hoje no centro, em botão destacado** — o desenho que a skill
 * previa em `references/ARCHITECTURE.md` (BottomNav com botão central). O plano
 * havia optado por 4 abas planas; o usuário decidiu pelo botão central, então
 * aqui a skill volta a valer.
 */
function AbaIcone({ Icone, focada }: { Icone: LucideIcon; focada: boolean }) {
  return (
    <View
      className={`h-9 w-14 items-center justify-center rounded-pill ${
        focada ? 'bg-agua-tint' : ''
      }`}>
      <Icone
        size={22}
        color={focada ? tokens.agua : tokens.textoOff}
        strokeWidth={focada ? 2.6 : 2.2}
      />
    </View>
  );
}

/**
 * Aba central: a gota que enche com o dia, em `TabDrop`.
 *
 * **Sem lip aqui de propósito.** Num círculo, a borda inferior grossa vira uma
 * meia-lua escura que lê como um segundo elemento atrás do botão. O lip é da
 * gramática dos pressáveis de ação; navegação usa o chip, como as outras abas.
 *
 * Sem estado de foco também: quem está na aba Hoje vê a tela inteira, e o botão já
 * carrega informação demais (progresso e meta) para acumular um terceiro sinal.
 */
function AbaCentral() {
  return (
    /**
     * A caixa externa tem a mesma altura de 36px do `AbaIcone`; o desenho transborda
     * dela e desce até casar com o centro óptico das vizinhas.
     *
     * O alinhamento não é com o ícone vizinho, e sim com o **bloco ícone+rótulo**:
     * as outras abas têm texto embaixo, então o centro visual do conjunto fica
     * ~8pt abaixo do centro do ícone. Alinhar só com o ícone deixa este botão
     * parecendo alto, mesmo com os centros coincidindo na medição.
     */
    <View style={{ height: 36, width: 62, alignItems: 'center', justifyContent: 'center' }}>
      {/* O recuo é o mesmo de quando o botão era um círculo de 62: a centralização
          da caixa já absorve a mudança de tamanho, então descontar metade da diferença
          **subia** o desenho 7pt e o topo do anel era cortado pela borda da barra. */}
      <View style={{ marginTop: CENTRO_OPTICO }}>
        <TabDrop />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Sem isto o navigator pinta a cena e esconde o AppBackground.
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: tokens.agua,
        tabBarInactiveTintColor: tokens.textoOff,
        tabBarStyle: {
          backgroundColor: tokens.canvas,
          borderTopWidth: 2,
          borderTopColor: tokens.linha,
          /**
           * 84, não 92. A altura é `paddingTop + conteúdo + área segura`, e a área
           * segura (34pt num iPhone de gesto) é intocável — medido em tela, o conteúdo
           * usa 45,7pt (caixa do ícone + rótulo). Então a única folga real estava no
           * `paddingTop`, que era 10 sem precisar.
           */
          height: 84,
          paddingTop: 4,
          /** Aproxima os cinco itens entre si, em vez de deixá-los grudados nas
           *  bordas da tela. */
          paddingHorizontal: 16,
        },
        tabBarLabelStyle: {
          fontFamily: 'Fredoka_600SemiBold',
          fontSize: 11,
        },
        // Sem isto, o item corta o círculo central que sobe acima da barra.
        tabBarIconStyle: { overflow: 'visible' },
      }}>
      <Tabs.Screen
        name="historico"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ focused }) => <AbaIcone Icone={CalendarDays} focada={focused} />,
        }}
      />
      <Tabs.Screen
        name="cantinho"
        options={{
          title: 'Cantinho',
          tabBarIcon: ({ focused }) => <AbaIcone Icone={Sprout} focada={focused} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoje',
          tabBarLabel: () => null,
          tabBarIcon: () => <AbaCentral />,
        }}
      />
      <Tabs.Screen
        name="conquistas"
        options={{
          title: 'Conquistas',
          tabBarIcon: ({ focused }) => <AbaIcone Icone={Trophy} focada={focused} />,
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ focused }) => <AbaIcone Icone={Settings} focada={focused} />,
        }}
      />
    </Tabs>
  );
}
