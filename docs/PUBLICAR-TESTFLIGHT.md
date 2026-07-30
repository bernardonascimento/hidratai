# Publicar o Hidrataí no TestFlight

Passo a passo para rodar **no outro computador**, do zero até o app aparecer no
TestFlight do seu iPhone. Nada aqui precisa do Mac desta máquina — o build roda na
nuvem do EAS.

O que já está pronto no repositório: `eas.json` com os perfis de build e o de submit,
`bundleIdentifier` e `ITSAppUsesNonExemptEncryption` no `app.json`, e o
`PrivacyInfo.xcprivacy` que o prebuild gera sozinho. O que **falta** e só você pode
fazer: escolher a conta EAS, criar o projeto, criar o app no App Store Connect e colar
de volta o `ascAppId`.

## Antes de começar

- **Conta Apple Developer paga** (99 USD/ano). Sem ela não existe TestFlight.
- **Node 24.** Há um `.nvmrc` no projeto.
- Não precisa de Xcode nem de Mac: o build é na nuvem.

## 1. Clonar e instalar

```bash
git clone https://github.com/bernardonascimento/hidratai.git
cd hidratai
nvm use            # Node 24 — obrigatório, o bundler falha no 20
npm install
```

Confira que a base está sã antes de gastar um build na nuvem:

```bash
npm test           # 180 testes
npx tsc --noEmit
```

## 2. Entrar no EAS e criar o projeto

```bash
npx eas-cli@latest login
npx eas-cli@latest whoami         # confira em qual conta você entrou
npx eas-cli@latest init
```

**Atenção na escolha da conta — existem duas.** O earmix vive na conta
`bernardonascimento`. A máquina onde este projeto foi desenvolvido está logada em
outra, que dá acesso a `bernardo.nascimento` e à organização `trillion` — e essa
conta não tem permissão nem de leitura no projeto do earmix. Por isso o `app.json`
**não** traz o campo `owner`: chutar aqui só criaria o projeto na conta errada.

O `eas init` vai perguntar qual conta deve ser a dona. **Escolha a mesma do earmix**
se você quer os dois apps no mesmo painel — provavelmente é o que você quer, e é a
conta em que o outro computador já deve estar logado.

O `init` cria o projeto no servidor e **escreve o `extra.eas.projectId` no
`app.json`**. Esse ID identifica o projeto para sempre, então commite:

```bash
git add app.json && git commit -m "EAS: projectId do projeto hidratai"
```

Se quiser fixar a conta para builds automatizados depois, aí sim acrescente o campo
com o nome exato que o `whoami` mostrou:

```json
"owner": "<a conta que você escolheu no init>"
```

## 3. Build de produção para iOS

```bash
npx eas-cli@latest build --platform ios --profile production
```

Na primeira vez ele vai pedir para entrar na conta Apple e então **criar sozinho**:
o identificador `com.bernardo.hidratai` no portal da Apple, o certificado de
distribuição e o provisioning profile. Aceite tudo — deixar o EAS gerenciar as
credenciais é o caminho normal e evita ter de mexer em keychain.

Sobre a versão: o `eas.json` usa `appVersionSource: "remote"` com
`autoIncrement: true`, então **o número de build é controlado pelo servidor** e sobe
a cada build. Você não edita `version` nem `buildNumber` à mão; para mudar a versão
visível (1.0.0 → 1.0.1), aí sim edite `version` no `app.json`.

O build leva ~15-25 min na fila gratuita. Ao final ele imprime a URL do `.ipa`.

## 4. Criar o app no App Store Connect

Duas opções — a segunda é menos trabalho.

**Opção A — deixar o EAS criar.** Pule direto para o passo 5. Como o `ascAppId` não
está no `eas.json`, o `eas submit` roda em modo interativo, percebe que o app não
existe e oferece criá-lo. Aceite e responda o nome (`Hidrataí`), o idioma principal
(Português (Brasil)) e o SKU (pode ser `hidratai`).

**Opção B — criar à mão** em [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
→ Apps → **+** → Novo app:

| Campo | Valor |
|---|---|
| Plataforma | iOS |
| Nome | Hidrataí |
| Idioma principal | Português (Brasil) |
| Pacote | `com.bernardo.hidratai` |
| SKU | `hidratai` |
| Acesso de usuário | Acesso total |

O nome **Hidrataí** tem de estar livre na App Store. Se estiver tomado, o campo
recusa e você escolhe outro ali mesmo — isso não muda nada no código, porque o nome
na App Store é independente do `name` do `app.json`.

## 5. Enviar para o TestFlight

```bash
npx eas-cli@latest submit --platform ios --profile production --latest
```

`--latest` pega o build mais recente que você acabou de fazer. Se preferir escolher,
troque por `--id <build-id>`.

Ao terminar, ele imprime o **App Store Connect App ID** — um número de 10 dígitos.
**Cole no `eas.json`** para os próximos envios não precisarem de perguntas:

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "0000000000",
      "appleTeamId": "8A3KK4PTA6"
    }
  }
}
```

```bash
git add eas.json && git commit -m "EAS: ascAppId do app no App Store Connect"
```

## 6. Instalar no iPhone

O processamento na Apple leva 5-15 min depois do upload. Então:

1. App Store Connect → Hidrataí → aba **TestFlight**.
2. O build aparece como "Processando" e depois pronto.
3. Em **Teste interno**, crie um grupo e adicione seu Apple ID. Teste interno **não
   passa por revisão da Apple** — libera na hora, até 100 pessoas do seu time.
4. Instale o app **TestFlight** no iPhone, entre com o mesmo Apple ID e o Hidrataí
   estará lá.

Não vai aparecer a pergunta de conformidade de exportação: o `app.json` já declara
`ITSAppUsesNonExemptEncryption: false`, o que resolve isso de antemão.

## Builds seguintes

Depois do primeiro ciclo, publicar uma versão nova é uma linha:

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

O `--auto-submit` usa o perfil de submit com o mesmo nome (`production`), e como o
`ascAppId` já está no `eas.json`, não pergunta nada.

Para dizer aos testadores o que mudou:

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit \
  --what-to-test "Ícone e splash novos; lembretes configuráveis nos Ajustes."
```

## Se der errado

**"Entitlements/provisioning inválido"** — apague as credenciais e deixe o EAS
recriar: `npx eas-cli@latest credentials` → iOS → production → remover, e builde de
novo.

**O build passa e o submit falha com "app not found"** — o app no App Store Connect
não existe ou o `ascAppId` está errado. Rode o submit sem o `ascAppId` no `eas.json`
para voltar ao modo interativo.

**"Invalid Apple Team ID"** — o `8A3KK4PTA6` no `eas.json` veio do outro projeto
(earmix), na premissa de ser a mesma conta Apple. Se não for, pegue o seu em
developer.apple.com → Membership e troque.

**O TestFlight reclama de ícone com transparência** — não deve acontecer: o
`icon.png` é gerado sem canal alfa de propósito (a App Store rejeita PNG com alfa).
Se um dia alguém regerar os assets, mantenha o `flatten()` no gerador.

## Android, quando quiser

O `eas.json` já tem o perfil, e o `.eas/workflows/release.yml` já descreve o
disparo por tag. Falta só a service account do Google Play no perfil de submit — mas
isso é outra empreitada, e o TestFlight não depende dela.
