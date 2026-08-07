# Hidrataí — Notas para o revisor (App Store)

Cole o bloco abaixo no App Store Connect em **App Review Information → Notes**.
A Apple aceita responder em português.

Campos relacionados (App Review Information):

- **Sign-In required?** → **Não**. O app não tem conta, login nem modo bloqueado.
- **User Name / Password** → deixar **vazios**. Não há o que preencher.
- **Contact:** seu nome + bernardonasciimento@gmail.com + telefone.
- **Notes:** cole o bloco abaixo.

## Por que estas notas são curtas

O earmix precisava de notas longas porque **não dava para testar sem uma mesa de som** —
havia um modo demo a explicar e credenciais a passar. O Hidrataí não tem esse problema: o
app funciona inteiro no simulador, sem hardware, sem conta e sem rede. O que o revisor
precisa saber é só o que **não é óbvio no primeiro minuto**, que são três coisas: o
onboarding pede peso, a meta é estimativa e não prescrição, e o app é só em português.

---

## Texto para colar (PT)

```
O Hidrataí é um app de hábito para beber água. Ele calcula uma meta diária a partir do
perfil, registra os copos com um toque e usa notificações locais para lembrar ao longo
do dia.

COMO TESTAR
Não é preciso hardware, conta, login nem conexão — o app funciona inteiro offline, no
simulador ou em aparelho.

1. Na primeira execução, o app abre um onboarding de cinco passos: peso, horário de
   acordar e dormir, nível de atividade e clima, a meta calculada e o convite para
   ligar os lembretes. Qualquer resposta serve; todos os campos já vêm com um valor
   padrão e dá para só avançar.
2. Ao final ele mostra a meta calculada e oferece ligar os lembretes. Aceitar faz o iOS
   pedir permissão de notificação. Recusar não bloqueia nada do resto do app.
3. Na tela inicial, toque em "+ 500 ML" algumas vezes: a água sobe na garrafa e, ao
   fechar a meta, ela fica verde e aparece uma comemoração.
4. As outras abas (Histórico, Cantinho, Conquistas, Ajustes) já estão disponíveis desde
   o começo.

SOBRE O CÁLCULO DA META
A meta é uma estimativa de hábito, baseada em peso e rotina — não é recomendação médica,
e o app diz isso na tela em que a mostra e também em Ajustes. O app não diagnostica, não
trata e não monitora nenhuma condição de saúde. Não usa HealthKit.

NOTIFICAÇÕES
São todas locais (UNNotificationRequest), agendadas pelo próprio dispositivo. Não há
push, não há token de dispositivo e não há servidor. O app reagenda os lembretes quando
volta ao primeiro plano e a cada registro.

PRIVACIDADE
Sem conta, sem nuvem, sem analytics, sem anúncios e sem rastreamento. Peso, rotina,
histórico e progresso ficam apenas no aparelho, no armazenamento do app, e desinstalar
apaga. Existe "Apagar tudo" em Ajustes. Não há servidor para onde enviar dados.

OBSERVAÇÕES
- A interface está apenas em português (mercado principal: Brasil).
- O app é retrato apenas, em iPhone e em iPad.
- Não há compras no app nem assinatura. Tudo é gratuito e não há nada a desbloquear com
  dinheiro: o que abre os elementos do "Cantinho" é cumprir a meta do dia.
```

---

## Se vier rejeição, os dois motivos prováveis

Anotado antes de acontecer, porque nos dois casos a resposta é curta e a espera é longa:

**"Guideline 2.1 — precisamos entender o cálculo da meta"** ou algo sobre conteúdo médico.
Responder que a fórmula é `peso × 35 ml + ajuste de atividade + ajuste de clima`, limitada
entre 1,2 L e 4 L e arredondada a 100 ml, que é heurística de app de hábito, que o app diz
isso em duas telas, e que não há integração com HealthKit nem afirmação clínica em nenhum
lugar.

**"Guideline 4.2 — Minimum Functionality"**, o risco real de um app de tracker simples.
Responder listando o que existe além de contar copos: meta derivada do perfil, lembretes
adaptativos com janela de sono, sequência com congelamento e dia livre, progressão em seis
estágios, 24 conquistas, missões diárias, um cantinho de 27 elementos e histórico de
semana, mês e ano. Se possível, anexar um vídeo curto navegando pelas cinco abas — foi o
que resolveu no earmix, e vídeo encurta muito a conversa.
