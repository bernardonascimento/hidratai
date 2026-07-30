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
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
};
