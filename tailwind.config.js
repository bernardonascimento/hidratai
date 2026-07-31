/** @type {import('tailwindcss').Config} */
// Tokens espelham o DESIGN-SYSTEM.md da skill duolingo-health-app.
// Adaptação para hidratação: a cor-líder é o azul-água (#1CB0F6, token de
// seleção do sistema) e o verde vitalidade fica reservado para "meta batida".
// Cada face pressável tem um `lip` (tom escuro) e um `tint` (fundo claro).
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        agua: { DEFAULT: '#1CB0F6', lip: '#1899D6', tint: '#DDF4FF' },
        meta: { DEFAULT: '#22C55E', lip: '#12A150', tint: '#DCFCE7' },
        ofensiva: '#FF9600',
        xp: '#FFC800',
        atencao: '#FF4B4B',
        texto: { DEFAULT: '#4B4B4B', soft: '#777777', off: '#AFAFAF' },
        linha: { DEFAULT: '#E5E5E5', sutil: '#F7F7F7' },
        // Superfície neutra de aviso temporário — exige borda, ver tokens.ts.
        neutro: '#D4D4D4',
        // Superfície das telas: azul-água diluído, mais claro que qualquer onda.
        fundo: '#F2FAFE',
        canvas: '#FFFFFF',
        moldura: '#E8EAED',
      },
      fontFamily: {
        display: ['Fredoka_600SemiBold'],
        displayBold: ['Fredoka_700Bold'],
        body: ['Nunito_600SemiBold'],
        bodyBold: ['Nunito_800ExtraBold'],
      },
      /**
       * Escala tipográfica **própria**, um degrau acima da padrão do Tailwind.
       *
       * Motivo: no aparelho real (não no simulador) o texto do app estava pequeno —
       * as 114 classes `text-*` herdavam a escala do Tailwind, que é pensada para web
       * em desktop, onde o olho está a 60cm da tela. No celular, a 30cm e em
       * movimento, 14px de corpo é pouco.
       *
       * O aumento é maior embaixo e menor em cima (14→16 são +14%; 60→62 são +3%),
       * porque a reclamação é do texto pequeno — os números gigantes já se resolviam.
       * Isso comprime a hierarquia de propósito: a diferença entre corpo e título
       * diminui, e é uma troca aceitável para o texto de leitura crescer.
       *
       * Os pares são [fontSize, lineHeight]. O lineHeight tem de vir junto: sem ele o
       * NativeWind mantém a entrelinha da escala antiga e o texto grande fica
       * apertado verticalmente. Nos tamanhos de display (4xl acima) a entrelinha é
       * quase igual à fonte, porque ali é sempre uma linha só.
       */
      fontSize: {
        xs: ['13px', '18px'],
        sm: ['16px', '22px'],
        base: ['18px', '26px'],
        lg: ['20px', '28px'],
        xl: ['22px', '30px'],
        '2xl': ['26px', '34px'],
        '3xl': ['32px', '38px'],
        '4xl': ['38px', '44px'],
        '5xl': ['50px', '54px'],
        '6xl': ['62px', '66px'],
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
};
