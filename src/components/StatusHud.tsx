import { Droplet, Flame, Zap } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { tokens } from '@/design/tokens';
import { levelFromXp, levelProgress } from '@/domain/goal';
import { stageForLevel } from '@/domain/levels';

type Props = {
  xp: number;
  streak: number;
};

/**
 * HUD do topo, no formato de jogo: **nível à esquerda, recursos à direita**.
 *
 * Cada ícone vive num círculo da própria cor, que é o que dá o peso de "moeda de
 * jogo" sem precisar de sombra colorida nem gradiente — as duas coisas que o
 * design system proíbe.
 *
 * Ofensiva e XP dividem **uma única pill**, separados por um gap: são dois
 * recursos do mesmo tipo e leem melhor como um grupo do que como dois chips.
 */
export function StatusHud({ xp, streak }: Props) {
  const nivel = levelFromXp(xp);
  const estagio = stageForLevel(nivel);
  const progresso = levelProgress(xp);

  return (
    <View className="flex-row items-center justify-between">
      {/* Nível */}
      <View
        accessible
        accessibilityLabel={`Nível ${nivel}, ${estagio.name}`}
        className="flex-row items-center gap-2.5 rounded-pill border-2 border-linha bg-canvas py-1.5 pl-1.5 pr-4">
        {/* Gota, e não a plantinha que estava aqui: a escala de níveis é uma metáfora
            de **água acumulando** (Gota → Poça → Riacho → Rio → Cachoeira → Oceano),
            então uma planta contradizia o próprio nome do estágio — e por cima era o
            mesmo ícone da aba Cantinho, o que fazia o chip ler como atalho para lá.
            O círculo também deixou de ser verde: verde é "meta batida" e só. */}
        {/* 36px e ícone 21, **idênticos** aos círculos de ofensiva e XP. Estava em 40
            com ícone 22, e era só isso que fazia esta pílula ficar 3,3pt mais alta que
            a da direita: num par lado a lado, a altura é o que lê como "maior". */}
        <View
          className="h-9 w-9 items-center justify-center rounded-pill"
          style={{ backgroundColor: tokens.aguaTint }}>
          <Droplet size={21} color={tokens.agua} strokeWidth={2.7} />
        </View>
        {/* Estágio e nível na **mesma linha**, separados por um ponto médio, e a barra
            embaixo. Antes eram duas linhas de texto: o chip ficava mais alto que os da
            direita e o segundo texto não acrescentava nada que o primeiro já não dizia.
            A barra ocupa a linha de baixo com algo que **muda a cada registro**. */}
        <View className="gap-1 pr-1">
          <View className="flex-row items-baseline gap-1.5">
            <Text
              maxFontSizeMultiplier={1.2}
              className="font-displayBold text-base leading-5 text-texto">
              {estagio.name}
            </Text>
            {/* 14px e `texto-soft`: em 12px e #AFAFAF este era o menor e o mais apagado
                texto do app, e ele carrega o número do nível. */}
            <Text maxFontSizeMultiplier={1.2} className="font-body text-sm text-texto-soft">
              · nível {nivel}
            </Text>
          </View>

          <View className="h-1.5 w-full overflow-hidden rounded-pill bg-linha">
            <View
              className="h-full rounded-pill"
              style={{
                width: `${Math.max(4, Math.round(progresso * 100))}%`,
                backgroundColor: tokens.agua,
              }}
            />
          </View>
        </View>
      </View>

      {/* Ofensiva e XP numa pill só */}
      <View className="flex-row items-center gap-4 rounded-pill border-2 border-linha bg-canvas px-2 py-1.5">
        <Recurso
          valor={streak}
          cor={tokens.ofensiva}
          fundo="#FFF1DE"
          rotulo="Ofensiva"
          icone={<Flame size={21} color={tokens.ofensiva} strokeWidth={2.7} />}
        />
        <Recurso
          valor={xp}
          cor={tokens.xp}
          fundo="#FFF8D9"
          rotulo="XP"
          icone={<Zap size={21} color={tokens.xp} strokeWidth={2.7} />}
        />
      </View>
    </View>
  );
}

function Recurso({
  valor,
  cor,
  fundo,
  rotulo,
  icone,
}: {
  valor: number;
  cor: string;
  fundo: string;
  rotulo: string;
  icone: ReactNode;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${rotulo}: ${valor}`}
      className="flex-row items-center gap-1.5">
      <View
        className="h-9 w-9 items-center justify-center rounded-pill"
        style={{ backgroundColor: fundo }}>
        {icone}
      </View>
      <Text maxFontSizeMultiplier={1.2} className="font-displayBold text-lg" style={{ color: cor }}>
        {valor}
      </Text>
    </View>
  );
}
