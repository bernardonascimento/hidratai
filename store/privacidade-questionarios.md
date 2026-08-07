# Hidrataí — questionários de privacidade das lojas

Respostas prontas para os formulários de privacidade da Apple e do Google.

Base: o Hidrataí **não coleta nem compartilha nenhum dado do usuário**. Peso, rotina de
sono, meta, histórico de copos, ofensiva, XP e o Cantinho ficam **apenas no aparelho**
(e sexo nem é perguntado: o campo saiu do app em 07/08/2026), no
armazenamento do próprio app, e não são enviados para lugar nenhum. Não há conta, não há
servidor, não há analytics e não há anúncio. Coerente com https://hidratai.app.br/privacidade

---

## Apple — App Privacy (App Store Connect)

Caminho: App Store Connect › seu app › **App Privacy**.

1. **"Do you or your third-party partners collect data from this app?"**
   → **No, we do not collect data from this app.**

Isso já encerra o questionário: a ficha mostrará **"Data Not Collected"**.

Justificativa (caso precise confirmar internamente): o app não tem login, analytics,
anúncios nem SDK de rastreamento, e não faz requisição de rede para servidor próprio ou de
terceiro. Tudo o que salva é local.

> **O peso e a rotina de sono não mudam essa resposta.** A Apple define "collect" como
> transmitir os dados para fora do dispositivo (*"data is collected when it is transmitted
> off the device"*). Dado que nasce e morre no aparelho não é coleta — se fosse, todo app
> com preferência local declararia. O que valeria declarar seria enviar isso a um servidor,
> e o app não tem servidor.

> **Notificações não são coleta.** Os lembretes são agendados **localmente** pelo próprio
> iOS (`UNNotificationRequest`), sem push, sem token de dispositivo e sem servidor no meio.
> Se um dia entrar push remoto, isto muda e o questionário precisa ser refeito.

---

## Google — Data Safety (Play Console)

Caminho: Play Console › seu app › **Segurança dos dados (Data safety)**.

**Coleta e compartilhamento**

- "Your app collects or shares any of the required user data types?" → **No**
- Compartilha dados com terceiros? → **No**

**Perguntas de segurança (aparecem mesmo sem coleta)**

- "Is your app's data encrypted in transit?" → **Não se aplica** — o app não transmite
  dados do usuário. Não há tráfego para declarar.
- "Do you provide a way for users to request that their data be deleted?" → como não há
  coleta, não há dado em servidor para apagar. Ainda assim o app tem **"Apagar tudo"** em
  Ajustes, que zera histórico, gamificação, Cantinho e preferências, e **desinstalar
  também apaga**.

**Resumo que a ficha vai exibir:** "No data collected" / "No data shared".

**Tipos de dados** — deixe **tudo desmarcado**. Para referência, o app **não** coleta
nenhuma destas categorias: localização, informações pessoais, financeiras, saúde e
fitness, mensagens, fotos/vídeos, áudio, arquivos, contatos, atividade no app, histórico
de navegação, identificadores do dispositivo, ou informações de diagnóstico/crash.

> **Atenção à categoria "Health and fitness".** O app é de saúde e fitness e guarda peso e
> consumo de água, então a tentação é marcar — mas a pergunta é sobre **coletar**, e a
> própria ajuda do Play define coleta como *"transmitir dados do dispositivo"*. Nada sai do
> aparelho, então fica desmarcado. Marcar por engano criaria na ficha uma declaração de
> coleta de dado de saúde que não existe.

**Permissões que o app declara.** O manifesto de release traz **29**, e vale saber o porquê
antes de alguém perguntar — nenhuma delas implica coleta, mas a lista assusta à primeira
vista. Foram lidas do manifesto **merged** do release, que é o que vai no pacote:

| Permissão                                            | De onde vem / para quê                                    |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `POST_NOTIFICATIONS`                                 | Mostrar os lembretes (Android 13+ exige pedir)            |
| `RECEIVE_BOOT_COMPLETED`                             | Reagendar os lembretes depois de reiniciar o aparelho     |
| `VIBRATE`                                            | O retorno tátil ao registrar um copo                      |
| `INTERNET`, `ACCESS_NETWORK_STATE`                   | React Native; em produção o app não faz requisição alguma |
| `WAKE_LOCK`, `com.google.android.c2dm...RECEIVE`     | `firebase-messaging`, dependência do `expo-notifications` |
| `READ_APP_BADGE` + 20 de launcher (Samsung, Huawei, HTC, Oppo, Sony…) | `me.leolin:ShortcutBadger`, também via `expo-notifications` — é o número no ícone |
| `...DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`        | Assinatura interna do próprio app; não é acesso a nada    |
| `...BIND_GET_INSTALL_REFERRER_SERVICE`               | Play Install Referrer, do pacote do Google Play           |

Três coisas que essa lista **não** significa:

- **Não há push.** `firebase-messaging` entra como dependência do `expo-notifications`, mas
  **não existe `google-services.json` no projeto** — o FCM não está configurado e não há
  para onde uma mensagem remota chegar. Os lembretes são todos agendados localmente. Se um
  dia entrar push, este documento e o App Privacy precisam ser refeitos.
- **As 21 permissões de badge não leem nada seu.** São a forma de pedir a cada fabricante
  que desenhe o contador no ícone do launcher. Vêm do ShortcutBadger, não de código nosso.
- **Nenhuma é permissão perigosa** (*dangerous* no vocabulário do Android): nenhuma abre
  diálogo de consentimento além do de notificação, e nenhuma dá acesso a contatos,
  localização, câmera, microfone ou armazenamento.

`SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` e `WRITE_EXTERNAL_STORAGE` também chegavam
por dependências e foram **removidas** via `blockedPermissions` no `app.json`. Para
reconferir a lista depois de mexer em dependência:

```bash
cd android && ./gradlew :app:processReleaseMainManifest
grep -oE 'uses-permission android:name="[^"]*"' \
  app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml \
  | sed 's/.*name="//;s/"//' | sort
```

O manifesto de origem (`android/app/src/main/AndroidManifest.xml`) **não serve** para essa
conferência: as permissões de dependência só aparecem depois do merge.

---

## Anúncios e público infantil

- **Contém anúncios:** Não (nas duas lojas).
- **Público-alvo (Play):** adultos e adolescentes; o app **não** é direcionado a crianças,
  então não entra no Families Policy nem precisa do Teacher Approved.
- **Apple, "Made for Kids":** deixar **desmarcado**. Marcar submete o app às regras da
  seção Kids, que proíbem análise de terceiros e exigem controle parental — e não é o
  público.

---

## Checklist rápido

| Item                                | Resposta                                     |
| ----------------------------------- | -------------------------------------------- |
| Coleta dados pessoais?              | Não                                          |
| Compartilha com terceiros?          | Não                                          |
| Usa analytics / rastreamento / ads? | Não                                          |
| Login / conta?                      | Não                                          |
| Dados saem do aparelho?             | Não (nem existe servidor)                    |
| Notificações                        | Locais, sem push e sem token                 |
| Como o usuário apaga os dados       | "Apagar tudo" em Ajustes, ou desinstalar     |
| Apple App Privacy                   | Data Not Collected                           |
| Google Data Safety                  | No data collected / shared                   |
