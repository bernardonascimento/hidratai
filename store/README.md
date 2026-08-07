# Material das lojas

Tudo o que a App Store e o Google Play pedem, pronto para colar e subir.

```
store/
├─ textos-lojas.md              # Nome, subtítulo, descrição e palavras-chave das duas lojas
├─ privacidade-questionarios.md # App Privacy (Apple) e Data Safety (Google), respondidos
├─ notas-revisor-apple.md       # App Review Information → Notes
├─ appstore/
│  ├─ iphone/                   # 1290×2796 (6.9")
│  └─ ipad/                     # 2064×2752 (13") — obrigatório com supportsTablet: true
└─ play/
   ├─ icon-512.png              # 512×512, sem alfa — obrigatório
   ├─ feature-graphic.png       # 1024×500 — obrigatório
   ├─ feature-graphic.html      # a fonte do PNG acima; edite aqui e re-renderize
   ├─ phone/                    # 1080×2340
   └─ tablet/                   # 1600×2560
```

## O que cada loja exige

| Item                    | Apple                            | Google Play                     |
| ----------------------- | -------------------------------- | ------------------------------- |
| Ícone                   | 1024×1024 no binário             | 512×512 no console, **sem alfa** |
| Capturas de celular     | 6.9" (1290×2796), 3 a 10         | 2 a 8, lado ≥ 320px             |
| Capturas de tablet      | 13" (2064×2752), obrigatória     | opcionais, recomendadas          |
| Feature graphic         | não existe                       | 1024×500, **obrigatório**        |
| Vídeo                   | opcional                         | opcional (YouTube)              |

**O iPad é suportado desde 07/08/2026** (`ios.supportsTablet: true`), então a Apple
**exige** captura de 13" (2064×2752) junto com a de iPhone. Antes disso o app era
iPhone-only e rodava no iPad em modo de compatibilidade — uma janela de iPhone ampliada, sem
a folga lateral nem a garrafa grande.

## Como as capturas foram feitas

O estado não é inventado na mão nem de conta nova: um script monta um histórico coerente e
**escreve direto no AsyncStorage do aparelho**, sem tocar no código do app. Isso importa —
patch de captura que escapa para o commit é problema clássico, e aqui não existe patch.

O script é o `store/semear-estado.mjs`. Ficou no repo porque não é ferramenta de uma vez: a
cada nova versão do app as capturas envelhecem e ele é rodado de novo. O que ele garante, e
por que:

- **A ofensiva é contada do histórico**, não escrita à mão. Ofensiva que não bate com o
  calendário aparece na tela.
- **O XP usa a mesma conta do app** (10 por registro + 50 na meta, teto de 100/dia).
- **As gotas do Cantinho cobrem o que os elementos custaram.** A primeira tentativa abria
  10 elementos por 69 gotas com só 56 dias cumpridos — impossível, e um guarda no script
  parou antes de gerar a tela mentirosa.
- **Furos plantados no calendário.** Um mês 100% verde não existe e cheira a montagem; há
  seis dias não cumpridos espalhados.
- **Hoje fica em andamento** (2,2 de 3,0 L). Garrafa cheia não mostra que ela enche; vazia
  não mostra nada.

Passos, com o emulador aberto:

```bash
node store/semear-estado.mjs 2026-08-07 > estado.json   # monta o estado
adb shell am force-stop com.bernardo.hidratai           # senão o app reescreve ao suspender
adb root                                                 # imagem google_apis permite
# converte para INSERT e aplica em catalystLocalStorage do RKStorage
adb shell "sqlite3 /data/data/com.bernardo.hidratai/databases/RKStorage < /data/local/tmp/seed.sql"
adb shell date 080711002026.00                          # a data do aparelho tem de casar com o "hoje" semeado
```

Duas armadilhas que custaram tempo:

- **`screencap` captura o display, não a janela do app.** Ao testar a trava de orientação,
  a captura saiu 2560×1600 e pareceu que o app tinha girado — ele estava em retrato,
  encaixotado no meio. Quem responde a verdade é
  `adb shell dumpsys activity <pkg> | grep mAppBounds`.
- **`accelerometer_rotation` volta para 1** sozinho ao reiniciar o app. Sem desligar antes,
  `user_rotation` é ignorado e o teste de rotação não testa nada.

## Ao mudar a UI, estas capturas envelhecem

Não há geração automática. Se mexer em tela que aparece aqui, recapture — captura antiga na
loja é motivo de rejeição na Apple (*"Guideline 2.3 — Accurate Metadata"*) e de avaliação
ruim no Play. As telas capturadas são Hoje, Histórico, Cantinho e Conquistas.

## Uma coisa que parece defeito e não é

No `feature-graphic.png`, a Gotinha branca sobre o azul mede **2,30:1** de contraste, abaixo
do 3:1 que a WCAG pede para elemento não textual. É intencional e igual ao **ícone do app**,
que é uma gota branca sobre `#0EA5E9` (~2,6:1) — escolhido depois de medir, porque a Gotinha
azul sobre fundo azul **desaparecia**, e foi o que aconteceu na primeira versão deste
gráfico. O limiar de 3:1 existe para texto pequeno; para uma silhueta grande e sólida, lê
sem esforço. Não "corrija" trocando a cor dela.
