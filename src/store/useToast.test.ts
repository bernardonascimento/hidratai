/**
 * Testes da fila de avisos.
 *
 * O que importa aqui é **a prioridade**: a comemoração ganha do desfazer, sempre. É a
 * regra que o resto da feature assume, e ela mora em três linhas fáceis de inverter por
 * acidente numa refatoração.
 */

import type { VictoryEvent } from '@/domain/progressEvents';
import { useToast } from '@/store/useToast';

const VITORIA: VictoryEvent = {
  origem: 'nivel',
  titulo: 'Nível 3!',
  detalhe: 'Continue assim',
  icone: 'trending-up',
};

const OUTRA: VictoryEvent = {
  origem: 'conquista',
  titulo: 'Conquista: 3 dias',
  detalhe: 'Bater a meta 3 dias seguidos',
  icone: 'flame',
};

const DESFAZER = { entryId: 'e1', volumeMl: 300 };

beforeEach(() => useToast.getState().limpar());

describe('useToast', () => {
  it('mostra o desfazer quando não há vitória', () => {
    useToast.getState().pedirDesfazer(DESFAZER);
    expect(useToast.getState().fila).toEqual([{ kind: 'desfazer', ...DESFAZER }]);
  });

  it('a vitória descarta o desfazer pendente', () => {
    useToast.getState().pedirDesfazer(DESFAZER);
    useToast.getState().celebrar([VITORIA]);

    const fila = useToast.getState().fila;
    expect(fila).toHaveLength(1);
    expect(fila[0].kind).toBe('vitoria');
  });

  it('o desfazer não entra quando há vitória na fila', () => {
    useToast.getState().celebrar([VITORIA]);
    useToast.getState().pedirDesfazer(DESFAZER);

    expect(useToast.getState().fila.every((a) => a.kind === 'vitoria')).toBe(true);
  });

  it('empilha várias vitórias na ordem em que chegaram', () => {
    // Um único registro pode subir de nível E fechar conquista. Num slot único, uma
    // atropelaria a outra e só a última apareceria.
    useToast.getState().celebrar([VITORIA, OUTRA]);

    const fila = useToast.getState().fila;
    expect(fila).toHaveLength(2);
    expect(fila.map((a) => (a.kind === 'vitoria' ? a.evento.titulo : null))).toEqual([
      VITORIA.titulo,
      OUTRA.titulo,
    ]);
  });

  it('celebrar com lista vazia não mexe na fila', () => {
    useToast.getState().pedirDesfazer(DESFAZER);
    useToast.getState().celebrar([]);
    // Sem isto, todo registro sem vitória apagaria o desfazer que acabou de ser pedido.
    expect(useToast.getState().fila[0].kind).toBe('desfazer');
  });

  it('avancar consome um por vez', () => {
    useToast.getState().celebrar([VITORIA, OUTRA]);

    useToast.getState().avancar();
    expect(useToast.getState().fila).toHaveLength(1);

    useToast.getState().avancar();
    expect(useToast.getState().fila).toHaveLength(0);

    // Avançar com a fila vazia não pode explodir: o timer do toast pode disparar
    // depois de a fila já ter sido limpa por outro caminho.
    useToast.getState().avancar();
    expect(useToast.getState().fila).toHaveLength(0);
  });

  it('limpar zera tudo', () => {
    useToast.getState().celebrar([VITORIA, OUTRA]);
    useToast.getState().limpar();
    expect(useToast.getState().fila).toHaveLength(0);
  });
});
