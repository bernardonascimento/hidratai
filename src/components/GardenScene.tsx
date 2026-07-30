import { Text, View } from 'react-native';

import { GardenArt } from '@/components/GardenArt';
import { Gotinha } from '@/components/Gotinha';
import { sceneElements } from '@/domain/garden';
import type { Mood } from '@/domain/mascot';

const ALTURA = 250;
/**
 * Tamanho de cada peça dentro do cenário. Subiu de 74 para 84 — em 74 as peças ficavam
 * miúdas ao lado da Gotinha (92) e o cenário lia como ela sozinha num vazio.
 *
 * A altura do cenário **não** mudou: o vão no topo não é espaço desperdiçado, é onde o
 * Sol (25 gotas) e o Peixinho (35) vão morar. Encurtar agora apertaria a cena depois.
 */
const PECA = 84;

type Props = {
  unlocked: string[];
  /** A Gotinha reage ao estado do dia. */
  /** Tipo importado, não redeclarado: a cópia local ficou para trás no §8.2. */
  mood?: Mood;
};

/**
 * O cenário do Cantinho: a Gotinha e o que já foi desbloqueado.
 *
 * Posições vêm do catálogo em `domain/garden.ts` (fração da caixa), então
 * acrescentar um elemento novo é só uma linha lá — nada de coordenada solta na UI.
 */
export function GardenScene({ unlocked, mood = 'animada' }: Props) {
  const pecas = sceneElements(unlocked);

  return (
    <View
      className="w-full overflow-hidden rounded-2xl border-2 border-linha bg-agua-tint"
      style={{ height: ALTURA }}>
      {/* chão */}
      {/* Chão um pouco mais alto (26% em vez de 22%): com as peças maiores, a faixa
          antiga era estreita demais para elas parecerem apoiadas nela. */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-meta-tint"
        style={{ height: ALTURA * 0.26 }}
      />

      {pecas.map((peca) => (
        <View
          key={peca.id}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: `${peca.x * 100}%`,
            top: `${peca.y * 100}%`,
            marginLeft: -(PECA * peca.scale) / 2,
            marginTop: -(PECA * peca.scale) / 2,
          }}>
          <GardenArt id={peca.id} size={PECA * peca.scale} />
        </View>
      ))}

      {/* A Gotinha mora no centro-baixo, sempre por cima do cenário */}
      <View className="absolute bottom-6 left-0 right-0 items-center">
        <Gotinha mood={mood} size={92} />
      </View>

      {pecas.length === 0 && (
        <View className="absolute inset-x-6 top-6">
          <Text
            maxFontSizeMultiplier={1.3}
            className="text-center font-body text-base text-texto-soft">
            Cada dia que você bate a meta rende uma gota. Use as gotas para a Gotinha
            ganhar companhia.
          </Text>
        </View>
      )}
    </View>
  );
}
