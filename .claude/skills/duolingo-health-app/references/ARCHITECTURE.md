# ARCHITECTURE — Decisões técnicas

> Objetivo: app **web, retrato, muito animado, offline-first, sem bug, rápido de construir e demonstrável por link**.

## Stack recomendada

| Camada | Escolha | Por quê |
|---|---|---|
| Build/SPA | **Vite + React + TypeScript** | Rápido, leve, deploy trivial, ótimo p/ PWA. |
| Estilo | **Tailwind CSS** | Velocidade, consistência, mobile-first natural. |
| Animação | **Framer Motion** | Transições, gestos, celebrações — coração do "feel" Duolingo. |
| Estado | **Zustand** | Simples, sem boilerplate, persistível. |
| Persistência | **Dexie.js (IndexedDB)** | Offline-first, robusto p/ histórico; sem servidor. |
| Som | **Howler.js** | Efeitos sonoros confiáveis cross-browser. |
| Haptics | **Vibration API** | Vibração curta no acerto/registro (quando suportado). |
| PWA | **vite-plugin-pwa** | Instalável, abre em tela cheia, cache offline. |
| Roteamento | **React Router** | Abas e fluxos. |
| Deploy | **Netlify** (D12) | Link público + Netlify Functions (v2) p/ o backend Plus. Evita a restrição de uso comercial do plano Hobby da Vercel. |

> A pesquisa de stack (workflow) pode ajustar detalhes; a base acima é a recomendação de trabalho.

## Princípios de arquitetura

- **Mobile retrato é a única referência de layout.** Container central com largura máx. (~480px), centralizado; em telas largas o app fica "emoldurado" como um celular, nunca esticado.
- **Offline-first:** tudo grava em IndexedDB; o app nunca depende de rede.
- **Sem PII / sem login:** dados ficam no aparelho. (Export/import e nuvem = fase futura.)
- **Feature por bloco:** cada registro é um módulo isolado; adicionar um novo registro não mexe nos outros.
- **Design tokens centralizados** (cores, raios, sombras, durações de animação) — para o `DESIGN-SYSTEM.md` plugar fácil quando o design chegar.

## Estrutura de pastas (planejada — ainda não criada)

```
super-saudavel/
├─ public/                 # ícones PWA, sons, manifest
├─ src/
│  ├─ app/                 # shell, rotas, providers
│  ├─ components/          # UI reutilizável (Botao, IconePicker, BottomNav, Mascote...)
│  ├─ features/
│  │  ├─ fezes/            # fluxo + tela + lógica de Bristol
│  │  ├─ alimentacao/
│  │  ├─ bem-estar/
│  │  ├─ urina/            # (bloco posterior)
│  │  ├─ dor/              # (bloco posterior)
│  │  └─ gatilhos/         # (bloco posterior)
│  ├─ gamification/        # streak, xp, conquistas, celebração
│  ├─ history/             # calendário/timeline
│  ├─ insights/            # estatísticas e correlações
│  ├─ data/                # Dexie (schema, repositórios)
│  ├─ store/               # Zustand stores
│  ├─ design/              # tokens, tema, ícones (SVG)
│  ├─ audio/               # mapeamento de sons (Howler)
│  └─ lib/                 # utils (datas, haptics, formatadores)
└─ docs/                   # estes documentos
```

## Navegação (Information Architecture)

Barra inferior com **poucas zonas** (regra: nunca lotar a tela):

- **Hoje** — estado do dia + mascote + ofensiva + botão grande de registrar.
- **Registrar** (botão central destacado) — abre o seletor de pilar (6 ícones grandes) → fluxo passo-a-passo.
- **Histórico** — calendário/linha do tempo dos registros.
- **Saúde** — insights, padrões e estatísticas (inclui correlação alimento→sintoma).
- **Perfil** — conquistas, ofensiva, ajustes.

Fluxo de registro = **icon-first, escolher → próximo**, uma decisão por tela, com botão "Próximo" grande. Nada de formulário cheio de campos.

## Orientação & PWA

- Forçar comportamento retrato via layout (container) + `manifest.orientation: portrait`.
- Tela cheia ao "Adicionar à tela inicial".
- Splash + ícone do app.

## Armadilhas de iOS/Safari (tratar por design, não "depois") — ver REFERENCES.md §5

- **iPhone não trava orientação:** `screen.orientation.lock()` só funciona no Android. No iOS, **lock por design**: layout em coluna centralizada + overlay "Gire para retrato" via `@media (orientation: landscape)`.
- **Vibration API não existe no Safari/iOS:** haptics é **enhancement progressivo** com feature-detection — o app funciona 100% sem vibração.
- **Persistência pode ser apagada** após ~7 dias de inatividade (WebKit) → oferecer **export/import** de dados e avisar o usuário. (Mitiga o risco do modelo local-only — ver D3.)
- **Sem prompt de instalação automático** → instruir "Adicionar à Tela de Início".
- **Safe-areas (notch):** `env(safe-area-inset-*)` + `viewport-fit=cover`.
- **Áudio:** destravar Howler no 1º toque do usuário (som antes de interação falha silenciosamente).

## Convenções de UI (da pesquisa)

- **Uma única família de ícones** em todo o app (Lucide / Phosphor / Heroicons, line ou duotone). **Nunca emojis.**
- **Um único acento de cor** (saturação < 80%). Animar só `transform`/`opacity`. Respeitar `prefers-reduced-motion`.
- Alvos de toque ≥ 44×44pt / 48dp; feedback visual < 100ms.
