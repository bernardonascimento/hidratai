// Roda antes de cada suíte. Só mocks de módulo nativo: nada de lógica do app.

// Sem isto, qualquer teste que importe uma store estoura com "NativeModule:
// AsyncStorage is null" — o `persist` do Zustand toca o módulo nativo no import,
// não na primeira escrita. O mock oficial guarda em memória e zera entre suítes.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
