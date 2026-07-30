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
