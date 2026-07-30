import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useSettings } from '@/store/useSettings';

// Haptics é enhancement progressivo: no web (e onde a API não existe) o app
// funciona 100% sem vibração. Nunca deixamos uma falha de haptics estourar.
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Respeita o interruptor de Ajustes (§5.6). */
function enabled(): boolean {
  return supported && useSettings.getState().hapticsEnabled;
}

export function tapFeedback() {
  if (!enabled()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function registerFeedback() {
  if (!enabled()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function successFeedback() {
  if (!enabled()) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
