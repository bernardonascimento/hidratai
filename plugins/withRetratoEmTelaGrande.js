const { withAndroidManifest, withInfoPlist } = require('expo/config-plugins');

/**
 * Mantém o app **em retrato nos tablets Android**.
 *
 * ## Por que um plugin, e não uma linha no `app.json`
 *
 * `"orientation": "portrait"` já escreve `android:screenOrientation="portrait"` na
 * activity, e isso resolvia até o Android 15. **A partir do Android 16 (API 36), o
 * sistema ignora `screenOrientation`, `resizeableActivity`, `setRequestedOrientation()`
 * e as restrições de proporção em telas com largura mínima ≥ 600dp** — ou seja, em
 * tablet. O app declara retrato, o sistema lê, e gira de qualquer jeito.
 *
 * Este projeto compila com `targetSdkVersion 36`, então está exatamente nesse caso: no
 * celular o retrato valia, no tablet não.
 *
 * O opt-out documentado é uma `<property>` no manifesto, e o `app.json` não tem campo
 * para `<property>` — daí o plugin.
 *
 * ## O prazo, que é a parte importante
 *
 * **O opt-out morre no `targetSdk 37`**, e aí não há substituto: a partir dele o Android
 * ignora a restrição de orientação em tela grande sem opção de recusa. Como o Google
 * Play obriga a subir o `targetSdk` cerca de um ano depois de cada release, isto é um
 * prazo, não uma solução permanente: em algum momento o layout vai precisar funcionar em
 * paisagem no tablet, e aí este arquivo sai.
 *
 * Referência: developer.android.com/about/versions/16/behavior-changes-16
 * ("Orientation, resizability, and aspect ratio restrictions ignored").
 */
const PROPRIEDADE = 'android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY';

/** As duas chaves de orientação do Info.plist: a geral e a específica de iPad. */
const CHAVES_IOS = [
  'UISupportedInterfaceOrientations',
  'UISupportedInterfaceOrientations~ipad',
];

const SO_RETRATO = ['UIInterfaceOrientationPortrait'];

/**
 * Retrato no iPhone e no iPad.
 *
 * Precisa ser plugin porque `ios.infoPlist` no `app.json` **não basta**: com
 * `supportsTablet: true`, o próprio Expo escreve
 * `UISupportedInterfaceOrientations~ipad` com as quatro orientações e passa por cima do
 * que está declarado ali. Verificado no `Info.plist` gerado em 07/08/2026 — a chave
 * voltou com paisagem depois de ligar o iPad, silenciosamente.
 *
 * Rodando como mod, isto se aplica **depois** dele, então é a última palavra.
 *
 * Também deixa `PortraitUpsideDown` de fora, que o `orientation: "portrait"` do Expo
 * inclui: de cabeça para baixo não é "em pé".
 */
function comRetratoNoIos(config) {
  return withInfoPlist(config, (cfg) => {
    for (const chave of CHAVES_IOS) cfg.modResults[chave] = [...SO_RETRATO];
    return cfg;
  });
}

function comRetratoNoAndroid(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];

    // Sem `<application>` não há onde declarar, e inventar um seria pior que não fazer
    // nada: o prebuild seguiria e o manifesto sairia quebrado.
    if (!application) return cfg;

    application.property = application.property ?? [];

    // Idempotente: `prebuild` roda muitas vezes, e sem esta busca a propriedade
    // apareceria repetida, o que o merge do manifesto rejeita.
    const existente = application.property.find(
      (p) => p.$?.['android:name'] === PROPRIEDADE,
    );

    if (existente) {
      existente.$['android:value'] = 'true';
      return cfg;
    }

    application.property.push({
      $: { 'android:name': PROPRIEDADE, 'android:value': 'true' },
    });

    return cfg;
  });
}

module.exports = function withRetratoEmTelaGrande(config) {
  return comRetratoNoIos(comRetratoNoAndroid(config));
};
