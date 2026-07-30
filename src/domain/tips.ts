/**
 * Dicas do resultado do dia. Uma linha, tom de conselho prático — **nunca**
 * afirmação clínica nem promessa de saúde (§3.6 do PLANO-GAMIFICACAO).
 */
const DICAS = [
  'Deixe a garrafa à vista: a gente bebe mais sem pensar.',
  'Um copo ao acordar já adianta meio caminho.',
  'Copo pequeno várias vezes cansa menos que um grande.',
  'Vincule o copo a algo que você já faz: café, e-mail, banheiro.',
  'Levar a garrafa junto resolve metade do problema.',
  'Antes de sentir sede, um copo já é bem-vindo.',
  'Dia mais quente pede um copo a mais que o de costume.',
  'Comida também hidrata: fruta e sopa contam a favor.',
  'Se esquecer, tudo bem. Amanhã o copo continua ali.',
  'Beba devagar: a pressa não hidrata mais rápido.',
];

/** Determinística pela data: a dica do dia não muda a cada abertura. */
export function tipForDate(date: string): string {
  let h = 0;
  for (let i = 0; i < date.length; i += 1) {
    h = (h * 17 + date.charCodeAt(i)) % 100000;
  }
  return DICAS[h % DICAS.length];
}

export const TIPS_COUNT = DICAS.length;
