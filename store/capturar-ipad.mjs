/**
 * Captura as abas do iPad conforme a pessoa navega.
 *
 * Uso: `node store/capturar-ipad.mjs <udid>`, com o app já aberto e o estado semeado
 * (ver `semear-estado.mjs`). Clique nas abas que faltam; o resto é automático.
 *
 * A primeira tentativa foi uma janela fixa de 2 minutos, e ela expirou antes do clique —
 * 90 quadros da mesma aba. Aqui não há janela: o laço fica olhando a barra de abas e, na
 * primeira vez que vê uma aba que falta, grava e segue esperando as outras. Termina sozinho
 * quando tem todas.
 *
 * A aba ativa é lida pela **cor na barra**: `tokens.agua` (#1CB0F6) na ativa, `textoOff`
 * (#AFAFAF) nas inativas. Ler o título não serviria — muda de fonte e posição por tela.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** UDID do simulador. `xcrun simctl list devices booted` mostra o seu. */
const UDID = process.argv[2] ?? process.env.IPAD_UDID;
if (!UDID) {
  console.error('uso: node store/capturar-ipad.mjs <udid-do-simulador>');
  console.error('   o udid sai de: xcrun simctl list devices booted');
  process.exit(1);
}

// `sharp` **não** é dependência do app — é ferramenta de captura, e entrar no
// `package.json` por isso engordaria o projeto para sempre. Import dinâmico, depois da
// checagem do UDID, para o erro de uso vir antes do erro de dependência.
let sharp;
try {
  // eslint-disable-next-line import/no-unresolved -- de propósito: ver o comentário acima.
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error('falta o sharp. rode: npm i --no-save sharp');
  process.exit(1);
}

const TMP = join(tmpdir(), 'hidratai-frame.png');
const DESTINO = join(dirname(fileURLToPath(import.meta.url)), 'appstore/ipad');

const ABAS = ['historico', 'cantinho', 'hoje', 'conquistas', 'ajustes'];

/** O que ainda falta, e com que nome sai. */
const QUERO = {
  cantinho: '03-cantinho.png',
  conquistas: '04-conquistas.png',
};

mkdirSync(DESTINO, { recursive: true });

async function ler() {
  execFileSync('xcrun', ['simctl', 'io', UDID, 'screenshot', TMP], { stdio: 'ignore' });
  const { data, info } = await sharp(TMP).raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => { const i = (y * info.width + x) * info.channels; return [data[i], data[i+1], data[i+2]]; };
  const agua = (c) => Math.abs(c[0] - 28) < 45 && Math.abs(c[1] - 176) < 45 && Math.abs(c[2] - 246) < 45;

  const larg = info.width / ABAS.length;
  const c = ABAS.map(() => 0);
  for (let y = Math.round(info.height * 0.94); y < info.height - 6; y += 2)
    for (let x = 0; x < info.width; x += 2)
      if (agua(px(x, y))) c[Math.min(ABAS.length - 1, Math.floor(x / larg))]++;

  // A aba do meio ("hoje") tem a gota grande sempre azul, então ela vence por volume
  // mesmo inativa. Só conta como ativa se dominar por muito.
  const maior = Math.max(...c.filter((_, i) => i !== 2));
  const idx = c[2] > maior * 3 ? 2 : c.indexOf(maior);

  // Alerta do sistema escurece a tela inteira: capturar assim estraga a imagem.
  const centro = px(Math.round(info.width / 2), Math.round(info.height * 0.42));
  const escurecido = centro[0] < 200 && centro[1] < 200 && centro[2] < 235
    && !(Math.abs(centro[0] - 28) < 20 && Math.abs(centro[2] - 246) < 20);

  return { aba: ABAS[idx], escurecido, tamanho: `${info.width}x${info.height}` };
}

const LIMITE_MIN = 12;
const fim = Date.now() + LIMITE_MIN * 60_000;
let anterior = null;
let estavel = 0;

console.log('esperando os cliques. faltam:', Object.keys(QUERO).join(', '));

while (Object.keys(QUERO).length > 0 && Date.now() < fim) {
  let atual;
  try { atual = await ler(); } catch { await new Promise((r) => setTimeout(r, 1500)); continue; }

  if (atual.aba === anterior) estavel++;
  else { estavel = 0; anterior = atual.aba; }

  // 2 leituras iguais: evita pegar o meio da transição entre abas.
  if (estavel >= 2 && QUERO[atual.aba]) {
    if (atual.escurecido) {
      console.log(`aba ${atual.aba} visível mas a tela está escurecida — feche o alerta`);
    } else {
      copyFileSync(TMP, `${DESTINO}/${QUERO[atual.aba]}`);
      console.log(`gravado ${QUERO[atual.aba]} (${atual.tamanho})`);
      delete QUERO[atual.aba];
      if (Object.keys(QUERO).length) console.log('  ainda faltam:', Object.keys(QUERO).join(', '));
    }
  }

  await new Promise((r) => setTimeout(r, 1200));
}

const faltando = Object.keys(QUERO);
console.log(faltando.length ? `TEMPO ESGOTADO, faltaram: ${faltando.join(', ')}` : 'TODAS CAPTURADAS');
