import { DEFAULT_REMINDERS } from '@/domain/reminders';
import { DEFAULT_PROFILE, PROFILE_VERSION, useProfile } from '@/store/useProfile';

describe('useProfile — preferência de lembrete', () => {
  beforeEach(() => {
    useProfile.setState({
      profile: DEFAULT_PROFILE,
      goalOverride: null,
      onboardingDone: false,
      reminders: DEFAULT_REMINDERS,
    });
  });

  it('nasce desligado e com o intervalo padrão de 90 min', () => {
    expect(DEFAULT_REMINDERS).toEqual({ enabled: false, intervalMinutes: 90 });
  });

  it('guarda a preferência sem mexer no resto do perfil', () => {
    const antes = useProfile.getState().profile;
    useProfile.getState().setReminders({ intervalMinutes: 60 });

    expect(useProfile.getState().reminders).toEqual({ enabled: false, intervalMinutes: 60 });
    expect(useProfile.getState().profile).toBe(antes);
  });

  it('altera um campo por vez, sem zerar o outro', () => {
    useProfile.getState().setReminders({ intervalMinutes: 120 });
    useProfile.getState().setReminders({ enabled: true });

    expect(useProfile.getState().reminders).toEqual({ enabled: true, intervalMinutes: 120 });
  });
});

describe('migração do perfil', () => {
  it('v1 -> v2 acrescenta `reminders` sem perder peso, rotina nem meta', () => {
    // Estado de quem já usava o app antes de os lembretes existirem.
    const v1 = {
      profile: { ...DEFAULT_PROFILE, weightKg: 88, wakeMinutes: 360 },
      goalOverride: 3000,
      onboardingDone: true,
    };

    const migrar = useProfile.persist.getOptions().migrate!;
    const v2 = migrar(v1, 1) as ReturnType<typeof useProfile.getState>;

    expect(v2.reminders).toEqual(DEFAULT_REMINDERS);
    expect(v2.profile.weightKg).toBe(88);
    expect(v2.profile.wakeMinutes).toBe(360);
    expect(v2.goalOverride).toBe(3000);
    expect(v2.onboardingDone).toBe(true);
  });

  it('v2 -> v3 apaga `sex` e preserva o resto do perfil', () => {
    // Quem usou o app antes de 07/08/2026 tem `sex: 'na'` no disco.
    const v2 = {
      profile: {
        weightKg: 91,
        sex: 'na',
        activity: 'alta',
        climate: 'quente',
        wakeMinutes: 330,
        sleepMinutes: 1350,
        unit: 'ml',
      },
      goalOverride: 3400,
      onboardingDone: true,
      reminders: { enabled: true, intervalMinutes: 60 },
    };

    const migrar = useProfile.persist.getOptions().migrate!;
    const v3 = migrar(v2, 2) as ReturnType<typeof useProfile.getState>;

    expect('sex' in v3.profile).toBe(false);
    // Nada mais se mexe: perder peso ou rotina numa migração é perder o app da pessoa.
    expect(v3.profile.weightKg).toBe(91);
    expect(v3.profile.activity).toBe('alta');
    expect(v3.profile.climate).toBe('quente');
    expect(v3.profile.wakeMinutes).toBe(330);
    expect(v3.profile.sleepMinutes).toBe(1350);
    expect(v3.goalOverride).toBe(3400);
    expect(v3.onboardingDone).toBe(true);
    expect(v3.reminders).toEqual({ enabled: true, intervalMinutes: 60 });
  });

  it('v1 -> v3 num salto: ganha `reminders` e perde `sex` de uma vez', () => {
    const v1 = {
      profile: { weightKg: 70, sex: 'm', activity: 'baixa', climate: 'temperado',
        wakeMinutes: 420, sleepMinutes: 1380, unit: 'ml' },
      goalOverride: null,
      onboardingDone: true,
    };

    const migrar = useProfile.persist.getOptions().migrate!;
    const v3 = migrar(v1, 1) as ReturnType<typeof useProfile.getState>;

    expect(v3.reminders).toEqual(DEFAULT_REMINDERS);
    expect('sex' in v3.profile).toBe(false);
    expect(v3.profile.weightKg).toBe(70);
  });

  it('não mexe em quem já está na versão corrente', () => {
    const atual = {
      profile: DEFAULT_PROFILE,
      goalOverride: null,
      onboardingDone: true,
      reminders: { enabled: true, intervalMinutes: 60 },
    };

    const migrar = useProfile.persist.getOptions().migrate!;
    const saida = migrar(atual, PROFILE_VERSION) as ReturnType<typeof useProfile.getState>;

    expect(saida.reminders).toEqual({ enabled: true, intervalMinutes: 60 });
  });
});
